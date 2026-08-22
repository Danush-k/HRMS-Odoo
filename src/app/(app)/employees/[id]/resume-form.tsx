"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import { Field, FormMessage, SubmitButton, Textarea } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { updateProfileAction } from "@/server/actions/employees";
import { parseResumeAction } from "@/server/actions/resume";

export function ResumeForm({
  employeeId,
  canEdit,
  values,
}: {
  employeeId: string;
  canEdit: boolean;
  values: { about: string; loveAboutJob: string; interests: string; skills: string; certifications: string };
}) {
  const [state, action] = useActionState(updateProfileAction, idle);
  const [isParsing, startParsing] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);

  // Controlled form state
  const [formData, setFormData] = useState({
    about: values.about || "",
    loveAboutJob: values.loveAboutJob || "",
    interests: values.interests || "",
    skills: values.skills || "",
    certifications: values.certifications || "",
  });

  // Sync state if initial values change from props
  useEffect(() => {
    setFormData({
      about: values.about || "",
      loveAboutJob: values.loveAboutJob || "",
      interests: values.interests || "",
      skills: values.skills || "",
      certifications: values.certifications || "",
    });
  }, [values]);

  // Exit edit mode on successful save
  useEffect(() => {
    if (state.ok) {
      setIsEditing(false);
    }
  }, [state]);

  const [parseStatus, setParseStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleCancel = () => {
    setFormData({
      about: values.about || "",
      loveAboutJob: values.loveAboutJob || "",
      interests: values.interests || "",
      skills: values.skills || "",
      certifications: values.certifications || "",
    });
    setParseStatus(null);
    setIsEditing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseStatus(null);
    const uploadData = new FormData();
    uploadData.append("resume", file);

    startParsing(async () => {
      const res = await parseResumeAction(uploadData);
      if (res.ok) {
        setFormData((prev) => ({
          about: res.data.about || prev.about,
          loveAboutJob: res.data.loveAboutJob || prev.loveAboutJob,
          interests: res.data.interests || prev.interests,
          skills: res.data.skills || prev.skills,
          certifications: res.data.certifications || prev.certifications,
        }));
        setParseStatus({
          type: "success",
          message: `Successfully extracted resume details from "${res.fileName}". Review and adjust the details below, then click "Save".`,
        });
      } else {
        setParseStatus({
          type: "error",
          message: res.error || "Could not parse the selected file.",
        });
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  const skillsList = formData.skills
    ? formData.skills.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
    : [];

  const certsList = formData.certifications
    ? formData.certifications.split(/[\n,]+/).map((c) => c.trim()).filter(Boolean)
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Section Header with Read-Only vs Edit Toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-line/70">
        <div>
          <h2 className="text-base font-bold text-ink-900">Resume & Bio</h2>
          <p className="text-xs text-ink-500">Summary, workplace passion, skills, and certifications.</p>
        </div>

        {canEdit ? (
          <div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-ink-50 active:scale-95 transition"
                >
                  Cancel
                </button>
                <SubmitButton
                  form="resume-form"
                  pendingLabel="Saving…"
                  className="btn-primary text-xs px-3.5 py-1.5 shadow-xs active:scale-95 transition"
                >
                  Save
                </SubmitButton>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 active:scale-95 transition"
              >
                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Edit
              </button>
            )}
          </div>
        ) : null}
      </div>

      <FormMessage state={state} />

      {/* Read-Only Mode */}
      {!isEditing ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card flex flex-col gap-6 p-5 sm:p-6 shadow-xs">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">About</h3>
              <p className="mt-2 text-sm text-ink-800 leading-relaxed whitespace-pre-line">
                {formData.about || <span className="text-ink-400 italic">No summary provided.</span>}
              </p>
            </div>

            <div className="border-t border-line/60 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">What I love about my job</h3>
              <p className="mt-2 text-sm text-ink-800 leading-relaxed whitespace-pre-line">
                {formData.loveAboutJob || <span className="text-ink-400 italic">Not specified.</span>}
              </p>
            </div>

            <div className="border-t border-line/60 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">Interests & Hobbies</h3>
              <p className="mt-2 text-sm text-ink-800 leading-relaxed whitespace-pre-line">
                {formData.interests || <span className="text-ink-400 italic">Not specified.</span>}
              </p>
            </div>
          </div>

          <div className="card flex flex-col gap-6 p-5 sm:p-6 shadow-xs">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">Skills</h3>
              {skillsList.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {skillsList.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-lg border border-brand-200/80 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 shadow-3xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink-400 italic">No skills listed.</p>
              )}
            </div>

            <div className="border-t border-line/60 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">Certifications</h3>
              {certsList.length > 0 ? (
                <div className="mt-3 flex flex-col gap-2">
                  {certsList.map((cert, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 rounded-lg border border-line bg-canvas/40 px-3 py-2 text-xs font-medium text-ink-800 shadow-3xs"
                    >
                      <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" className="text-present shrink-0">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                      <span>{cert}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink-400 italic">No certifications listed.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <div className="flex flex-col gap-6">
          {/* Resume Auto-Fill Upload Card */}
          <div className="relative overflow-hidden rounded-xl border border-brand-200/80 bg-gradient-to-br from-brand-50/60 via-surface to-brand-50/30 p-5 shadow-xs transition-all hover:border-brand-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-100/80 text-brand-700 shadow-2xs">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink-900">Auto-fill with Resume (PDF / DOCX / TXT)</h3>
                  <p className="mt-0.5 text-xs text-ink-600">
                    Upload a resume document to automatically extract and populate your Summary, Skills, Certifications, and Interests.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.rtf"
                  className="sr-only"
                  id="resume-autofill-input"
                  onChange={handleFileUpload}
                  disabled={isParsing}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsing}
                  className="btn-primary inline-flex items-center gap-2 text-xs font-semibold shadow-xs transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {isParsing ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Parsing Resume…</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span>Upload Resume</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status Message */}
            {parseStatus && (
              <div
                className={`mt-3.5 flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-xs font-medium ${
                  parseStatus.type === "success"
                    ? "border border-present/30 bg-present-soft text-present"
                    : "border border-danger/30 bg-danger-soft text-danger"
                }`}
              >
                {parseStatus.type === "success" ? (
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" className="shrink-0">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" className="shrink-0">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                )}
                <span>{parseStatus.message}</span>
              </div>
            )}
          </div>

          <form id="resume-form" action={action} className="flex flex-col gap-5">
            <input type="hidden" name="employeeId" value={employeeId} />

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="card flex flex-col gap-4 p-5">
                <Field label="About" name="about">
                  <Textarea
                    name="about"
                    rows={4}
                    value={formData.about}
                    onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                    placeholder="A short introduction."
                  />
                </Field>
                <Field label="What I love about my job" name="loveAboutJob">
                  <Textarea
                    name="loveAboutJob"
                    rows={3}
                    value={formData.loveAboutJob}
                    onChange={(e) => setFormData({ ...formData, loveAboutJob: e.target.value })}
                    placeholder="Solving real problems and building impactful software."
                  />
                </Field>
                <Field label="My interests and hobbies" name="interests">
                  <Textarea
                    name="interests"
                    rows={3}
                    value={formData.interests}
                    onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                    placeholder="Cricket, open source, reading."
                  />
                </Field>
              </div>

              <div className="card flex flex-col gap-4 p-5">
                <Field label="Skills" name="skills" hint="One per line, or separated by commas.">
                  <Textarea
                    name="skills"
                    rows={6}
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    placeholder="Python&#10;Odoo&#10;PostgreSQL"
                  />
                </Field>
                <Field label="Certifications" name="certifications" hint="One per line.">
                  <Textarea
                    name="certifications"
                    rows={5}
                    value={formData.certifications}
                    onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                    placeholder="Odoo Functional Certification"
                  />
                </Field>
              </div>
            </div>

          </form>
        </div>
      )}
    </div>
  );
}
