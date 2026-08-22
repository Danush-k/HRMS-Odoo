"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Field, FormMessage, Input, Select, SubmitButton } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { ROLES, ROLE_LABEL } from "@/lib/constants";
import { createEmployeeAction } from "@/server/actions/employees";

const today = new Date().toISOString().slice(0, 10);

export function NewEmployeeForm({ colleagues }: { colleagues: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createEmployeeAction, idle);
  const [copied, setCopied] = useState(false);

  // The credentials come back once. Keep the form on screen so they can be copied.
  if (state.ok && state.notice) {
    return (
      <div className="card p-6">
        <p className="chip bg-present-soft text-present">Employee added</p>
        <h2 className="mt-3 text-lg font-semibold text-ink-900">{state.message}</h2>
        <p className="mt-1 text-sm text-ink-500">
          Share these credentials with the employee. The password is replaced the first time they sign in.
        </p>

        <pre className="mono mt-4 overflow-x-auto rounded-md border border-line bg-canvas px-4 py-3 text-sm text-ink-900">
          {state.notice}
        </pre>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              navigator.clipboard?.writeText(state.notice ?? "");
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy credentials"}
          </button>
          <Link href="/employees" className="btn-primary">
            Back to Employees
          </Link>
          <button type="button" className="btn-ghost" onClick={() => window.location.reload()}>
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="card flex flex-col gap-5 p-5 sm:p-6">
      <FormMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First Name" name="firstName" error={state.errors?.firstName} required>
          <Input name="firstName" error={state.errors?.firstName} />
        </Field>
        <Field label="Last Name" name="lastName" error={state.errors?.lastName} required>
          <Input name="lastName" error={state.errors?.lastName} />
        </Field>
      </div>

      <Field label="Email" name="email" error={state.errors?.email} required>
        <Input name="email" type="email" error={state.errors?.email} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Job Position" name="jobPosition" error={state.errors?.jobPosition}>
          <Input name="jobPosition" placeholder="Software Engineer" />
        </Field>
        <Field label="Department" name="department" error={state.errors?.department}>
          <Input name="department" placeholder="Engineering" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mobile" name="mobile" error={state.errors?.mobile}>
          <Input name="mobile" type="tel" />
        </Field>
        <Field label="Location" name="location" error={state.errors?.location}>
          <Input name="location" placeholder="Chennai" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role" name="role" hint="All newly created staff members are assigned the Employee role.">
          <input type="hidden" name="role" value="EMPLOYEE" />
          <div className="flex h-10 items-center justify-between rounded-lg border border-line bg-ink-50/70 px-3.5 text-sm font-medium text-ink-800 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-600" />
              <span>Employee</span>
            </div>
            <span className="rounded bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-200">
              Standard Role
            </span>
          </div>
        </Field>
        <Field label="Manager" name="managerId" error={state.errors?.managerId}>
          <Select name="managerId" defaultValue="">
            <option value="">No manager</option>
            {colleagues.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Date of Joining"
          name="dateOfJoining"
          error={state.errors?.dateOfJoining}
          hint="Drives the year and serial in the Login ID (today or future dates only)."
          required
        >
          <Input name="dateOfJoining" type="date" min={today} defaultValue={today} error={state.errors?.dateOfJoining} />
        </Field>
        <Field label="Monthly Wage" name="monthlyWage" error={state.errors?.monthlyWage} hint="Salary components derive from this.">
          <Input name="monthlyWage" type="number" min="0" step="0.01" defaultValue="0" className="field mono" />
        </Field>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-line pt-5">
        <SubmitButton pendingLabel="Creating…">Create employee</SubmitButton>
        <Link href="/employees" className="btn-secondary">
          Discard
        </Link>
      </div>
    </form>
  );
}
