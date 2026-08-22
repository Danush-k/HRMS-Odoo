"use client";

import { useActionState } from "react";
import { updateAttendanceAction } from "@/server/actions/attendance";
import { Modal } from "@/components/modal";
import { Field, FormMessage, Input, Select, SubmitButton } from "@/components/ui";

type AttendanceRecord = {
  id?: string;
  employeeId?: string;
  dateStr?: string;
  employeeName: string;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
  note: string | null;
};

export function EditAttendanceModal({
  record,
  employeeId,
  employeeName,
  dateStr,
}: {
  record: AttendanceRecord | null;
  employeeId?: string;
  employeeName?: string;
  dateStr?: string;
}) {
  const activeRecord: AttendanceRecord = record ?? {
    employeeId,
    dateStr,
    employeeName: employeeName ?? "Employee",
    checkIn: null,
    checkOut: null,
    status: "ABSENT",
    note: "",
  };

  const formatForInput = (d: Date | null) => {
    if (!d) return "";
    const date = new Date(d);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  return (
    <Modal
      trigger="Edit"
      triggerClassName="btn-secondary btn-sm"
      title={`Correct Attendance: ${activeRecord.employeeName}`}
    >
      {(close) => (
        <FormContent record={activeRecord} formatForInput={formatForInput} close={close} />
      )}
    </Modal>
  );
}

function FormContent({
  record,
  formatForInput,
  close,
}: {
  record: AttendanceRecord;
  formatForInput: (d: Date | null) => string;
  close: () => void;
}) {
  const [state, action] = useActionState(async (prev: any, formData: FormData) => {
    const res = await updateAttendanceAction(prev, formData);
    if (res.ok) close();
    return res;
  }, { ok: true });

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <input type="hidden" name="attendanceId" value={record.id ?? ""} />
      <input type="hidden" name="employeeId" value={record.employeeId ?? ""} />
      <input type="hidden" name="date" value={record.dateStr ?? ""} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Check In Time" name="checkIn">
          <Input
            name="checkIn"
            type="datetime-local"
            defaultValue={formatForInput(record.checkIn)}
          />
        </Field>

        <Field label="Check Out Time" name="checkOut">
          <Input
            name="checkOut"
            type="datetime-local"
            defaultValue={formatForInput(record.checkOut)}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" name="status" required>
          <Select name="status" defaultValue={record.status}>
            <option value="PRESENT">Present</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ABSENT">Absent</option>
            <option value="LEAVE">On Leave</option>
          </Select>
        </Field>

        <Field label="Correction Note / Reason" name="note">
          <Input
            name="note"
            defaultValue={record.note || ""}
            placeholder="e.g. Adjusted check-in time per HR request"
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={close} className="btn-secondary">
          Cancel
        </button>
        <SubmitButton className="btn-primary">Save Correction</SubmitButton>
      </div>
    </form>
  );
}
