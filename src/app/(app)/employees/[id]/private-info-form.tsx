"use client";

import { useActionState, useEffect, useState } from "react";

import { Field, FormMessage, Input, Select, SubmitButton } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { updateProfileAction } from "@/server/actions/employees";

export type PrivateValues = {
  dateOfBirth: string;
  residingAddress: string;
  nationality: string;
  personalEmail: string;
  gender: string;
  maritalStatus: string;
  dateOfJoining: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  panNo: string;
  uanNo: string;
  empCode: string;
};

export function PrivateInfoForm({
  employeeId,
  values,
  canEdit,
  isManager,
}: {
  employeeId: string;
  values: PrivateValues;
  canEdit: boolean;
  isManager: boolean;
}) {
  const [state, action] = useActionState(updateProfileAction, idle);
  const [isEditing, setIsEditing] = useState(false);

  // Controlled form state for cancel restoration
  const [formData, setFormData] = useState<PrivateValues>(values);

  useEffect(() => {
    setFormData(values);
  }, [values]);

  useEffect(() => {
    if (state.ok) {
      setIsEditing(false);
    }
  }, [state]);

  const handleCancel = () => {
    setFormData(values);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Section Header with Read-Only vs Edit Toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-line/70">
        <div>
          <h2 className="text-base font-bold text-ink-900">Private & Bank Information</h2>
          <p className="text-xs text-ink-500">Confidential personal details, tax identifiers, and bank account info.</p>
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
                  form="private-info-form"
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

      {!isEditing ? (
        /* Read-Only Mode */
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Personal Information */}
          <div className="card flex flex-col gap-5 p-5 sm:p-6 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500 border-b border-line/60 pb-2">
              Personal Information
            </h3>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <div>
                <dt className="text-xs font-medium text-ink-500">Date of Birth</dt>
                <dd className="font-semibold text-ink-900 mt-0.5">{formData.dateOfBirth || "—"}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-ink-500">Gender</dt>
                <dd className="font-semibold text-ink-900 mt-0.5">{formData.gender || "—"}</dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-ink-500">Residing Address</dt>
                <dd className="font-semibold text-ink-900 mt-0.5">{formData.residingAddress || "—"}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-ink-500">Nationality</dt>
                <dd className="font-semibold text-ink-900 mt-0.5">{formData.nationality || "—"}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-ink-500">Marital Status</dt>
                <dd className="font-semibold text-ink-900 mt-0.5">{formData.maritalStatus || "—"}</dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-ink-500">Personal Email</dt>
                <dd className="font-semibold text-ink-900 mt-0.5">{formData.personalEmail || "—"}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-ink-500">Official Date of Joining</dt>
                <dd className="font-semibold text-ink-900 mt-0.5">{formData.dateOfJoining || "—"}</dd>
              </div>
            </dl>
          </div>

          {/* Bank & Statutory Details */}
          <div className="card flex flex-col gap-5 p-5 sm:p-6 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500 border-b border-line/60 pb-2">
              Bank & Statutory Details
            </h3>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-ink-500">Account Number</dt>
                <dd className="font-semibold text-ink-900 mono mt-0.5">{formData.accountNumber || "—"}</dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-ink-500">Bank Name</dt>
                <dd className="font-semibold text-ink-900 mt-0.5">{formData.bankName || "—"}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-ink-500">IFSC Code</dt>
                <dd className="font-semibold text-ink-900 mono uppercase mt-0.5">{formData.ifscCode || "—"}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-ink-500">PAN Number</dt>
                <dd className="font-semibold text-ink-900 mono uppercase mt-0.5">{formData.panNo || "—"}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-ink-500">UAN Number</dt>
                <dd className="font-semibold text-ink-900 mono mt-0.5">{formData.uanNo || "—"}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-ink-500">Employee Code</dt>
                <dd className="font-semibold text-ink-900 mono mt-0.5">{formData.empCode || "—"}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <form id="private-info-form" action={action} className="flex flex-col gap-5">
          <input type="hidden" name="employeeId" value={employeeId} />

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card flex flex-col gap-4 p-5">
              <p className="section-title">Personal</p>

              <Field label="Date of Birth" name="dateOfBirth" error={state.errors?.dateOfBirth}>
                <Input
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  disabled={!isManager}
                />
              </Field>

              <Field label="Residing Address" name="residingAddress" error={state.errors?.residingAddress}>
                <Input
                  name="residingAddress"
                  value={formData.residingAddress}
                  onChange={(e) => setFormData({ ...formData, residingAddress: e.target.value })}
                  disabled={!canEdit}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nationality" name="nationality">
                  <Input
                    name="nationality"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    disabled={!isManager}
                  />
                </Field>
                <Field label="Gender" name="gender">
                  <Select
                    name="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    disabled={!isManager}
                  >
                    <option value="">Not specified</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </Select>
                </Field>
              </div>

              <Field label="Personal Email" name="personalEmail" error={state.errors?.personalEmail}>
                <Input
                  name="personalEmail"
                  type="email"
                  value={formData.personalEmail}
                  onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                  disabled={!canEdit}
                  error={state.errors?.personalEmail}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Marital Status" name="maritalStatus">
                  <Select
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                    disabled={!isManager}
                  >
                    <option value="">Not specified</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Other">Other</option>
                  </Select>
                </Field>
                <Field label="Date of Joining" name="dateOfJoining" error={state.errors?.dateOfJoining}>
                  <Input name="dateOfJoining" type="date" value={formData.dateOfJoining} disabled={true} />
                </Field>
              </div>
            </div>

            <div className="card flex flex-col gap-4 p-5">
              <p className="section-title">Bank Details</p>

              <Field label="Account Number" name="accountNumber">
                <Input
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  disabled={!isManager}
                  className="field mono"
                />
              </Field>
              <Field label="Bank Name" name="bankName">
                <Input
                  name="bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  disabled={!isManager}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="IFSC Code" name="ifscCode">
                  <Input
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                    disabled={!isManager}
                    className="field mono uppercase"
                  />
                </Field>
                <Field label="PAN No" name="panNo">
                  <Input
                    name="panNo"
                    value={formData.panNo}
                    onChange={(e) => setFormData({ ...formData, panNo: e.target.value })}
                    disabled={!isManager}
                    className="field mono uppercase"
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="UAN No" name="uanNo">
                  <Input
                    name="uanNo"
                    value={formData.uanNo}
                    onChange={(e) => setFormData({ ...formData, uanNo: e.target.value })}
                    disabled={!isManager}
                    className="field mono"
                  />
                </Field>
                <Field label="Emp Code" name="empCode">
                  <Input name="empCode" value={formData.empCode} disabled={true} className="field mono" />
                </Field>
              </div>
            </div>
          </div>

          {!isManager ? (
            <p className="hint text-xs mt-2">Address and personal email are yours to change. HR maintains the rest.</p>
          ) : null}
        </form>
      )}
    </div>
  );
}
