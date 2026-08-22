"use client";

import { useActionState } from "react";

import { Field, FormMessage, SubmitButton, Textarea } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { updateProfileAction } from "@/server/actions/employees";

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

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="employeeId" value={employeeId} />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card flex flex-col gap-4 p-5">
          <Field label="About" name="about">
            <Textarea name="about" rows={4} defaultValue={values.about} disabled={!canEdit} placeholder="A short introduction." />
          </Field>
          <Field label="What I love about my job" name="loveAboutJob">
            <Textarea name="loveAboutJob" rows={3} defaultValue={values.loveAboutJob} disabled={!canEdit} />
          </Field>
          <Field label="My interests and hobbies" name="interests">
            <Textarea name="interests" rows={3} defaultValue={values.interests} disabled={!canEdit} />
          </Field>
        </div>

        <div className="card flex flex-col gap-4 p-5">
          <Field label="Skills" name="skills" hint="One per line, or separated by commas.">
            <Textarea name="skills" rows={6} defaultValue={values.skills} disabled={!canEdit} placeholder="Python&#10;Odoo&#10;PostgreSQL" />
          </Field>
          <Field label="Certifications" name="certifications" hint="One per line.">
            <Textarea name="certifications" rows={5} defaultValue={values.certifications} disabled={!canEdit} />
          </Field>
        </div>
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingLabel="Saving…">Save resume</SubmitButton>
          <div className="flex-1">
            <FormMessage state={state} />
          </div>
        </div>
      ) : null}
    </form>
  );
}
