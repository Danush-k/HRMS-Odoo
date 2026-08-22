"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Field, FormMessage, Input, Select, SubmitButton } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { formatDate } from "@/lib/dates";
import { deleteDocumentAction, uploadDocumentAction } from "@/server/actions/documents";

export interface DocumentItem {
  id: string;
  name: string;
  type: string;
  fileData: string;
  fileType: string;
  fileSize: number;
  uploadedBy?: string;
  createdAt: Date;
}

const DOCUMENT_TYPES = [
  "Employment",
  "Identity",
  "Contract",
  "Personal",
  "Educational",
  "Medical",
  "Other",
];

const MAX_BYTES = 5_000_000; // 5MB

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function typeChipClass(type: string) {
  switch (type.toLowerCase()) {
    case "identity":
      return "bg-brand-50 text-brand-700 border-brand-200";
    case "employment":
      return "bg-present-soft text-present border-emerald-200";
    case "contract":
      return "bg-leave-soft text-leave border-sky-200";
    case "personal":
      return "bg-purple-50 text-purple-700 border-purple-200";
    default:
      return "bg-ink-100 text-ink-700 border-ink-200";
  }
}

export function DocumentsSection({
  employeeId,
  isSelf,
  canUpload = true,
  canDelete = true,
  documents,
}: {
  employeeId: string;
  isSelf: boolean;
  canUpload?: boolean;
  canDelete?: boolean;
  documents: DocumentItem[];
}) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDelete] = useTransition();

  const [state, formAction] = useActionState(async (prev: any, formData: FormData) => {
    const res = await uploadDocumentAction(prev, formData);
    if (res.ok) {
      setUploadModalOpen(false);
    }
    return res;
  }, idle);

  // File upload state for form display
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | undefined) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type.toLowerCase()) && !file.type.startsWith("image/")) {
      setFileError("Please select a PDF, PNG, or JPG file.");
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_BYTES) {
      setFileError("File exceeds 5 MB limit. Please select a smaller file.");
      setSelectedFile(null);
      return;
    }

    setFileError(null);
    setSelectedFile(file);
  };

  const handleDelete = (docId: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      setDeletingId(docId);
      startDelete(async () => {
        await deleteDocumentAction(docId);
        setDeletingId(null);
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink-900">
            {isSelf ? "My Documents" : "Documents"}
          </h2>
          <p className="text-xs text-ink-500">
            {isSelf
              ? "Manage your official documentation, contracts, and identity proofs."
              : "Employee official documentation, contracts, and identity proofs."}
          </p>
        </div>

        {canUpload && (
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setFileError(null);
              setUploadModalOpen(true);
            }}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Content Table or Empty State */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-canvas/30 p-10 text-center">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-ink-900">
            {isSelf ? "No documents available" : "No documents uploaded for this employee."}
          </p>
          <p className="mt-1 max-w-sm text-xs text-ink-500">
            {isSelf
              ? "Upload your documents here."
              : "Upload employment contracts, offer letters, or identity documents."}
          </p>

          {canUpload && (
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setFileError(null);
                setUploadModalOpen(true);
              }}
              className="btn-secondary btn-sm mt-4 flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Upload Document</span>
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-2xs">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas/40 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                <th className="px-5 py-3">Document Name</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Uploaded</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {documents.map((doc) => {
                const isPdf =
                  doc.fileType === "application/pdf" ||
                  doc.name.toLowerCase().endsWith(".pdf") ||
                  doc.fileData.includes(".pdf") ||
                  doc.fileData.startsWith("data:application/pdf");

                return (
                  <tr key={doc.id} className="transition-colors hover:bg-canvas/30">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${isPdf ? "bg-danger-soft text-danger" : "bg-brand-50 text-brand-700"}`}>
                          {isPdf ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="9" y1="15" x2="15" y2="15" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          )}
                        </span>
                        <div>
                          <p className="font-semibold text-ink-900">{doc.name}</p>
                          <p className="text-[11px] text-ink-400">
                            {formatBytes(doc.fileSize)} · {isPdf ? "PDF Document" : "Image"}
                            {doc.uploadedBy && doc.uploadedBy !== "EMPLOYEE" ? ` · HR` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${typeChipClass(doc.type)}`}>
                        {doc.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-ink-600">
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingDoc(doc)}
                          className="btn-secondary btn-xs font-semibold"
                        >
                          View
                        </button>

                        {canDelete && (
                          <button
                            type="button"
                            disabled={deletingId === doc.id}
                            onClick={() => handleDelete(doc.id)}
                            className="btn-ghost btn-xs text-danger hover:bg-danger-soft hover:text-danger"
                            title="Delete document"
                          >
                            {deletingId === doc.id ? (
                              "…"
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Document Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-xs transition-opacity" onClick={() => setUploadModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="text-base font-semibold text-ink-900">Upload Document</h3>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form action={formAction} className="flex flex-col gap-4 p-5">
              <FormMessage state={state} />

              <input type="hidden" name="employeeId" value={employeeId} />

              <Field label="Document Name" name="name" error={state.errors?.name} required>
                <Input name="name" placeholder="e.g. Offer Letter, Passport, Resume" required />
              </Field>

              <Field label="Document Type" name="type" required>
                <Select name="type" defaultValue="Identity">
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="flex flex-col gap-1.5">
                <label className="label">
                  Select File <span className="ml-1 text-danger">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  name="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary btn-sm"
                  >
                    Choose File
                  </button>
                  <span className="truncate text-xs text-ink-600">
                    {selectedFile ? `${selectedFile.name} (${formatBytes(selectedFile.size)})` : "No file chosen"}
                  </span>
                </div>
                {fileError ? (
                  <p className="error-text text-xs">{fileError}</p>
                ) : (
                  <p className="hint text-[11px]">PDF, PNG, or JPG up to 5 MB.</p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-end gap-2.5 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <SubmitButton pendingLabel="Uploading…" className="btn-primary btn-sm">
                  Upload
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document View Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-xs" onClick={() => setViewingDoc(null)} />
          <div className="relative z-10 flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${typeChipClass(viewingDoc.type)}`}>
                  {viewingDoc.type}
                </span>
                <h3 className="font-semibold text-ink-900">{viewingDoc.name}</h3>
                <span className="text-xs text-ink-400">({formatBytes(viewingDoc.fileSize)})</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingDoc.fileData}
                  download={viewingDoc.name}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary btn-xs flex items-center gap-1"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Document Viewer Area */}
            <div className="flex-1 overflow-auto bg-canvas/60 p-4">
              {viewingDoc.fileType === "application/pdf" ||
              viewingDoc.fileData.startsWith("data:application/pdf") ||
              viewingDoc.fileData.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={viewingDoc.fileData}
                  title={viewingDoc.name}
                  className="h-full w-full rounded-lg border border-line bg-white"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={viewingDoc.fileData}
                    alt={viewingDoc.name}
                    className="max-h-full max-w-full rounded-lg object-contain shadow-sm"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
