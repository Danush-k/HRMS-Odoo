import fs from "fs/promises";
import path from "path";
import { del, put } from "@vercel/blob";

export const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type SaveFileResult = {
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  name: string;
};

/**
 * Checks if Vercel Blob storage is configured via BLOB_READ_WRITE_TOKEN.
 */
function isVercelBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Universal file upload handler.
 * - In production with Vercel Blob token: uploads directly to @vercel/blob.
 * - In local development: writes file to `public/uploads/${folder}/`.
 */
export async function saveUploadedFile(file: File, folder = "documents"): Promise<SaveFileResult> {
  if (!file || typeof file === "string" || !(file instanceof Blob)) {
    throw new Error("No file was uploaded.");
  }

  const mime = file.type?.toLowerCase();
  if (!mime || (!ALLOWED_MIME_TYPES.includes(mime) && !mime.startsWith("image/"))) {
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
  const safeName = (file.name || "document").replace(/[^a-zA-Z0-9.-]/g, "_").slice(-100);
  const fileName = `${timestamp}_${safeName}`;

  if (isVercelBlobConfigured()) {
    // Vercel Blob Storage mode
    const blobPath = `${folder}/${fileName}`;
    const blob = await put(blobPath, file, { access: "public" });

    return {
      fileUrl: blob.url,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      name: file.name || safeName,
    };
  }

  // Local filesystem mode: store under public/uploads/<folder>/
  const sanitizedFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "");
  const uploadDir = path.join(process.cwd(), "public", "uploads", sanitizedFolder);
  await fs.mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return {
    fileUrl: `/uploads/${sanitizedFolder}/${fileName}`,
    fileSize: file.size,
    mimeType: file.type || "application/octet-stream",
    name: file.name || safeName,
  };
}

/**
 * Universal file deletion handler.
 * - If the fileUrl is a Vercel Blob URL: deletes via @vercel/blob del().
 * - If the fileUrl is a local /uploads/ path: unlinks from local filesystem.
 */
export async function deleteStoredFile(fileUrl: string): Promise<void> {
  if (!fileUrl || typeof fileUrl !== "string" || fileUrl.startsWith("data:")) {
    return;
  }

  try {
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      if (isVercelBlobConfigured()) {
        await del(fileUrl);
      }
    } else if (fileUrl.startsWith("/uploads/")) {
      const relativePath = fileUrl.replace(/^\/uploads\//, "");
      const fullPath = path.join(process.cwd(), "public", "uploads", relativePath);
      await fs.unlink(fullPath).catch(() => {});
    }
  } catch (err) {
    console.error("Failed to delete stored file:", err);
  }
}
