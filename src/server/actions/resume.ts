"use server";

import { requireUser } from "@/lib/auth";
import { extractTextFromBuffer, parseResumeText, type ParsedResumeData } from "@/lib/resume-parser";

export type ParseResumeResult =
  | { ok: true; data: ParsedResumeData; fileName: string }
  | { ok: false; error: string };

export async function parseResumeAction(formData: FormData): Promise<ParseResumeResult> {
  try {
    await requireUser();

    const file = formData.get("resume") as File | null;
    if (!file || typeof file === "string" || file.size === 0) {
      return { ok: false, error: "Please select a valid resume file (PDF or text)." };
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { ok: false, error: "File size exceeds 10MB limit." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const rawText = await extractTextFromBuffer(buffer, file.name);
    if (!rawText || rawText.trim().length < 10) {
      return {
        ok: false,
        error: "Could not extract text from this document. Please ensure it contains readable text.",
      };
    }

    const parsedData = parseResumeText(rawText);
    return {
      ok: true,
      data: parsedData,
      fileName: file.name,
    };
  } catch (err: any) {
    console.error("parseResumeAction error:", err);
    return { ok: false, error: err.message || "Failed to process resume file." };
  }
}
