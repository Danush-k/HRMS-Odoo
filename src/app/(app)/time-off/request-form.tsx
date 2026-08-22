"use client";

import { useActionState, useMemo, useState } from "react";

import { Modal } from "@/components/modal";
import { Field, FormMessage, Input, Select, SubmitButton, Textarea } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { requestLeaveAction } from "@/server/actions/timeoff";

export type LeaveTypeOption = {
  id: string;
  name: string;
  isPaid: boolean;
  requiresAttachment: boolean;
  available: number;
};

const today = new Date().toISOString().slice(0, 10);

/**
 * Working days only — weekends never consume a leave balance, and neither do
 * company public holidays (L10), which arrive here as "yyyy-MM-dd" strings.
 */
function workingDaysBetween(start: string, end: string, publicHolidays: string[] = []) {
  if (!start || !end) return 0;
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T00:00:00`);
  if (to < from) return 0;

  const holidaySet = new Set(publicHolidays);
  let count = 0;
  for (const cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    const day = cursor.getDay();
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (day !== 0 && day !== 6 && !holidaySet.has(key)) count += 1;
  }
  return count;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "application/pdf"];

export function RequestLeaveButton({
  leaveTypes,
  employees,
  defaultEmployeeId,
  canFileForOthers,
  publicHolidayDates = [],
}: {
  leaveTypes: LeaveTypeOption[];
  employees: { id: string; name: string }[];
  defaultEmployeeId: string;
  canFileForOthers: boolean;
  /** L10 — ISO "yyyy-MM-dd" dates excluded from the deducted-day preview. */
  publicHolidayDates?: string[];
}) {
  return (
    <Modal trigger="New" title="Time Off Request">
      {(close) => (
        <RequestLeaveForm
          leaveTypes={leaveTypes}
          employees={employees}
          defaultEmployeeId={defaultEmployeeId}
          canFileForOthers={canFileForOthers}
          publicHolidayDates={publicHolidayDates}
          onDone={close}
        />
      )}
    </Modal>
  );
}

function RequestLeaveForm({
  leaveTypes,
  employees,
  defaultEmployeeId,
  canFileForOthers,
  publicHolidayDates,
  onDone,
}: {
  leaveTypes: LeaveTypeOption[];
  employees: { id: string; name: string }[];
  defaultEmployeeId: string;
  canFileForOthers: boolean;
  publicHolidayDates: string[];
  onDone: () => void;
}) {
  const [state, action] = useActionState(requestLeaveAction, idle);
  const [typeId, setTypeId] = useState(leaveTypes[0]?.id ?? "");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [attachmentName, setAttachmentName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);

  const selected = useMemo(() => leaveTypes.find((type) => type.id === typeId), [leaveTypes, typeId]);
  const days = workingDaysBetween(start, end, publicHolidayDates);
  const overBalance = Boolean(selected?.isPaid && days > selected.available);

  if (state.ok) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage state={state} />
        <p className="text-sm text-ink-500">Your HR officer will review it and you will see the outcome here.</p>
        <button type="button" className="btn-primary self-start" onClick={onDone}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />

      <Field label="Employee" name="employeeId" error={state.errors?.employeeId}>
        <Select name="employeeId" defaultValue={defaultEmployeeId} disabled={!canFileForOthers}>
          {employees.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Time Off Type" name="leaveTypeId" error={state.errors?.leaveTypeId} required>
        <Select name="leaveTypeId" value={typeId} onChange={(event) => setTypeId(event.target.value)}>
          {leaveTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
              {type.isPaid ? ` — ${type.available} day(s) available` : " — unpaid"}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Validity Period — From" name="startDate" error={state.errors?.startDate} required>
          <Input name="startDate" type="date" value={start} onChange={(event) => setStart(event.target.value)} />
        </Field>
        <Field label="To" name="endDate" error={state.errors?.endDate} required>
          <Input name="endDate" type="date" value={end} onChange={(event) => setEnd(event.target.value)} error={state.errors?.endDate} />
        </Field>
      </div>

      <div
        className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
          overBalance ? "border-danger/30 bg-danger-soft text-danger" : "border-line bg-canvas text-ink-700"
        }`}
      >
        <span className="font-medium">Allocation</span>
        <span className="num font-semibold">
          {days.toFixed(2)} day{days === 1 ? "" : "s"}
          {overBalance ? ` — only ${selected?.available} available` : ""}
        </span>
      </div>

      {selected?.requiresAttachment ? (
        <Field
          label="Certificate"
          name="attachmentFile"
          error={state.errors?.attachment ?? fileError ?? undefined}
          hint="PNG, JPEG or PDF up to 5 MB."
          required
        >
          <div className="flex items-center gap-3">
            {/* L9 — the file itself is submitted with the form; no base64 in the database. */}
            <input
              id="attachmentFile"
              name="attachmentFile"
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
              className="field py-1.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-brand-700"
              onChange={(event) => {
                setFileError(null);
                const file = event.target.files?.[0];
                if (!file) {
                  setAttachmentName("");
                  return;
                }
                if (!ACCEPTED_TYPES.includes(file.type)) {
                  setFileError("Only PNG, JPEG, and PDF files are allowed.");
                  event.target.value = "";
                  setAttachmentName("");
                  return;
                }
                if (file.size > MAX_FILE_SIZE_BYTES) {
                  setFileError("File size exceeds 5 MB limit.");
                  event.target.value = "";
                  setAttachmentName("");
                  return;
                }
                setAttachmentName(file.name);
              }}
            />
          </div>
          {attachmentName ? <p className="hint">Attached: {attachmentName}</p> : null}
        </Field>
      ) : null}

      <Field label="Remarks" name="remarks" error={state.errors?.remarks}>
        <Textarea name="remarks" rows={3} placeholder="Anything your HR officer should know." />
      </Field>

      <div className="flex flex-wrap gap-3 border-t border-line pt-4">
        <SubmitButton pendingLabel="Submitting…">Submit</SubmitButton>
        <button type="button" className="btn-secondary" onClick={onDone}>
          Discard
        </button>
      </div>
    </form>
  );
}
