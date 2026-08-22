import fs from "fs/promises";
import path from "path";

/** L9 — sick-leave certificates are stored on disk, never as base64 in the database. */

export const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "application/pdf"];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type SaveFileResult = {
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  name: string;
};

export async function saveUploadedFile(file: File): Promise<SaveFileResult> {
  if (!file || typeof file === "string") {
    throw new Error("No file was uploaded.");
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Only PNG, JPEG, and PDF files are allowed.");
  }

  if (file.size <= 0) {
    throw new Error("The uploaded file is empty.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File size exceeds 5 MB limit.");
  }

  // Generate a unique, filesystem-safe filename.
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(-100);
  const fileName = `${timestamp}_${safeName}`;

  // Local storage directory under public/uploads/certificates.
  const uploadDir = path.join(process.cwd(), "public", "uploads", "certificates");
  await fs.mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return {
    fileUrl: `/uploads/certificates/${fileName}`,
    fileSize: file.size,
    mimeType: file.type,
    name: file.name,
  };
}
