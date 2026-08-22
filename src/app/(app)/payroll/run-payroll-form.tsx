"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { type ActionState, idle } from "@/lib/action-state";
import { runPayrollAction, generateSelectedPayrollAction } from "@/server/actions/payroll";

export type RunPayrollEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  loginId: string;
  avatar: string | null;
  jobPosition: string | null;
  department: string | null;
};

export function RunPayrollForm({
  year,
  month,
  label,
  employees = [],
}: {
  year: number;
  month: number;
  label: string;
  employees?: RunPayrollEmployee[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"ALL" | "CUSTOM">("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [state, setState] = useState<ActionState>(idle);
  const [isPending, startTransition] = useTransition();

  // Initialize selected IDs when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode("ALL");
      setSelectedIds(new Set(employees.map((e) => e.id)));
      setSearch("");
      setState(idle);
    }
  }, [isOpen, employees]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("keydown", escape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", escape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      const name = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const loginId = emp.loginId.toLowerCase();
      const position = emp.jobPosition?.toLowerCase() || "";
      const dept = emp.department?.toLowerCase() || "";
      return name.includes(q) || loginId.includes(q) || position.includes(q) || dept.includes(q);
    });
  }, [employees, search]);

  const isAllSelected = employees.length > 0 && selectedIds.size === employees.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.map((e) => e.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    startTransition(async () => {
      let res: ActionState;

      if (mode === "ALL") {
        const formData = new FormData();
        formData.set("year", String(year));
        formData.set("month", String(month));
        res = await runPayrollAction(idle, formData);
      } else {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) {
          setState({ ok: false, message: "Please select at least one employee." });
          return;
        }
        res = await generateSelectedPayrollAction(ids, year, month);
      }

      setState(res);
      if (res.ok) {
        router.refresh();
        setTimeout(() => {
          setIsOpen(false);
        }, 800);
      }
    });
  };

  const selectedCount = mode === "ALL" ? employees.length : selectedIds.size;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-primary rounded-xl inline-flex items-center gap-2 shadow-xs transition active:scale-[0.99]"
      >
        <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
          <path fillRule="evenodd" d="M1 4a1 1 0 011-1h16a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4zm12 4a3 3 0 11-6 0 3 3 0 016 0zM4 9a1 1 0 100-2 1 1 0 000 2zm12 0a1 1 0 100-2 1 1 0 000 2zM2 15a1 1 0 00-1 1v1a1 1 0 001 1h16a1 1 0 001-1v-1a1 1 0 00-1-1H2z" clipRule="evenodd" />
        </svg>
        <span>Run payroll for {label}</span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-ink-900/50 backdrop-blur-[3px] transition-opacity animate-in fade-in duration-150"
            onClick={() => !isPending && setIsOpen(false)}
          />

          {/* Dialog Card */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Run Payroll for ${label}`}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-ink-900/25 transition-all animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface">
              <div>
                <h2 className="text-base font-bold text-ink-900">Run Payroll — {label}</h2>
                <p className="hint text-xs text-ink-500 mt-0.5">
                  Calculate and finalize monthly payslips based on attendance and salary structures.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-800 transition"
                aria-label="Close dialog"
              >
                <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                {/* Processing Scope Selector */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-600 mb-2.5">
                    Processing Scope
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Option 1: All Active Employees */}
                    <button
                      type="button"
                      onClick={() => setMode("ALL")}
                      className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition ${
                        mode === "ALL"
                          ? "border-brand-600 bg-brand-50/80 shadow-xs ring-1 ring-brand-500/20"
                          : "border-line bg-surface hover:border-ink-300 hover:bg-brand-50/20"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-ink-900">All Active Employees</span>
                        <span className="chip text-[10px] bg-brand-600 text-white font-semibold">
                          {employees.length}
                        </span>
                      </div>
                      <p className="hint text-[11px] text-ink-500 mt-1">
                        Process payroll for all active team members organization-wide.
                      </p>
                    </button>

                    {/* Option 2: Select Specific Employees */}
                    <button
                      type="button"
                      onClick={() => setMode("CUSTOM")}
                      className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition ${
                        mode === "CUSTOM"
                          ? "border-brand-600 bg-brand-50/80 shadow-xs ring-1 ring-brand-500/20"
                          : "border-line bg-surface hover:border-ink-300 hover:bg-brand-50/20"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-ink-900">Specific Employees</span>
                        <span
                          className={`chip text-[10px] ${
                            mode === "CUSTOM" ? "bg-brand-700 text-white font-semibold" : "bg-ink-100 text-ink-600"
                          }`}
                        >
                          {selectedIds.size} Selected
                        </span>
                      </div>
                      <p className="hint text-[11px] text-ink-500 mt-1">
                        Select specific individuals or departments to process.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Custom Employee Checklist (Visible when mode === 'CUSTOM') */}
                {mode === "CUSTOM" ? (
                  <div className="rounded-xl border border-line bg-ink-100/30 p-3.5 flex flex-col gap-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between gap-2">
                      {/* Search box inside modal */}
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search by name, ID, role, or department…"
                          className="field py-1.5 pl-8 pr-3 text-xs rounded-lg"
                        />
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-ink-400">
                          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-xs font-semibold text-brand-700 hover:underline shrink-0"
                      >
                        {isAllSelected ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    {/* Scrollable employee checklist */}
                    <div className="max-h-56 overflow-y-auto divide-y divide-line/60 rounded-lg border border-line bg-surface">
                      {filteredEmployees.length === 0 ? (
                        <p className="p-4 text-center text-xs text-ink-500">No matching employees found.</p>
                      ) : (
                        filteredEmployees.map((emp) => {
                          const isChecked = selectedIds.has(emp.id);
                          return (
                            <label
                              key={emp.id}
                              className={`flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer transition ${
                                isChecked ? "bg-brand-50/50" : "hover:bg-ink-100/50"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelect(emp.id)}
                                  className="rounded border-ink-300 text-brand-600 focus:ring-brand-500 cursor-pointer h-4 w-4"
                                />
                                <Avatar src={emp.avatar} name={`${emp.firstName} ${emp.lastName}`} size={26} />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-ink-900 truncate">
                                    {emp.firstName} {emp.lastName}
                                  </p>
                                  <p className="text-[10px] text-ink-500 truncate">
                                    {emp.loginId} · {emp.jobPosition || emp.department || "Employee"}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  isChecked
                                    ? "bg-brand-100 text-brand-800 font-semibold"
                                    : "bg-ink-100 text-ink-500"
                                }`}
                              >
                                {isChecked ? "Included" : "Excluded"}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>

                    <p className="text-[11px] text-ink-500 text-right">
                      Selected <strong className="text-ink-900 font-bold">{selectedIds.size}</strong> of {employees.length} employees
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-line bg-brand-50/50 p-4">
                    <p className="text-xs font-medium text-brand-900">
                      Payroll will be calculated and issued for all <strong>{employees.length} active employees</strong> for {label}.
                    </p>
                    <p className="hint text-[11px] text-brand-700/80 mt-1">
                      Employees without a configured salary structure will be automatically bypassed.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-line bg-surface px-6 py-4">
                <div>
                  {state.ok && state.message ? (
                    <p className="text-xs font-semibold text-present flex items-center gap-1.5">
                      <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                      {state.message}
                    </p>
                  ) : !state.ok && state.message ? (
                    <p className="text-xs font-medium text-danger">{state.message}</p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={isPending}
                    className="btn-secondary btn-sm rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || selectedCount === 0}
                    className="btn-primary btn-sm rounded-lg inline-flex items-center gap-1.5 shadow-xs"
                  >
                    {isPending ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Processing Payroll…</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        <span>
                          {mode === "ALL"
                            ? `Process Payroll (${employees.length} Employees)`
                            : `Process Payroll (${selectedIds.size} Selected)`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
