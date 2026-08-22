"use client";

import { useMemo, useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { formatCurrency, computeSalary } from "@/lib/salary";
import { EditSalaryModal, type SalaryValues } from "@/components/edit-salary-drawer";
import { generateSinglePayslipAction, generateSelectedPayrollAction } from "@/server/actions/payroll";

export type PayrollEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  loginId: string;
  avatar: string | null;
  jobPosition: string | null;
  department: string | null;
  salary: {
    monthlyWage: number;
    workingDaysPerWeek: number;
    breakHours: number;
    basicPercent: number;
    hraPercentOfBasic: number;
    standardAllowancePercent: number;
    performanceBonusPercent: number;
    ltaPercent: number;
    pfPercent: number;
    professionalTax: number;
  } | null;
};

export type PayrollPayslip = {
  id: string;
  employeeId: string;
  payableDays: number;
  totalWorkingDays: number;
  grossMonthly: number;
  totalDeductions: number;
  netPay: number;
};

const DEFAULT_SALARY: SalaryValues = {
  monthlyWage: 50000,
  workingDaysPerWeek: 5,
  breakHours: 1,
  basicPercent: 50,
  hraPercentOfBasic: 50,
  standardAllowancePercent: 16.67,
  performanceBonusPercent: 8.33,
  ltaPercent: 8.33,
  pfPercent: 12,
  professionalTax: 200,
};

type FilterStatus = "ALL" | "GENERATED" | "PENDING";
type SortOption = "NAME_ASC" | "NAME_DESC" | "NET_DESC" | "NET_ASC" | "GROSS_DESC" | "DAYS_DESC";

export function PayrollTable({
  employees,
  payslips,
  periodLabel = "This Month",
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1,
}: {
  employees: PayrollEmployee[];
  payslips: PayrollPayslip[];
  periodLabel?: string;
  year?: number;
  month?: number;
}) {
  const router = useRouter();
  const byEmployee = useMemo(() => new Map(payslips.map((p) => [p.employeeId, p])), [payslips]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("NAME_ASC");
  const [editingEmployee, setEditingEmployee] = useState<PayrollEmployee | null>(null);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, startGenerating] = useTransition();
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [generatingSingleId, setGeneratingSingleId] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Clear toast feedback after 4 seconds
  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => setActionFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  const getSalaryValues = (emp: PayrollEmployee): SalaryValues => {
    if (!emp.salary) return DEFAULT_SALARY;
    return {
      monthlyWage: emp.salary.monthlyWage,
      workingDaysPerWeek: emp.salary.workingDaysPerWeek,
      breakHours: emp.salary.breakHours,
      basicPercent: emp.salary.basicPercent,
      hraPercentOfBasic: emp.salary.hraPercentOfBasic,
      standardAllowancePercent: emp.salary.standardAllowancePercent,
      performanceBonusPercent: emp.salary.performanceBonusPercent,
      ltaPercent: emp.salary.ltaPercent,
      pfPercent: emp.salary.pfPercent,
      professionalTax: emp.salary.professionalTax,
    };
  };

  // Suggestions for autocomplete while typing
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    return employees
      .filter((emp) => {
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const loginId = emp.loginId.toLowerCase();
        const position = emp.jobPosition?.toLowerCase() || "";
        const department = emp.department?.toLowerCase() || "";
        return fullName.includes(q) || loginId.includes(q) || position.includes(q) || department.includes(q);
      })
      .slice(0, 5);
  }, [employees, searchQuery]);

  // Filtered and sorted employees for the table
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return employees
      .filter((emp) => {
        const payslip = byEmployee.get(emp.id);

        // Status Filter
        if (statusFilter === "GENERATED" && !payslip) return false;
        if (statusFilter === "PENDING" && payslip) return false;

        // Search Filter
        if (q) {
          const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
          const loginId = emp.loginId.toLowerCase();
          const position = emp.jobPosition?.toLowerCase() || "";
          const department = emp.department?.toLowerCase() || "";
          const matches = fullName.includes(q) || loginId.includes(q) || position.includes(q) || department.includes(q);
          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const payslipA = byEmployee.get(a.id);
        const payslipB = byEmployee.get(b.id);
        const grossA = payslipA?.grossMonthly ?? a.salary?.monthlyWage ?? 0;
        const grossB = payslipB?.grossMonthly ?? b.salary?.monthlyWage ?? 0;
        const netA = payslipA?.netPay ?? 0;
        const netB = payslipB?.netPay ?? 0;
        const daysA = payslipA?.payableDays ?? 0;
        const daysB = payslipB?.payableDays ?? 0;

        switch (sortBy) {
          case "NAME_ASC":
            return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          case "NAME_DESC":
            return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
          case "NET_DESC":
            return netB - netA;
          case "NET_ASC":
            return netA - netB;
          case "GROSS_DESC":
            return grossB - grossA;
          case "DAYS_DESC":
            return daysB - daysA;
          default:
            return 0;
        }
      });
  }, [employees, byEmployee, searchQuery, statusFilter, sortBy]);

  // Counts for status tabs
  const generatedCount = useMemo(() => {
    return employees.filter((e) => byEmployee.has(e.id)).length;
  }, [employees, byEmployee]);

  const pendingCount = employees.length - generatedCount;

  // Checkbox Selection Helpers
  const isAllVisibleSelected =
    filteredEmployees.length > 0 && filteredEmployees.every((e) => selectedIds.has(e.id));

  const toggleSelectAll = () => {
    if (isAllVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map((e) => e.id)));
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

  // Generate single employee payroll
  const handleGenerateSingle = (empId: string, empName: string) => {
    setGeneratingSingleId(empId);
    startGenerating(async () => {
      const res = await generateSinglePayslipAction(empId, year, month);
      setGeneratingSingleId(null);
      if (res.ok) {
        setActionFeedback({ text: `Generated payslip for ${empName}.`, type: "success" });
        router.refresh();
      } else {
        setActionFeedback({ text: res.message || "Failed to generate payslip.", type: "error" });
      }
    });
  };

  // Generate payroll for selected employees
  const handleGenerateSelected = () => {
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    startGenerating(async () => {
      const res = await generateSelectedPayrollAction(ids, year, month);
      if (res.ok) {
        setActionFeedback({ text: res.message || `Generated ${ids.length} payslips.`, type: "success" });
        setSelectedIds(new Set());
        router.refresh();
      } else {
        setActionFeedback({ text: res.message || "Failed to generate selected payslips.", type: "error" });
      }
    });
  };

  // Export payroll summary to CSV
  const handleExportCSV = () => {
    const headers = [
      "Employee Name",
      "Login ID",
      "Job Position",
      "Department",
      "Payable Days",
      "Total Working Days",
      "Gross Monthly (INR)",
      "Total Deductions (INR)",
      "Net Pay (INR)",
      "Status",
    ];

    const rows = filteredEmployees.map((emp) => {
      const p = byEmployee.get(emp.id);
      return [
        `"${emp.firstName} ${emp.lastName}"`,
        `"${emp.loginId}"`,
        `"${emp.jobPosition || "-"}"`,
        `"${emp.department || "-"}"`,
        p ? p.payableDays : 0,
        p ? p.totalWorkingDays : 0,
        p ? p.grossMonthly : (emp.salary?.monthlyWage || 0),
        p ? p.totalDeductions : 0,
        p ? p.netPay : 0,
        p ? "Generated" : "Pending",
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Payroll_Summary_${periodLabel.replace(/[\s,]+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4 relative">
      {/* Action Notification Toast */}
      {actionFeedback ? (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-md animate-in fade-in slide-in-from-top-2 duration-150 ${
            actionFeedback.type === "success"
              ? "bg-present-soft border border-present/30 text-present"
              : "bg-danger-soft border border-danger/30 text-danger"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === "success" ? (
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            )}
            <span>{actionFeedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-ink-500 hover:text-ink-800"
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Control Bar: Live Search with Autocomplete, Filters, Sorting & Export */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Real-time Dynamic Search Box with Suggestions Dropdown */}
          <div ref={searchContainerRef} className="relative flex-1 min-w-[260px] max-w-md">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-ink-400">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search employee name, ID, position or department…"
                className="field pl-9 pr-8 py-2 text-xs rounded-xl shadow-xs"
                aria-label="Search employees"
              />

              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setIsSearchFocused(false);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-ink-400 hover:text-ink-700"
                  aria-label="Clear search"
                >
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              ) : null}
            </div>

            {/* Suggestions / Autocomplete Dropdown */}
            {isSearchFocused && searchQuery.trim().length > 0 ? (
              <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-line bg-surface shadow-xl animate-in fade-in zoom-in-95 duration-100">
                <div className="border-b border-line bg-brand-50/60 px-3 py-1.5 text-[11px] font-semibold text-brand-800 flex items-center justify-between">
                  <span>Search Suggestions</span>
                  <span className="text-[10px] text-ink-500 font-normal">
                    {searchSuggestions.length} found
                  </span>
                </div>

                {searchSuggestions.length > 0 ? (
                  <ul className="divide-y divide-line/60">
                    {searchSuggestions.map((emp) => {
                      const p = byEmployee.get(emp.id);
                      return (
                        <li
                          key={emp.id}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-brand-50/40 transition"
                        >
                          <div
                            onClick={() => {
                              setSearchQuery(`${emp.firstName} ${emp.lastName}`);
                              setIsSearchFocused(false);
                            }}
                            className="flex flex-1 items-center gap-2.5 cursor-pointer min-w-0"
                          >
                            <Avatar src={emp.avatar} name={`${emp.firstName} ${emp.lastName}`} size={28} />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-ink-900 truncate">
                                {emp.firstName} {emp.lastName}
                              </p>
                              <p className="text-[10px] text-ink-500 truncate">
                                {emp.loginId} · {emp.jobPosition || emp.department || "Active"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {p ? (
                              <span className="mono text-xs font-semibold text-present">
                                {formatCurrency(p.netPay)}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleGenerateSingle(emp.id, `${emp.firstName} ${emp.lastName}`)}
                                disabled={isGenerating}
                                className="btn-approve btn-sm text-[10px] py-0.5 px-2 rounded-md"
                              >
                                ⚡ Generate
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setIsSearchFocused(false);
                                setEditingEmployee(emp);
                              }}
                              className="btn-secondary btn-sm text-[10px] py-0.5 px-2 rounded-md"
                              title="Edit salary structure"
                            >
                              Edit
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-xs text-ink-500">
                    No employees matching <strong className="text-ink-800">"{searchQuery}"</strong>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Right Action Tools: Sort Dropdown & Export CSV */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 text-xs text-ink-600">
              <span className="hidden sm:inline font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="field py-1.5 px-2.5 text-xs rounded-xl bg-surface border-line"
                aria-label="Sort table"
              >
                <option value="NAME_ASC">Name (A → Z)</option>
                <option value="NAME_DESC">Name (Z → A)</option>
                <option value="NET_DESC">Highest Net Pay</option>
                <option value="NET_ASC">Lowest Net Pay</option>
                <option value="GROSS_DESC">Highest Gross Pay</option>
                <option value="DAYS_DESC">Payable Days</option>
              </select>
            </div>

            {/* CSV Export Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="btn-secondary btn-sm rounded-xl inline-flex items-center gap-1.5 text-xs shadow-xs hover:border-brand-300"
              title="Download full monthly payroll summary spreadsheet"
            >
              <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs & Result Count Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                statusFilter === "ALL"
                  ? "bg-brand-600 text-white shadow-xs"
                  : "bg-ink-100/70 text-ink-600 hover:bg-ink-200/70"
              }`}
            >
              All Employees ({employees.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("GENERATED")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                statusFilter === "GENERATED"
                  ? "bg-present text-white shadow-xs"
                  : "bg-ink-100/70 text-ink-600 hover:bg-ink-200/70"
              }`}
            >
              Generated ({generatedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("PENDING")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                statusFilter === "PENDING"
                  ? "bg-absent text-white shadow-xs"
                  : "bg-ink-100/70 text-ink-600 hover:bg-ink-200/70"
              }`}
            >
              Pending ({pendingCount})
            </button>
          </div>

          <span className="text-xs text-ink-500 font-medium">
            Showing <strong className="text-ink-800">{filteredEmployees.length}</strong> of {employees.length} employees
          </span>
        </div>
      </div>

      {/* Floating Bulk Action Bar when 1 or more employees are checked */}
      {selectedIds.size > 0 ? (
        <div className="sticky top-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-300 bg-brand-700 p-3.5 text-white shadow-xl animate-in slide-in-from-top duration-150">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
              {selectedIds.size}
            </span>
            <div>
              <p className="text-xs font-semibold">
                {selectedIds.size} {selectedIds.size === 1 ? "employee" : "employees"} selected
              </p>
              <p className="text-[11px] text-white/70">
                Run payroll generation for only these selected individuals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleGenerateSelected}
              disabled={isGenerating}
              className="rounded-lg bg-white px-4 py-1.5 text-xs font-bold text-brand-800 hover:bg-brand-50 shadow-xs transition inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Run Payroll for Selected ({selectedIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}

      {/* Main Table View */}
      {filteredEmployees.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 mb-3">
            <svg viewBox="0 0 20 20" width="22" height="22" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-ink-900">No employees found</h3>
          <p className="hint mt-1 text-xs text-ink-500">
            {searchQuery
              ? `No results match your search "${searchQuery}".`
              : "No employees match the selected filter."}
          </p>
          {(searchQuery || statusFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="btn-secondary btn-sm mt-4 text-xs rounded-xl"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrap rounded-2xl border border-line bg-surface shadow-xs overflow-hidden">
          <table className="grid-table">
            <thead>
              <tr>
                <th className="w-10 px-3 text-center">
                  <input
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-ink-300 text-brand-600 focus:ring-brand-500 cursor-pointer h-4 w-4"
                    title="Select all visible employees"
                    aria-label="Select all visible employees"
                  />
                </th>
                <th>Employee</th>
                <th>Payable Days</th>
                <th>Gross Pay</th>
                <th>Deductions</th>
                <th>Net Pay</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => {
                const payslip = byEmployee.get(employee.id);
                const salaryValues = getSalaryValues(employee);
                const breakdown = computeSalary(salaryValues);
                const isTooltipOpen = activeTooltipId === employee.id;
                const isSelected = selectedIds.has(employee.id);
                const isThisGenerating = generatingSingleId === employee.id;

                return (
                  <tr
                    key={employee.id}
                    className={`transition-colors ${
                      isSelected ? "bg-brand-50/60" : "hover:bg-brand-50/30"
                    }`}
                  >
                    {/* Checkbox Column */}
                    <td className="w-10 px-3 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(employee.id)}
                        className="rounded border-ink-300 text-brand-600 focus:ring-brand-500 cursor-pointer h-4 w-4"
                        aria-label={`Select ${employee.firstName} ${employee.lastName}`}
                      />
                    </td>

                    {/* Employee Identity */}
                    <td>
                      <Link
                        href={`/employees/${employee.id}`}
                        className="flex items-center gap-2.5 hover:text-brand-700 transition"
                      >
                        <Avatar
                          src={employee.avatar}
                          name={`${employee.firstName} ${employee.lastName}`}
                          size={32}
                        />
                        <span>
                          <span className="block font-medium text-ink-900">
                            {employee.firstName} {employee.lastName}
                          </span>
                          <span className="mono block text-[11px] text-ink-400">
                            {employee.loginId} {employee.jobPosition ? `· ${employee.jobPosition}` : ""}
                          </span>
                        </span>
                      </Link>
                    </td>

                    {payslip ? (
                      <>
                        <td className="num font-medium">
                          <span className="text-ink-800">{payslip.payableDays}</span>
                          <span className="text-ink-400"> / {payslip.totalWorkingDays}</span>
                        </td>

                        {/* Gross with popover breakdown preview */}
                        <td className="mono relative">
                          <button
                            type="button"
                            onClick={() => setActiveTooltipId(isTooltipOpen ? null : employee.id)}
                            className="font-medium text-ink-900 hover:text-brand-700 hover:underline cursor-pointer flex items-center gap-1"
                            title="Click to view component breakdown"
                          >
                            <span>{formatCurrency(payslip.grossMonthly)}</span>
                            <span className="text-[10px] text-ink-400">ℹ</span>
                          </button>

                          {/* Quick Component Breakdown Tooltip Popover */}
                          {isTooltipOpen ? (
                            <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-xl border border-line bg-surface p-3 shadow-xl text-left font-sans animate-in fade-in zoom-in-95">
                              <div className="flex items-center justify-between border-b border-line pb-1.5 mb-2">
                                <span className="text-[11px] font-bold text-ink-900">Salary Breakdown</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTooltipId(null);
                                  }}
                                  className="text-ink-400 hover:text-ink-700 text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                              <ul className="flex flex-col gap-1 text-[11px]">
                                {breakdown.components.map((c) => (
                                  <li key={c.key} className="flex justify-between text-ink-600">
                                    <span>{c.label}:</span>
                                    <span className="mono font-medium text-ink-900">{formatCurrency(c.amount)}</span>
                                  </li>
                                ))}
                                <li className="flex justify-between border-t border-line/60 pt-1 text-danger">
                                  <span>PF Employee:</span>
                                  <span className="mono font-medium">− {formatCurrency(breakdown.pfEmployee)}</span>
                                </li>
                                <li className="flex justify-between text-danger">
                                  <span>Prof. Tax:</span>
                                  <span className="mono font-medium">− {formatCurrency(breakdown.professionalTax)}</span>
                                </li>
                              </ul>
                            </div>
                          ) : null}
                        </td>

                        <td className="mono text-danger font-medium">
                          − {formatCurrency(payslip.totalDeductions)}
                        </td>

                        <td className="mono font-bold text-present">
                          {formatCurrency(payslip.netPay)}
                        </td>

                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Regenerate single payslip */}
                            <button
                              type="button"
                              onClick={() => handleGenerateSingle(employee.id, `${employee.firstName} ${employee.lastName}`)}
                              disabled={isThisGenerating || isGenerating}
                              className="btn-ghost btn-sm text-xs font-semibold text-ink-600 hover:text-brand-700 rounded-lg p-1.5"
                              title="Regenerate this employee's payslip"
                            >
                              {isThisGenerating ? (
                                <svg className="animate-spin h-3.5 w-3.5 text-brand-600" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.451a.75.75 0 000-1.5H4.5a.75.75 0 00-.75.75v3.75a.75.75 0 001.5 0v-2.146l.462.462a7 7 0 0011.712-3.138.75.75 0 00-1.412-.493zM4.688 8.576a5.5 5.5 0 019.201-2.466l.312.311h-2.451a.75.75 0 000 1.5h3.75a.75.75 0 00.75-.75V3.42a.75.75 0 00-1.5 0v2.146l-.462-.462a7 7 0 00-11.712 3.138.75.75 0 001.412.493z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>

                            <Link
                              href={`/payroll/${payslip.id}`}
                              className="btn-ghost btn-sm text-xs font-semibold text-brand-600 hover:bg-brand-50 rounded-lg"
                            >
                              View
                            </Link>

                            <button
                              type="button"
                              onClick={() => setEditingEmployee(employee)}
                              className="btn-secondary btn-sm inline-flex items-center gap-1 text-xs rounded-lg shadow-xs"
                              title="Edit salary structure in place"
                            >
                              <svg viewBox="0 0 20 20" width="13" height="13" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                              <span>Edit Structure</span>
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td colSpan={4} className="text-xs text-ink-400 italic">
                          Payslip not generated yet for this period
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Run single payslip directly */}
                            <button
                              type="button"
                              onClick={() => handleGenerateSingle(employee.id, `${employee.firstName} ${employee.lastName}`)}
                              disabled={isThisGenerating || isGenerating}
                              className="btn-approve btn-sm inline-flex items-center gap-1 text-xs rounded-lg shadow-xs"
                              title="Generate payslip for this employee only"
                            >
                              {isThisGenerating ? (
                                <>
                                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                  </svg>
                                  <span>Generating…</span>
                                </>
                              ) : (
                                <>
                                  <span>⚡</span>
                                  <span>Generate</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingEmployee(employee)}
                              className="btn-secondary btn-sm inline-flex items-center gap-1.5 text-xs rounded-lg shadow-xs"
                            >
                              <svg viewBox="0 0 20 20" width="13" height="13" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                              <span>Edit Structure</span>
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Centered Rounded-Edge Salary Structure Modal */}
      {editingEmployee ? (
        <EditSalaryModal
          employee={editingEmployee}
          initialSalary={getSalaryValues(editingEmployee)}
          isOpen={true}
          onClose={() => setEditingEmployee(null)}
          onSaved={() => {
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
