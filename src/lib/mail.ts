import "server-only";

import { env } from "./env";

/**
 * Outbound mail.
 *
 * Sends through Resend when RESEND_API_KEY is configured. Without it, the
 * message is written to the server log with the link spelled out, so the whole
 * verification and reset flow is exercisable in development without an account
 * anywhere. Delivery never blocks the action that triggered it: a bounced
 * provider must not stop an employee being created.
 */
export type Mail = {
  to: string;
  subject: string;
  heading: string;
  lines: string[];
  actionLabel?: string;
  actionUrl?: string;
  footer?: string;
};

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function render(mail: Mail) {
  const body = mail.lines.map((line) => `<p style="margin:0 0 14px;">${escape(line)}</p>`).join("");

  const button =
    mail.actionUrl && mail.actionLabel
      ? `<p style="margin:26px 0;">
           <a href="${mail.actionUrl}" style="background:#7a3e6e;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:6px;display:inline-block;font-weight:600;">${escape(mail.actionLabel)}</a>
         </p>
         <p style="margin:0 0 14px;color:#756c73;font-size:13px;">Or paste this into your browser:<br><span style="word-break:break-all;">${escape(mail.actionUrl)}</span></p>`
      : "";

  return `<!doctype html>
<html><body style="margin:0;background:#f6f5f7;padding:32px 16px;font-family:'IBM Plex Sans',-apple-system,Segoe UI,sans-serif;color:#241e23;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4dfe3;border-radius:10px;padding:32px;">
    <p style="margin:0 0 24px;font-size:22px;color:#5f2f56;font-family:Georgia,serif;">Dayflow</p>
    <h1 style="margin:0 0 16px;font-size:18px;">${escape(mail.heading)}</h1>
    ${body}
    ${button}
    ${mail.footer ? `<p style="margin:24px 0 0;padding-top:18px;border-top:1px solid #e4dfe3;color:#756c73;font-size:12px;">${escape(mail.footer)}</p>` : ""}
  </div>
</body></html>`;
}

function logToConsole(mail: Mail) {
  const rule = "─".repeat(72);
  console.info(
    [
      "",
      rule,
      "  EMAIL (not sent — RESEND_API_KEY is not configured)",
      `  To:      ${mail.to}`,
      `  Subject: ${mail.subject}`,
      "",
      ...mail.lines.map((line) => `  ${line}`),
      ...(mail.actionUrl ? ["", `  ${mail.actionLabel ?? "Link"}: ${mail.actionUrl}`] : []),
      rule,
      "",
    ].join("\n"),
  );
}

export async function sendMail(mail: Mail) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    logToConsole(mail);
    return { delivered: false as const, reason: "no-provider" as const };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Connection: "close",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? "Dayflow <onboarding@resend.dev>",
        to: [mail.to],
        subject: mail.subject,
        html: render(mail),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Mail delivery failed:", response.status, errText);
      logToConsole(mail);
      return { delivered: false as const, reason: "provider-error" as const };
    }

    return { delivered: true as const, reason: null };
  } catch (error) {
    console.error("Mail network socket reset (ECONNRESET): Falling back to console log.");
    logToConsole(mail);
    return { delivered: false as const, reason: "provider-error" as const };
  }
}

export const appUrl = (path: string) => new URL(path, env.APP_URL).toString();
