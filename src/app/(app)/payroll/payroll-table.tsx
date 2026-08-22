"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { formatCurrency } from "@/lib/salary";
import { EditSalaryDrawer, type SalaryValues } from "@/components/edit-salary-drawer";

export type PayrollEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  loginId: string;
  avatar: string | null;
  jobPosition: string | null;
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

export function PayrollTable({
  employees,
  payslips,
}: {
  employees: PayrollEmployee[];
  payslips: PayrollPayslip[];
}) {
  const router = useRouter();
  const byEmployee = new Map(payslips.map((p) => [p.employeeId, p]));

  const [editingEmployee, setEditingEmployee] = useState<PayrollEmployee | null>(null);

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

  return (
    <>
      <div className="table-wrap">
        <table className="grid-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Payable days</th>
              <th>Gross</th>
              <th>Deductions</th>
              <th>Net pay</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const payslip = byEmployee.get(employee.id);
              return (
                <tr key={employee.id}>
                  <td>
                    <Link
                      href={`/employees/${employee.id}`}
                      className="flex items-center gap-2.5 hover:text-brand-700 transition"
                    >
                      <Avatar
                        src={employee.avatar}
                        name={`${employee.firstName} ${employee.lastName}`}
                        size={28}
                      />
                      <span>
                        <span className="block font-medium">
                          {employee.firstName} {employee.lastName}
                        </span>
                        <span className="mono block text-[11px] text-ink-400">{employee.loginId}</span>
                      </span>
                    </Link>
                  </td>

                  {payslip ? (
                    <>
                      <td className="num">
                        {payslip.payableDays} / {payslip.totalWorkingDays}
                      </td>
                      <td className="mono">{formatCurrency(payslip.grossMonthly)}</td>
                      <td className="mono text-danger">− {formatCurrency(payslip.totalDeductions)}</td>
                      <td className="mono font-semibold text-present">{formatCurrency(payslip.netPay)}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/payroll/${payslip.id}`}
                            className="btn-ghost btn-sm text-xs font-medium text-brand-600 hover:bg-brand-50"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => setEditingEmployee(employee)}
                            className="btn-secondary btn-sm inline-flex items-center gap-1 text-xs"
                            title="Edit salary structure in place"
                          >
                            <svg viewBox="0 0 20 20" width="13" height="13" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                            Edit Structure
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td colSpan={4} className="text-sm text-ink-400">
                        Not yet generated
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => setEditingEmployee(employee)}
                          className="btn-secondary btn-sm inline-flex items-center gap-1.5 text-xs"
                        >
                          <svg viewBox="0 0 20 20" width="13" height="13" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          Set up salary
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingEmployee ? (
        <EditSalaryDrawer
          employee={editingEmployee}
          initialSalary={getSalaryValues(editingEmployee)}
          isOpen={true}
          onClose={() => setEditingEmployee(null)}
          onSaved={() => {
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
