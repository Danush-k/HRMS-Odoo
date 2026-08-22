"use client";

import { useActionState, useEffect, useState } from "react";

import { ImageField } from "@/components/image-field";
import { Avatar, Field, FormMessage, Input, Select, SubmitButton } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { ROLES, ROLE_LABEL } from "@/lib/constants";
import { updateProfileAction } from "@/server/actions/employees";

export type DetailsValues = {
  id: string;
  firstName: string;
  lastName: string;
  jobPosition: string;
  loginId: string;
  email: string;
  mobile: string;
  avatar: string | null;
  companyName: string;
  department: string;
  location: string;
  managerId: string;
  role: string;
  status: string;
};

export function DetailsForm({
  values,
  canEdit,
  isManager,
  colleagues,
}: {
  values: DetailsValues;
  canEdit: boolean;
  isManager: boolean;
  colleagues: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(updateProfileAction, idle);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<DetailsValues>(values);

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

  const isEmployee = formData.role === "EMPLOYEE";
  const managerName = colleagues.find((c) => c.id === formData.managerId)?.name;

  return (
    <div className="card p-5 sm:p-6 shadow-xs flex flex-col gap-5">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 border-b border-line/70">
        <div>
          <h2 className="text-base font-bold text-ink-900">General Information</h2>
          <p className="text-xs text-ink-500">Contact, department, organizational role, and office location.</p>
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
                  form="details-form"
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
        <div className="flex flex-col gap-6 lg:flex-row items-start">
          <div className="flex flex-col items-center gap-2 lg:w-48 shrink-0">
            <Avatar src={formData.avatar} name={`${formData.firstName} ${formData.lastName}`} size={88} />
            <span className="text-xs font-medium text-ink-400">Employee Photo</span>
          </div>

          <div className="grid flex-1 gap-x-8 gap-y-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs font-medium text-ink-500">Full Name</dt>
              <dd className="font-semibold text-ink-900 mt-0.5">{formData.firstName} {formData.lastName}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-ink-500">Job Position</dt>
              <dd className="font-semibold text-ink-900 mt-0.5">{formData.jobPosition || "—"}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-ink-500">Work Email</dt>
              <dd className="font-semibold text-ink-900 mt-0.5">{formData.email}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-ink-500">Mobile Number</dt>
              <dd className="font-semibold text-ink-900 mt-0.5">{formData.mobile || "—"}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-ink-500">Company</dt>
              <dd className="font-semibold text-ink-900 mt-0.5">{formData.companyName}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-ink-500">Department</dt>
              <dd className="font-semibold text-ink-900 mt-0.5">{formData.department || "—"}</dd>
            </div>

            {isEmployee ? (
              <div>
                <dt className="text-xs font-medium text-ink-500">Reporting Manager</dt>
                <dd className="font-semibold text-ink-900 mt-0.5">{managerName || "No manager assigned"}</dd>
              </div>
            ) : null}

            <div>
              <dt className="text-xs font-medium text-ink-500">Office Location</dt>
              <dd className="font-semibold text-ink-900 mt-0.5">{formData.location || "—"}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-ink-500">System Role</dt>
              <dd className="mt-0.5">
                <span className="inline-flex rounded-full bg-brand-50 border border-brand-200/80 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
                  {ROLE_LABEL[formData.role as keyof typeof ROLE_LABEL] || formData.role}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-ink-500">Employment Status</dt>
              <dd className="mt-0.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    formData.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-orange-50 text-orange-800 border border-orange-200"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${formData.status === "ACTIVE" ? "bg-emerald-600" : "bg-orange-500"}`} />
                  {formData.status === "ACTIVE" ? "Active" : "Inactive"}
                </span>
              </dd>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <form id="details-form" action={action} className="flex flex-col gap-6">
          <input type="hidden" name="employeeId" value={formData.id} />

          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="lg:w-64">
              {canEdit ? (
                <ImageField
                  name="avatar"
                  label="Upload photo"
                  initial={formData.avatar}
                  fallbackName={`${formData.firstName} ${formData.lastName}`}
                  size={96}
                  employeeId={formData.id}
                />
              ) : null}
            </div>

            <div className="grid flex-1 gap-x-8 gap-y-4 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="First Name" name="firstName" error={state.errors?.firstName}>
                    <Input
                      name="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      disabled={!isManager}
                      error={state.errors?.firstName}
                    />
                  </Field>
                  <Field label="Last Name" name="lastName" error={state.errors?.lastName}>
                    <Input
                      name="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      disabled={!isManager}
                      error={state.errors?.lastName}
                    />
                  </Field>
                </div>

                <Field label="Job Position" name="jobPosition" error={state.errors?.jobPosition}>
                  <Input
                    name="jobPosition"
                    value={formData.jobPosition}
                    onChange={(e) => setFormData({ ...formData, jobPosition: e.target.value })}
                    disabled={!isManager}
                  />
                </Field>

                <Field label="Login ID" name="loginIdDisplay" hint="Issued by Dayflow and never changes.">
                  <Input name="loginIdDisplay" value={formData.loginId} disabled className="field mono" />
                </Field>

                <Field label="Email" name="email" error={state.errors?.email}>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isManager}
                    error={state.errors?.email}
                  />
                </Field>

                <Field label="Mobile" name="mobile" error={state.errors?.mobile}>
                  <Input
                    name="mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    disabled={!canEdit}
                  />
                </Field>
              </div>

              <div className="flex flex-col gap-4">
                <Field label="Company" name="companyDisplay">
                  <Input name="companyDisplay" value={formData.companyName} disabled />
                </Field>

                <Field label="Department" name="department" error={state.errors?.department}>
                  <Input
                    name="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    disabled={!isManager}
                  />
                </Field>

                {isEmployee ? (
                  <>
                    <Field label="Manager" name="managerId" error={state.errors?.managerId}>
                      <Select
                        name="managerId"
                        value={formData.managerId}
                        onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                        disabled={!isManager}
                      >
                        <option value="">No manager</option>
                        {colleagues.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Location" name="location" error={state.errors?.location}>
                      <Input
                        name="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        disabled={!isManager}
                      />
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Role" name="role" error={state.errors?.role}>
                        <Select
                          name="role"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          disabled={!isManager}
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABEL[role]}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Status" name="status" error={state.errors?.status}>
                        <Select
                          name="status"
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          disabled={!isManager}
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </Select>
                      </Field>
                    </div>
                  </>
                ) : (
                  <>
                    <Field label="Location" name="location" error={state.errors?.location}>
                      <Input
                        name="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        disabled={!isManager}
                      />
                    </Field>

                    <Field label="Role" name="role" error={state.errors?.role}>
                      <Select
                        name="role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        disabled={!isManager}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </>
                )}
              </div>
            </div>
          </div>

        </form>
      )}
    </div>
  );
}
