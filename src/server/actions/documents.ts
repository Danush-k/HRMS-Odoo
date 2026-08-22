"use server";

import { revalidatePath } from "next/cache";
import { type ActionState, failure, success } from "@/lib/action-state";
import { canDeleteDocument, canUploadDocuments, isManager, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_DOCUMENT_BYTES = 5_000_000; // 5 MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

const read = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function uploadDocumentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireUser();

  // If actor is not a manager, strictly bind targetId to actor.id.
  // Non-managers CANNOT specify or override employeeId.
  const targetId = isManager(actor.role)
    ? (read(form, "employeeId") || actor.id)
    : actor.id;

  const name = read(form, "name");
  const type = read(form, "type") || "Other";
  const fileData = read(form, "fileData");
  const fileType = read(form, "fileType");
  const fileSizeStr = read(form, "fileSize");
  const fileSize = parseInt(fileSizeStr, 10) || 0;

  if (!name) return failure("Please provide a document name.", { name: "Document name is required" });
  if (!fileData) return failure("Please select a file to upload.", { file: "File is required" });

  // Verify employee belongs to same company
  const target = await db.employee.findFirst({
    where: { id: targetId, companyId: actor.companyId },
  });

  if (!target) return failure("Employee not found.");

  if (!canUploadDocuments(actor, targetId)) {
    return failure("You are not authorized to upload documents for this employee.");
  }

  // Validation
  if (fileSize > MAX_DOCUMENT_BYTES) {
    return failure("File is too large. Maximum size is 5 MB.");
  }

  if (fileType && !ALLOWED_MIME_TYPES.includes(fileType.toLowerCase())) {
    return failure("Unsupported file type. Please upload a PDF, PNG, or JPG file.");
  }

  const uploadedBy = actor.role === "EMPLOYEE" ? "EMPLOYEE" : actor.role;

  await db.document.create({
    data: {
      employeeId: targetId,
      name,
      category: type,
      fileUrl: fileData,
      mimeType: fileType || "application/octet-stream",
      fileSize: fileSize || 0,
      uploadedBy,
    },
  });

  revalidatePath(`/employees/${targetId}`);
  return success("Document uploaded successfully.");
}

export async function deleteDocumentAction(documentId: string): Promise<ActionState> {
  const actor = await requireUser();

  const doc = await db.document.findUnique({
    where: { id: documentId },
    include: { employee: true },
  });

  if (!doc || doc.employee.companyId !== actor.companyId) {
    return failure("Document not found.");
  }

  if (!canDeleteDocument(actor, doc.employeeId)) {
    return failure("You are not authorized to delete this document.");
  }

  await db.document.delete({
    where: { id: documentId },
  });

  revalidatePath(`/employees/${doc.employeeId}`);
  return success("Document deleted successfully.");
}
