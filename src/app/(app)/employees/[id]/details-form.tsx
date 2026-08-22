"use client";

import { useActionState } from "react";

import { ImageField } from "@/components/image-field";
import { Field, FormMessage, Input, Select, SubmitButton } from "@/components/ui";
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
  const locked = !canEdit;
  const isEmployee = values.role === "EMPLOYEE";

  return (
    <form action={action} className="card p-5 sm:p-6">
      <input type="hidden" name="employeeId" value={values.id} />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-64">
          {canEdit ? (
            <ImageField
              name="avatar"
              label="Upload photo"
              initial={values.avatar}
              fallbackName={`${values.firstName} ${values.lastName}`}
              size={96}
              employeeId={values.id}
            />
          ) : null}
        </div>

        <div className="grid flex-1 gap-x-8 gap-y-4 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First Name" name="firstName" error={state.errors?.firstName}>
                <Input name="firstName" defaultValue={values.firstName} disabled={!isManager} error={state.errors?.firstName} />
              </Field>
              <Field label="Last Name" name="lastName" error={state.errors?.lastName}>
                <Input name="lastName" defaultValue={values.lastName} disabled={!isManager} error={state.errors?.lastName} />
              </Field>
            </div>

            <Field label="Job Position" name="jobPosition" error={state.errors?.jobPosition}>
              <Input name="jobPosition" defaultValue={values.jobPosition} disabled={!isManager} />
            </Field>

            <Field label="Login ID" name="loginIdDisplay" hint="Issued by Dayflow and never changes.">
              <Input name="loginIdDisplay" defaultValue={values.loginId} disabled className="field mono" />
            </Field>

            <Field label="Email" name="email" error={state.errors?.email}>
              <Input name="email" type="email" defaultValue={values.email} disabled={!isManager} error={state.errors?.email} />
            </Field>

            <Field label="Mobile" name="mobile" error={state.errors?.mobile}>
              <Input name="mobile" defaultValue={values.mobile} disabled={locked} />
            </Field>
          </div>

          <div className="flex flex-col gap-4">
            <Field label="Company" name="companyDisplay">
              <Input name="companyDisplay" defaultValue={values.companyName} disabled />
            </Field>

            <Field label="Department" name="department" error={state.errors?.department}>
              <Input name="department" defaultValue={values.department} disabled={!isManager} />
            </Field>

            {isEmployee ? (
              <>
                <Field label="Manager" name="managerId" error={state.errors?.managerId}>
                  <Select name="managerId" defaultValue={values.managerId} disabled={!isManager}>
                    <option value="">No manager</option>
                    {colleagues.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Location" name="location" error={state.errors?.location}>
                  <Input name="location" defaultValue={values.location} disabled={!isManager} />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Role" name="role" error={state.errors?.role}>
                    <Select name="role" defaultValue={values.role} disabled={!isManager}>
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABEL[role]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Status" name="status" error={state.errors?.status}>
                    <Select name="status" defaultValue={values.status} disabled={!isManager}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </Select>
                  </Field>
                </div>
              </>
            ) : (
              <>
                <Field label="Location" name="location" error={state.errors?.location}>
                  <Input name="location" defaultValue={values.location} disabled={!isManager} />
                </Field>

                <Field label="Role" name="role" error={state.errors?.role}>
                  <Select name="role" defaultValue={values.role} disabled={!isManager}>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Status" name="status" error={state.errors?.status}>
                  <Select name="status" defaultValue={values.status} disabled={!isManager}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </Select>
                </Field>
              </>
            )}
          </div>
        </div>
      </div>

      {canEdit ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <SubmitButton pendingLabel="Saving…">Save details</SubmitButton>
          <div className="flex-1">
            <FormMessage state={state} />
          </div>
        </div>
      ) : (
        <p className="mt-6 border-t border-line pt-4 text-xs text-ink-500">
          You are viewing this profile. Only the employee and HR can change it.
        </p>
      )}
    </form>
  );
}
