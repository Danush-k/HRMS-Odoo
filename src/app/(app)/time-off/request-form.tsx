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

/** Weekdays only — weekends never consume a leave balance. */
function workingDaysBetween(start: string, end: string) {
  if (!start || !end) return 0;
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T00:00:00`);
  if (to < from) return 0;

  let count = 0;
  for (const cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

export function RequestLeaveButton({
  leaveTypes,
  employees,
  defaultEmployeeId,
  canFileForOthers,
}: {
  leaveTypes: LeaveTypeOption[];
  employees: { id: string; name: string }[];
  defaultEmployeeId: string;
  canFileForOthers: boolean;
}) {
  return (
    <Modal trigger="New" title="Time Off Request">
      {(close) => (
        <RequestLeaveForm
          leaveTypes={leaveTypes}
          employees={employees}
          defaultEmployeeId={defaultEmployeeId}
          canFileForOthers={canFileForOthers}
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
  onDone,
}: {
  leaveTypes: LeaveTypeOption[];
  employees: { id: string; name: string }[];
  defaultEmployeeId: string;
  canFileForOthers: boolean;
  onDone: () => void;
}) {
  const [state, action] = useActionState(requestLeaveAction, idle);
  const [typeId, setTypeId] = useState(leaveTypes[0]?.id ?? "");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [attachment, setAttachment] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  const selected = useMemo(() => leaveTypes.find((type) => type.id === typeId), [leaveTypes, typeId]);
  const days = workingDaysBetween(start, end);
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
      <input type="hidden" name="attachment" value={attachment} />

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
          label="Attachment"
          name="attachmentFile"
          error={state.errors?.attachment}
          hint="A medical certificate is required for sick leave."
          required
        >
          <div className="flex items-center gap-3">
            <input
              id="attachmentFile"
              name="attachmentFile"
              type="file"
              accept="image/*,application/pdf"
              className="field py-1.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-brand-700"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setAttachment(String(reader.result));
                  setAttachmentName(file.name);
                };
                reader.readAsDataURL(file);
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
