"use server";

import { revalidatePath } from "next/cache";
import { type ActionState, failure, success } from "@/lib/action-state";
import { canDeleteDocument, canUploadDocuments, isManager, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteStoredFile, saveUploadedFile } from "@/lib/storage";

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
  const file = form.get("file");

  if (!name) return failure("Please provide a document name.", { name: "Document name is required" });
  if (!file || typeof file === "string" || !(file instanceof Blob) || file.size === 0) {
    return failure("Please select a file to upload.", { file: "File is required" });
  }

  // Verify employee belongs to same company
  const target = await db.employee.findFirst({
    where: { id: targetId, companyId: actor.companyId },
  });

  if (!target) return failure("Employee not found.");

  if (!canUploadDocuments(actor, targetId)) {
    return failure("You are not authorized to upload documents for this employee.");
  }

  let saved;
  try {
    saved = await saveUploadedFile(file as File, "documents");
  } catch (err: any) {
    return failure(err.message || "Failed to process the uploaded file.");
  }

  const uploadedBy = actor.role === "EMPLOYEE" ? "EMPLOYEE" : actor.role;

  await db.document.create({
    data: {
      employeeId: targetId,
      name,
      category: type,
      fileUrl: saved.fileUrl,
      mimeType: saved.mimeType,
      fileSize: saved.fileSize,
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

  // Clean up stored file (either from Vercel Blob or local disk)
  await deleteStoredFile(doc.fileUrl);

  revalidatePath(`/employees/${doc.employeeId}`);
  return success("Document deleted successfully.");
}
