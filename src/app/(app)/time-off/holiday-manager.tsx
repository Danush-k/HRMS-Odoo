"use client";

import { useActionState, useTransition } from "react";

import { addPublicHolidayAction, deletePublicHolidayAction } from "@/server/actions/holidays";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui";
import { idle } from "@/lib/action-state";

export type Holiday = {
  id: string;
  name: string;
  date: Date | string;
  isRecurring?: boolean;
};

/** L10 — HR/Admin manage the company public holidays; everyone can view them. */
export function HolidayManager({ holidays, isHR }: { holidays: Holiday[]; isHR: boolean }) {
  const [state, action] = useActionState(addPublicHolidayAction, idle);
  const [isPending, startTransition] = useTransition();

  const removeHoliday = (holidayId: string) => {
    startTransition(() => {
      void deletePublicHolidayAction(holidayId);
    });
  };

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold text-ink-900">Public Holidays Calendar</h3>
        <p className="hint mt-0.5">Leave taken on these days does not consume an allocation.</p>
      </div>

      {isHR ? (
        <form action={action} className="flex flex-wrap items-end gap-3 border-b border-line pb-4">
          <Field label="Holiday Name" name="name" required>
            <Input name="name" placeholder="e.g. Independence Day" required minLength={2} />
          </Field>
          <Field label="Date" name="date" required>
            <Input name="date" type="date" required />
          </Field>
          <SubmitButton pendingLabel="Adding…">Add Holiday</SubmitButton>
        </form>
      ) : null}
      {isHR && state.message ? (
        <FormMessage state={state} />
      ) : null}

      <div className="flex flex-col gap-2">
        {holidays.length === 0 ? (
          <p className="text-sm text-ink-500">
            No public holidays added yet.{isHR ? " Use the form above to add one." : ""}
          </p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {[...holidays]
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((h) => (
                <li key={h.id} className="py-2 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-ink-900">{h.name}</span>
                    {h.isRecurring ? (
                      <span className="ml-2 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                        yearly
                      </span>
                    ) : null}
                    <span className="ml-2 text-xs text-ink-500">
                      {new Date(h.date).toLocaleDateString("en-US", { dateStyle: "medium" })}
                    </span>
                  </div>
                  {isHR ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => removeHoliday(h.id)}
                      className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
