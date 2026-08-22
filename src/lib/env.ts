import { z } from "zod";

/**
 * Environment contract.
 *
 * Parsed once, at import. `next.config.ts` imports this module so a missing or
 * malformed variable fails the build and the dev server on startup, rather than
 * surfacing as a 500 on whichever request happens to need it first.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 32")
    .refine(
      (value) => value !== "replace-this-with-a-32-byte-random-string",
      "SESSION_SECRET is still the placeholder from .env.example. Generate a real one with: openssl rand -base64 32",
    ),

  STANDARD_WORK_HOURS: z.coerce
    .number()
    .positive("STANDARD_WORK_HOURS must be a positive number")
    .max(24, "STANDARD_WORK_HOURS cannot exceed 24")
    .default(8),

  APP_URL: z.string().url("APP_URL must be a full URL, for example http://localhost:3000").default("http://localhost:3000"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  APP_ENV: z.string().optional().default("test"),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof schema>;

function parse(): Env {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    const lines = result.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(
      [
        "",
        "Dayflow cannot start: the environment is not configured correctly.",
        ...lines,
        "",
        "Copy .env.example to .env and fill in the values, or run ./run.sh setup.",
        "",
      ].join("\n"),
    );
  }

  return result.data;
}

export const env = parse();
