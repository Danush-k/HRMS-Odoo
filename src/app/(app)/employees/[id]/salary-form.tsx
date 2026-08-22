"use client";

import { useActionState, useState } from "react";

import { FormMessage, SubmitButton } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { allocatedBeforeFixed, computeSalary, formatCurrency, type SalaryInput } from "@/lib/salary";
import { updateSalaryAction } from "@/server/actions/salary";

export type SalaryValues = SalaryInput & {
  workingDaysPerWeek: number;
  breakHours: number;
};

function NumberCell({
  name,
  value,
  onChange,
  disabled,
  suffix,
  step = "0.01",
  width = "w-28",
}: {
  name: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
  suffix?: string;
  step?: string;
  width?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        name={name}
        type="number"
        step={step}
        min="0"
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        className={`field mono ${width} py-1.5 text-right text-sm`}
        aria-label={name}
      />
      {suffix ? <span className="text-xs text-ink-500">{suffix}</span> : null}
    </span>
  );
}

export function SalaryForm({
  employeeId,
  initial,
  canEdit,
}: {
  employeeId: string;
  initial: SalaryValues;
  canEdit: boolean;
}) {
  const [state, action] = useActionState(updateSalaryAction, idle);
  const [values, setValues] = useState<SalaryValues>(initial);

  const set = <K extends keyof SalaryValues>(key: K) => (next: SalaryValues[K]) =>
    setValues((current) => ({ ...current, [key]: next }));

  const breakdown = computeSalary(values);
  const allocated = allocatedBeforeFixed(values);
  const overAllocated = allocated > values.monthlyWage;

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="employeeId" value={employeeId} />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-5">
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <label className="flex items-center gap-3">
                <span className="text-sm font-semibold text-ink-800">Monthly Wage</span>
                <NumberCell
                  name="monthlyWage"
                  value={values.monthlyWage}
                  onChange={set("monthlyWage")}
                  disabled={!canEdit}
                  suffix="/ month"
                  width="w-36"
                />
              </label>
              <div className="text-right">
                <p className="label">Yearly Wage</p>
                <p className="mono text-lg font-semibold text-brand-700">{formatCurrency(breakdown.yearlyWage)}</p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <p className="section-title">Salary Components</p>
            <p className="hint mt-1">
              Amounts are derived from the wage. Fixed Allowance balances the structure so the components always total
              exactly the defined wage.
            </p>
            {overAllocated ? (
              <p className="mt-3 rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
                Basic, HRA, Standard Allowance, Bonus and LTA add up to {formatCurrency(allocated)} — more than the{" "}
                {formatCurrency(values.monthlyWage)} wage. Fixed Allowance has nothing left to balance with. Lower a
                percentage before saving.
              </p>
            ) : null}

            <ul className="mt-4 flex flex-col divide-y divide-line">
              {breakdown.components.map((component) => {
                const editableKey: Record<string, keyof SalaryValues | undefined> = {
                  basic: "basicPercent",
                  hra: "hraPercentOfBasic",
                  standard: "standardAllowancePercent",
                  bonus: "performanceBonusPercent",
                  lta: "ltaPercent",
                  fixed: undefined,
                };
                const key = editableKey[component.key];

                return (
                  <li key={component.key} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-[200px] flex-1">
                      <p className="text-sm font-medium text-ink-900">{component.label}</p>
                      <p className="hint mt-0.5 max-w-md">{component.description}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="mono w-32 text-right text-sm font-semibold text-ink-900">
                        {formatCurrency(component.amount)}
                      </span>
                      {key ? (
                        <NumberCell
                          name={key}
                          value={values[key] as number}
                          onChange={set(key) as (v: number) => void}
                          disabled={!canEdit}
                          suffix={component.basis === "basic" ? "% of basic" : "% of wage"}
                          width="w-20"
                        />
                      ) : (
                        <span className="w-[152px] text-right text-xs text-ink-500">
                          {component.percent}% of wage
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="card flex flex-col gap-4 p-5">
            <p className="section-title">Working Schedule</p>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink-700">Working days in a week</span>
              <NumberCell
                name="workingDaysPerWeek"
                value={values.workingDaysPerWeek}
                onChange={set("workingDaysPerWeek")}
                disabled={!canEdit}
                step="1"
                width="w-20"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink-700">Break time</span>
              <NumberCell
                name="breakHours"
                value={values.breakHours}
                onChange={set("breakHours")}
                disabled={!canEdit}
                suffix="hrs"
                step="0.25"
                width="w-20"
              />
            </label>
            <p className="hint -mt-1">Deducted from clocked time before it counts as hours worked.</p>
          </div>

          <div className="card flex flex-col gap-4 p-5">
            <p className="section-title">Provident Fund Contribution</p>
            <p className="hint -mt-2">Calculated on the basic salary.</p>

            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink-700">Rate</span>
              <NumberCell
                name="pfPercent"
                value={values.pfPercent}
                onChange={set("pfPercent")}
                disabled={!canEdit}
                suffix="%"
                width="w-20"
              />
            </label>

            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-700">Employee</span>
              <span className="mono font-semibold text-ink-900">{formatCurrency(breakdown.pfEmployee)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-700">Employer</span>
              <span className="mono font-semibold text-ink-900">{formatCurrency(breakdown.pfEmployer)}</span>
            </div>
          </div>

          <div className="card flex flex-col gap-4 p-5">
            <p className="section-title">Tax Deductions</p>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink-700">Professional Tax</span>
              <NumberCell
                name="professionalTax"
                value={values.professionalTax}
                onChange={set("professionalTax")}
                disabled={!canEdit}
                suffix="/ month"
                width="w-24"
              />
            </label>
            <p className="hint">Deducted from the gross salary.</p>
          </div>

          <div className="card overflow-hidden">
            <div className="bg-brand-700 px-5 py-3 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-white/70">Monthly Summary</p>
            </div>
            <dl className="flex flex-col divide-y divide-line px-5">
              <div className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-ink-700">Gross</dt>
                <dd className="mono font-semibold text-ink-900">{formatCurrency(breakdown.grossMonthly)}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-ink-700">Deductions</dt>
                <dd className="mono font-semibold text-danger">− {formatCurrency(breakdown.totalDeductions)}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5 text-sm">
                <dt className="font-semibold text-ink-900">Net pay</dt>
                <dd className="mono text-base font-bold text-present">{formatCurrency(breakdown.netMonthly)}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5 text-xs">
                <dt className="text-ink-500">Cost to company</dt>
                <dd className="mono text-ink-700">{formatCurrency(breakdown.ctcMonthly)} / month</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingLabel="Saving…" disabled={overAllocated}>
            Save salary structure
          </SubmitButton>
          <div className="flex-1">
            <FormMessage state={state} />
          </div>
        </div>
      ) : (
        <p className="rounded-md border border-line bg-brand-50 px-3 py-2 text-xs text-brand-700">
          Your salary is shown for reference and cannot be edited here. Contact your HR officer about any change.
        </p>
      )}
    </form>
  );
}
