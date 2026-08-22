"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditSalaryDrawer, type SalaryValues } from "@/components/edit-salary-drawer";

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

export function PayslipHeaderActions({
  employee,
}: {
  employee: {
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
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const initialSalary: SalaryValues = employee.salary
    ? {
        monthlyWage: employee.salary.monthlyWage,
        workingDaysPerWeek: employee.salary.workingDaysPerWeek,
        breakHours: employee.salary.breakHours,
        basicPercent: employee.salary.basicPercent,
        hraPercentOfBasic: employee.salary.hraPercentOfBasic,
        standardAllowancePercent: employee.salary.standardAllowancePercent,
        performanceBonusPercent: employee.salary.performanceBonusPercent,
        ltaPercent: employee.salary.ltaPercent,
        pfPercent: employee.salary.pfPercent,
        professionalTax: employee.salary.professionalTax,
      }
    : DEFAULT_SALARY;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-secondary btn-sm inline-flex items-center gap-1.5 shadow-xs"
      >
        <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
        Edit Salary Structure
      </button>

      <EditSalaryDrawer
        employee={employee}
        initialSalary={initialSalary}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSaved={() => {
          router.refresh();
        }}
      />
    </>
  );
}
