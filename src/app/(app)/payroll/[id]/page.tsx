import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/ui";
import { isManager, requireUser } from "@/lib/auth";
import { format } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatCurrency, type SalaryComponent } from "@/lib/salary";
import { BackToPayrollButton, DownloadPayslipPdfButton } from "./payslip-pdf-button";

export default async function PayslipPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ download?: string }>;
}) {
  const { id } = await params;
  const sParams = await searchParams;
  const shouldAutoDownload = sParams.download === "true";
  const viewer = await requireUser();
  const company = viewer.company;

  const payslip = await db.payslip.findFirst({
    where: { id, employee: { companyId: viewer.companyId } },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          loginId: true,
          avatar: true,
          jobPosition: true,
          department: true,
        },
      },
      generatedBy: { select: { firstName: true, lastName: true } },
    },
  });

  if (!payslip) notFound();
  if (payslip.employeeId !== viewer.id && !isManager(viewer.role)) notFound();

  const components: SalaryComponent[] = JSON.parse(payslip.componentsJson);
  const period = format(new Date(payslip.periodYear, payslip.periodMonth - 1, 1), "MMMM yyyy");

  const pdfData = {
    companyName: company.name,
    companyLogo: company.logo,
    employeeName: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
    employeeLoginId: payslip.employee.loginId,
    jobPosition: payslip.employee.jobPosition,
    department: payslip.employee.department,
    period,
    payableDays: payslip.payableDays,
    totalWorkingDays: payslip.totalWorkingDays,
    generatedDate: format(payslip.generatedAt, "d MMM yyyy"),
    generatedByName: `${payslip.generatedBy.firstName} ${payslip.generatedBy.lastName}`,
    components: components.map((c) => ({ label: c.label, amount: c.amount })),
    grossMonthly: payslip.grossMonthly,
    pfEmployee: payslip.pfEmployee,
    professionalTax: payslip.professionalTax,
    totalDeductions: payslip.totalDeductions,
    netPay: payslip.netPay,
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <BackToPayrollButton />
        <DownloadPayslipPdfButton data={pdfData} autoDownload={shouldAutoDownload} />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-700 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            {company.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo} alt="" className="h-8 w-8 rounded bg-white p-0.5 object-cover" />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded bg-white/20 text-sm font-bold">
                {company.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-sm font-semibold">{company.name}</p>
              <p className="text-[11px] font-medium text-white/80">Payslip — {period}</p>
            </div>
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
          <p className="section-title text-emerald-800">Earnings</p>
          <ul className="mt-3 flex flex-col divide-y divide-line">
            {components.map((component) => (
              <li key={component.key} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-ink-700">{component.label}</span>
                <span className="mono font-medium text-emerald-700">+ {formatCurrency(component.amount)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between py-2.5 text-sm font-semibold border-t border-line">
              <span className="text-ink-900">Gross (full month)</span>
              <span className="mono text-emerald-700 font-bold">{formatCurrency(payslip.grossMonthly)}</span>
            </li>
          </ul>
        </div>

        <div className="border-t border-line px-6 py-4">
          <p className="section-title text-danger">Deductions</p>
          <ul className="mt-3 flex flex-col divide-y divide-line">
            <li className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-ink-700">Provident Fund (employee)</span>
              <span className="mono font-medium text-danger">− {formatCurrency(payslip.pfEmployee)}</span>
            </li>
            <li className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-ink-700">Professional Tax</span>
              <span className="mono font-medium text-danger">− {formatCurrency(payslip.professionalTax)}</span>
            </li>
            <li className="flex items-center justify-between py-2.5 text-sm font-semibold border-t border-line">
              <span className="text-ink-900">Total deductions</span>
              <span className="mono text-danger font-bold">− {formatCurrency(payslip.totalDeductions)}</span>
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-between bg-brand-50 px-6 py-4">
          <div>
            <p className="text-xs font-semibold text-brand-700 uppercase tracking-wider">Net Payable</p>
            <p className="text-xs text-ink-500">Gross minus deductions for this pay period</p>
          </div>
          <span className="mono text-2xl font-extrabold text-brand-700">{formatCurrency(payslip.netPay)}</span>
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
