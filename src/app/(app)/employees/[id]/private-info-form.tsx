"use client";

import { useActionState } from "react";

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

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="employeeId" value={employeeId} />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card flex flex-col gap-4 p-5">
          <p className="section-title">Personal</p>

          <Field label="Date of Birth" name="dateOfBirth" error={state.errors?.dateOfBirth}>
            <Input name="dateOfBirth" type="date" defaultValue={values.dateOfBirth} disabled={!isManager} />
          </Field>

          <Field label="Residing Address" name="residingAddress" error={state.errors?.residingAddress}>
            <Input name="residingAddress" defaultValue={values.residingAddress} disabled={!canEdit} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nationality" name="nationality">
              <Input name="nationality" defaultValue={values.nationality} disabled={!isManager} />
            </Field>
            <Field label="Gender" name="gender">
              <Select name="gender" defaultValue={values.gender} disabled={!isManager}>
                <option value="">Not specified</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </Select>
            </Field>
          </div>

          <Field label="Personal Email" name="personalEmail" error={state.errors?.personalEmail}>
            <Input name="personalEmail" type="email" defaultValue={values.personalEmail} disabled={!canEdit} error={state.errors?.personalEmail} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Marital Status" name="maritalStatus">
              <Select name="maritalStatus" defaultValue={values.maritalStatus} disabled={!isManager}>
                <option value="">Not specified</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Other">Other</option>
              </Select>
            </Field>
            <Field label="Date of Joining" name="dateOfJoining" error={state.errors?.dateOfJoining}>
              <Input name="dateOfJoining" type="date" defaultValue={values.dateOfJoining} disabled={true} />
            </Field>
          </div>
        </div>

        <div className="card flex flex-col gap-4 p-5">
          <p className="section-title">Bank Details</p>

          <Field label="Account Number" name="accountNumber">
            <Input name="accountNumber" defaultValue={values.accountNumber} disabled={!isManager} className="field mono" />
          </Field>
          <Field label="Bank Name" name="bankName">
            <Input name="bankName" defaultValue={values.bankName} disabled={!isManager} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="IFSC Code" name="ifscCode">
              <Input name="ifscCode" defaultValue={values.ifscCode} disabled={!isManager} className="field mono uppercase" />
            </Field>
            <Field label="PAN No" name="panNo">
              <Input name="panNo" defaultValue={values.panNo} disabled={!isManager} className="field mono uppercase" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="UAN No" name="uanNo">
              <Input name="uanNo" defaultValue={values.uanNo} disabled={!isManager} className="field mono" />
            </Field>
            <Field label="Emp Code" name="empCode">
              <Input name="empCode" defaultValue={values.empCode} disabled={true} className="field mono" />
            </Field>
          </div>
        </div>
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingLabel="Saving…">Save private info</SubmitButton>
          <div className="flex-1">
            <FormMessage state={state} />
          </div>
          {!isManager ? (
            <p className="hint w-full">Address and personal email are yours to change. HR maintains the rest.</p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
