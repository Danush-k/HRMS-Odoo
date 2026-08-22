import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/ui";
import { isManager, requireUser } from "@/lib/auth";
import { format } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatCurrency, type SalaryComponent } from "@/lib/salary";

export const metadata: Metadata = { title: "Payslip" };

export default async function PayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireUser();

  const payslip = await db.payslip.findFirst({
    where: { id, employee: { companyId: viewer.companyId } },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, loginId: true, avatar: true, jobPosition: true } },
      generatedBy: { select: { firstName: true, lastName: true } },
    },
  });

  if (!payslip) notFound();
  // Same boundary as the salary it was generated from: the employee themselves, or a manager.
  if (payslip.employeeId !== viewer.id && !isManager(viewer.role)) notFound();

  const components: SalaryComponent[] = JSON.parse(payslip.componentsJson);
  const period = format(new Date(payslip.periodYear, payslip.periodMonth - 1, 1), "MMMM yyyy");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link href="/payroll" className="text-sm font-medium text-brand-600 hover:underline">
        ← Back to Payroll
      </Link>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-700 px-6 py-4 text-white">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-white/70">Payslip</p>
            <p className="text-lg font-semibold">{period}</p>
          </div>
          <Link
            href={`/employees/${payslip.employee.id}`}
            className="flex items-center gap-2.5 rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/15"
          >
            <Avatar src={payslip.employee.avatar} name={`${payslip.employee.firstName} ${payslip.employee.lastName}`} size={28} />
            <span>
              <span className="block text-sm font-medium">
                {payslip.employee.firstName} {payslip.employee.lastName}
              </span>
              <span className="mono block text-[11px] text-white/70">{payslip.employee.loginId}</span>
            </span>
          </Link>
        </div>

        <div className="grid gap-4 border-b border-line px-6 py-4 sm:grid-cols-3">
          <Detail label="Payable days" value={`${payslip.payableDays} / ${payslip.totalWorkingDays}`} />
          <Detail label="Paid leave taken" value={`${payslip.paidLeaveDays} day${payslip.paidLeaveDays === 1 ? "" : "s"}`} />
          <Detail
            label="Generated"
            value={`${format(payslip.generatedAt, "d MMM yyyy")} by ${payslip.generatedBy.firstName} ${payslip.generatedBy.lastName}`}
          />
        </div>

        <div className="px-6 py-4">
          <p className="section-title">Earnings</p>
          <ul className="mt-3 flex flex-col divide-y divide-line">
            {components.map((component) => (
              <li key={component.key} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-ink-700">{component.label}</span>
                <span className="mono font-medium text-ink-900">{formatCurrency(component.amount)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between py-2.5 text-sm font-semibold">
              <span className="text-ink-900">Gross (full month)</span>
              <span className="mono text-ink-900">{formatCurrency(payslip.grossMonthly)}</span>
            </li>
          </ul>
        </div>

        <div className="border-t border-line px-6 py-4">
          <p className="section-title">Deductions</p>
          <ul className="mt-3 flex flex-col divide-y divide-line">
            <li className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-ink-700">Provident Fund (employee)</span>
              <span className="mono font-medium text-danger">− {formatCurrency(payslip.pfEmployee)}</span>
            </li>
            <li className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-ink-700">Professional Tax</span>
              <span className="mono font-medium text-danger">− {formatCurrency(payslip.professionalTax)}</span>
            </li>
            <li className="flex items-center justify-between py-2.5 text-sm font-semibold">
              <span className="text-ink-900">Total deductions</span>
              <span className="mono text-danger">− {formatCurrency(payslip.totalDeductions)}</span>
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-between bg-brand-50 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-ink-900">Net pay for {period}</p>
            <p className="hint">
              Prorated for {payslip.payableDays} of {payslip.totalWorkingDays} working days.
            </p>
          </div>
          <p className="mono text-xl font-bold text-present">{formatCurrency(payslip.netPay)}</p>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="mt-0.5 text-sm text-ink-800">{value}</p>
    </div>
  );
}
