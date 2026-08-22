"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function EmployeeFilterSelect({
  employees,
  selectedEmpId,
}: {
  employees: { id: string; name: string }[];
  selectedEmpId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set("empId", val);
    } else {
      params.delete("empId");
    }
    params.set("page", "1");
    router.push(`/time-off?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-ink-600">Employee:</span>
      <select
        value={selectedEmpId || ""}
        onChange={handleChange}
        className="rounded border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-800 focus:border-brand-600 focus:outline-none"
      >
        <option value="">All Employees</option>
        {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.name}
          </option>
        ))}
      </select>
    </div>
  );
}
