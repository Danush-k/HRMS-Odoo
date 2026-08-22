"use client";

import { useActionState, useState } from "react";
import { adjustLeaveAllocationAction } from "@/server/actions/timeoff";
import { Field, FormMessage, Input, Select, SubmitButton } from "@/components/ui";

type EmployeeOption = { id: string; name: string };
type LeaveTypeOption = { id: string; name: string };

export function AllocationForm({
  employees,
  leaveTypes,
}: {
  employees: EmployeeOption[];
  leaveTypes: LeaveTypeOption[];
}) {
  const [state, action] = useActionState(adjustLeaveAllocationAction, { ok: true });
  const [selectedEmp, setSelectedEmp] = useState(employees[0]?.id ?? "");
  const [selectedType, setSelectedType] = useState(leaveTypes[0]?.id ?? "");

  return (
    <form action={action} className="card flex flex-col gap-4 p-5">
      <h3 className="text-base font-semibold text-ink-900">Adjust Leave Allocation</h3>
      <FormMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Employee" name="employeeId" required>
          <Select
            name="employeeId"
            value={selectedEmp}
            onChange={(e) => setSelectedEmp(e.target.value)}
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Leave Type" name="leaveTypeId" required>
          <Select
            name="leaveTypeId"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Year" name="year">
          <Input
            name="year"
            type="number"
            defaultValue={new Date().getFullYear()}
            min={2020}
            max={2030}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Allocated Days" name="allocated" required hint="Total annual days granted for this type">
          <Input name="allocated" type="number" step="0.5" min="0" defaultValue="24" required />
        </Field>

        <div className="flex items-end">
          <SubmitButton className="btn-primary w-full">Save Allocation</SubmitButton>
        </div>
      </div>
    </form>
  );
}
