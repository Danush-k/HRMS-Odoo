"use client";

import { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/salary";
import { exportAttendanceCsvAction, exportPayrollCsvAction, exportTimeOffCsvAction } from "@/server/actions/reports";

type DepartmentPayroll = {
  department: string;
  headcount: number;
  grossTotal: number;
  netTotal: number;
  deductionsTotal: number;
};

type DepartmentAttendance = {
  department: string;
  totalCheckIns: number;
  presentDays: number;
  halfDays: number;
  leaveDays: number;
  absentDays: number;
  attendanceRate: number;
};

type LeaveTypeDistribution = {
  name: string;
  code: string;
  isPaid: boolean;
  totalDays: number;
  requestCount: number;
};

type ReportsClientViewProps = {
  selectedYear: number;
  selectedMonth: number;
  availableMonths: { label: string; year: number; month: number }[];
  overview: {
    totalEmployees: number;
    activeEmployees: number;
    totalPayrollGross: number;
    totalPayrollNet: number;
    totalPayrollDeductions: number;
    overallAttendanceRate: number;
    totalLeaveRequests: number;
    approvedLeaves: number;
    pendingLeaves: number;
    rejectedLeaves: number;
  };
  departmentPayrolls: DepartmentPayroll[];
  departmentAttendances: DepartmentAttendance[];
  leaveTypeDistributions: LeaveTypeDistribution[];
};

export function ReportsClientView({
  selectedYear,
  selectedMonth,
  availableMonths,
  overview,
  departmentPayrolls,
  departmentAttendances,
  leaveTypeDistributions,
}: ReportsClientViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "payroll" | "attendance" | "timeoff">("overview");
  const [isPending, startTransition] = useTransition();
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [y, m] = e.target.value.split("-").map(Number);
    window.location.href = `/reports?year=${y}&month=${m}`;
  };

  const triggerCsvDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPayroll = () => {
    startTransition(async () => {
      setDownloadMsg("Generating Payroll CSV...");
      const res = await exportPayrollCsvAction(selectedYear, selectedMonth);
      if (res.ok) {
        triggerCsvDownload(res.filename, res.content);
        setDownloadMsg(`Downloaded ${res.filename}`);
      } else {
        setDownloadMsg("Export failed.");
      }
      setTimeout(() => setDownloadMsg(null), 3000);
    });
  };

  const handleDownloadAttendance = () => {
    startTransition(async () => {
      setDownloadMsg("Generating Attendance CSV...");
      const res = await exportAttendanceCsvAction(selectedYear, selectedMonth);
      if (res.ok) {
        triggerCsvDownload(res.filename, res.content);
        setDownloadMsg(`Downloaded ${res.filename}`);
      } else {
        setDownloadMsg("Export failed.");
      }
      setTimeout(() => setDownloadMsg(null), 3000);
    });
  };

  const handleDownloadTimeOff = () => {
    startTransition(async () => {
      setDownloadMsg("Generating Time Off CSV...");
      const res = await exportTimeOffCsvAction(selectedYear);
      if (res.ok) {
        triggerCsvDownload(res.filename, res.content);
        setDownloadMsg(`Downloaded ${res.filename}`);
      } else {
        setDownloadMsg("Export failed.");
      }
      setTimeout(() => setDownloadMsg(null), 3000);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-line shadow-xs">
        <div>
          <span className="badge bg-brand-50 text-brand-700 font-semibold mb-1">Live DB Metrics</span>
          <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight">Analytics & Reports Dashboard</h1>
          <p className="text-xs text-ink-500 mt-0.5">Real-time organizational insights computed directly from actual system records.</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-ink-700">Period:</label>
          <select
            value={`${selectedYear}-${selectedMonth}`}
            onChange={handleMonthChange}
            className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm font-medium text-ink-800 shadow-2xs focus:border-brand-500 focus:outline-none"
          >
            {availableMonths.map((m) => (
              <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {downloadMsg ? (
        <div className="rounded-xl bg-brand-50 border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-800 animate-fade-in flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-brand-600 animate-pulse" />
          {downloadMsg}
        </div>
      ) : null}

      {/* KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5 border-l-4 border-l-brand-600">
          <p className="text-xs font-bold text-ink-500 uppercase tracking-wider">Total Headcount</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-ink-900">{overview.totalEmployees}</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {overview.activeEmployees} Active
            </span>
          </div>
          <p className="mt-1 text-[11px] text-ink-400">Total registered staff in company</p>
        </div>

        <div className="card p-5 border-l-4 border-l-emerald-600">
          <p className="text-xs font-bold text-ink-500 uppercase tracking-wider">Monthly Payroll Spend</p>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-800 mono">{formatCurrency(overview.totalPayrollGross)}</span>
          </div>
          <p className="mt-1 text-[11px] text-ink-500">
            Net Paid: <strong className="mono text-ink-800">{formatCurrency(overview.totalPayrollNet)}</strong>
          </p>
        </div>

        <div className="card p-5 border-l-4 border-l-sky-600">
          <p className="text-xs font-bold text-ink-500 uppercase tracking-wider">Attendance Rate</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-sky-800">{overview.overallAttendanceRate}%</span>
            <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">Monthly Avg</span>
          </div>
          <div className="w-full bg-line rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-sky-600 h-1.5 rounded-full" style={{ width: `${Math.min(overview.overallAttendanceRate, 100)}%` }} />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-purple-600">
          <p className="text-xs font-bold text-ink-500 uppercase tracking-wider">Time Off Requests</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-900">{overview.totalLeaveRequests}</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {overview.approvedLeaves} Approved
            </span>
          </div>
          <p className="mt-1 text-[11px] text-ink-400">
            Pending: <strong className="text-amber-700">{overview.pendingLeaves}</strong> · Rejected: <strong className="text-rose-700">{overview.rejectedLeaves}</strong>
          </p>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-1">
        <nav className="flex gap-2" aria-label="Tabs">
          {[
            { id: "overview", label: "Executive Overview" },
            { id: "payroll", label: "Payroll Breakdown" },
            { id: "attendance", label: "Attendance Metrics" },
            { id: "timeoff", label: "Leave Analytics" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                activeTab === tab.id
                  ? "bg-brand-600 text-white shadow-2xs"
                  : "text-ink-600 hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* CSV Export Action Group */}
        <div className="flex items-center gap-2">
          {activeTab === "payroll" ? (
            <button onClick={handleDownloadPayroll} disabled={isPending} className="btn-secondary btn-sm gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export Payroll CSV
            </button>
          ) : activeTab === "attendance" ? (
            <button onClick={handleDownloadAttendance} disabled={isPending} className="btn-secondary btn-sm gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export Attendance CSV
            </button>
          ) : activeTab === "timeoff" ? (
            <button onClick={handleDownloadTimeOff} disabled={isPending} className="btn-secondary btn-sm gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export Time Off CSV
            </button>
          ) : (
            <button onClick={handleDownloadPayroll} disabled={isPending} className="btn-secondary btn-sm gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download Full Report
            </button>
          )}
        </div>
      </div>

      {/* Tab Content 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Department Payroll Share */}
          <div className="card p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-ink-900">Department Payroll Share</h3>
              <p className="text-xs text-ink-500">Gross salary allocation across organizational departments.</p>
            </div>

            <div className="flex flex-col gap-4 mt-2">
              {departmentPayrolls.map((dept) => {
                const percent = overview.totalPayrollGross > 0 ? Math.round((dept.grossTotal / overview.totalPayrollGross) * 100) : 0;
                return (
                  <div key={dept.department} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold text-ink-800">
                      <span>{dept.department} ({dept.headcount} staff)</span>
                      <span className="mono font-bold text-emerald-700">{formatCurrency(dept.grossTotal)} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-line/60 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-600 h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Department Attendance Compliance */}
          <div className="card p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-ink-900">Attendance Compliance Rate</h3>
              <p className="text-xs text-ink-500">Percentage of expected working days logged per department.</p>
            </div>

            <div className="flex flex-col gap-4 mt-2">
              {departmentAttendances.map((dept) => (
                <div key={dept.department} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-semibold text-ink-800">
                    <span>{dept.department}</span>
                    <span className="mono font-bold text-sky-700">{dept.attendanceRate}% Rate</span>
                  </div>
                  <div className="w-full bg-line/60 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        dept.attendanceRate >= 85 ? "bg-emerald-600" : dept.attendanceRate >= 70 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${dept.attendanceRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Payroll Breakdown */}
      {activeTab === "payroll" && (
        <div className="card p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
            <div>
              <h3 className="text-base font-bold text-ink-900">Department Payroll Analytics</h3>
              <p className="text-xs text-ink-500">Full expenditure, employee count, and average wage breakdown by department.</p>
            </div>
            <button onClick={handleDownloadPayroll} className="btn-primary btn-sm">
              Download Payroll CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-ink-50/50 text-xs uppercase font-bold text-ink-600">
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Staff Count</th>
                  <th className="py-3 px-4">Gross Total</th>
                  <th className="py-3 px-4">Deductions Total</th>
                  <th className="py-3 px-4">Net Total Paid</th>
                  <th className="py-3 px-4">Avg Wage / Employee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {departmentPayrolls.map((dept) => {
                  const avg = dept.headcount > 0 ? Math.round(dept.grossTotal / dept.headcount) : 0;
                  return (
                    <tr key={dept.department} className="hover:bg-brand-50/30 transition">
                      <td className="py-3.5 px-4 font-bold text-ink-900">{dept.department}</td>
                      <td className="py-3.5 px-4 font-semibold text-ink-700">{dept.headcount}</td>
                      <td className="py-3.5 px-4 mono text-emerald-700 font-bold">{formatCurrency(dept.grossTotal)}</td>
                      <td className="py-3.5 px-4 mono text-danger font-medium">− {formatCurrency(dept.deductionsTotal)}</td>
                      <td className="py-3.5 px-4 mono text-brand-700 font-extrabold">{formatCurrency(dept.netTotal)}</td>
                      <td className="py-3.5 px-4 mono font-semibold text-ink-800">{formatCurrency(avg)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 3: Attendance Metrics */}
      {activeTab === "attendance" && (
        <div className="card p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
            <div>
              <h3 className="text-base font-bold text-ink-900">Attendance & Punctuality Breakdown</h3>
              <p className="text-xs text-ink-500">Present, half-day, on-leave, and absent log counts by department.</p>
            </div>
            <button onClick={handleDownloadAttendance} className="btn-primary btn-sm">
              Download Attendance CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-ink-50/50 text-xs uppercase font-bold text-ink-600">
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Present Logs</th>
                  <th className="py-3 px-4">Half-Day Logs</th>
                  <th className="py-3 px-4">On-Leave Logs</th>
                  <th className="py-3 px-4">Compliance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {departmentAttendances.map((dept) => (
                  <tr key={dept.department} className="hover:bg-brand-50/30 transition">
                    <td className="py-3.5 px-4 font-bold text-ink-900">{dept.department}</td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-700">{dept.presentDays} days</td>
                    <td className="py-3.5 px-4 font-semibold text-amber-700">{dept.halfDays} days</td>
                    <td className="py-3.5 px-4 font-semibold text-purple-700">{dept.leaveDays} days</td>
                    <td className="py-3.5 px-4 font-bold text-sky-800">{dept.attendanceRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 4: Leave Analytics */}
      {activeTab === "timeoff" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Leave Type Distribution */}
          <div className="card p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink-900">Leave Type Usage Distribution</h3>
                <p className="text-xs text-ink-500">Days taken per leave policy category.</p>
              </div>
              <button onClick={handleDownloadTimeOff} className="btn-secondary btn-sm">
                CSV Export
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {leaveTypeDistributions.map((type) => (
                <div key={type.code} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-semibold text-ink-800">
                    <span>
                      {type.name} ({type.code}) {type.isPaid ? "· Paid" : "· Unpaid"}
                    </span>
                    <span className="mono font-bold text-purple-700">
                      {type.totalDays} Days ({type.requestCount} requests)
                    </span>
                  </div>
                  <div className="w-full bg-line/60 rounded-full h-2 overflow-hidden">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(type.totalDays * 10, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Request Status Breakdown */}
          <div className="card p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-ink-900">Request Review Status Breakdown</h3>
              <p className="text-xs text-ink-500">Ratio of approved vs pending vs rejected leave applications.</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center my-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <span className="block text-2xl font-black text-emerald-800">{overview.approvedLeaves}</span>
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Approved</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <span className="block text-2xl font-black text-amber-800">{overview.pendingLeaves}</span>
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending</span>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                <span className="block text-2xl font-black text-rose-800">{overview.rejectedLeaves}</span>
                <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Rejected</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
