"use client";

import { useActionState, useState } from "react";

import { FormMessage, SubmitButton } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { allocatedBeforeFixed, computeSalary, formatCurrency, round2, type SalaryInput } from "@/lib/salary";
import { updateSalaryAction } from "@/server/actions/salary";

export type SalaryValues = SalaryInput & {
  workingDaysPerWeek: number;
  breakHours: number;
};

type Preset = {
  id: string;
  name: string;
  badge: string;
  description: string;
  values: Partial<SalaryValues>;
};

const SALARY_PRESETS: Preset[] = [
  {
    id: "standard",
    name: "Corporate Standard",
    badge: "Recommended",
    description: "50% Basic, 50% HRA, 16.67% Standard, 8.33% Bonus, 8.33% LTA, 12% PF",
    values: {
      basicPercent: 50,
      hraPercentOfBasic: 50,
      standardAllowancePercent: 16.67,
      performanceBonusPercent: 8.33,
      ltaPercent: 8.33,
      pfPercent: 12,
      professionalTax: 200,
    },
  },
  {
    id: "executive",
    name: "Executive / Variable",
    badge: "High Bonus",
    description: "45% Basic, 50% HRA, 20% Standard, 15% Bonus, 10% LTA, 12% PF",
    values: {
      basicPercent: 45,
      hraPercentOfBasic: 50,
      standardAllowancePercent: 20,
      performanceBonusPercent: 15,
      ltaPercent: 10,
      pfPercent: 12,
      professionalTax: 200,
    },
  },
  {
    id: "simple",
    name: "Simple Base + HRA",
    badge: "Fixed",
    description: "60% Basic, 40% HRA, 0% Variable / Bonus, 12% PF",
    values: {
      basicPercent: 60,
      hraPercentOfBasic: 40,
      standardAllowancePercent: 0,
      performanceBonusPercent: 0,
      ltaPercent: 0,
      pfPercent: 12,
      professionalTax: 200,
    },
  },
];

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
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const set = <K extends keyof SalaryValues>(key: K) => (next: SalaryValues[K]) => {
    setActivePreset(null);
    setValues((current) => ({ ...current, [key]: next }));
  };

  const applyPreset = (preset: Preset) => {
    setActivePreset(preset.id);
    setValues((current) => ({
      ...current,
      ...preset.values,
    }));
  };

  const resetToSaved = () => {
    setActivePreset(null);
    setValues(initial);
  };

  const applyHike = (percent: number) => {
    const nextWage = round2(values.monthlyWage * (1 + percent / 100));
    setValues((current) => ({ ...current, monthlyWage: nextWage }));
  };

  const handleAnnualChange = (annual: number) => {
    const monthly = round2(annual / 12);
    setValues((current) => ({ ...current, monthlyWage: Math.max(0, monthly) }));
  };

  const breakdown = computeSalary(values);
  const allocated = allocatedBeforeFixed(values);
  const overAllocated = allocated > values.monthlyWage;

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="employeeId" value={employeeId} />

      {canEdit ? (
        <div className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-title">Structure Presets</p>
              <p className="hint mt-0.5">Quickly apply standard corporate component allocations.</p>
            </div>
            <button
              type="button"
              onClick={resetToSaved}
              className="btn-ghost btn-sm text-ink-600 hover:text-ink-900"
            >
              Reset to saved
            </button>
          </div>

          <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
            {SALARY_PRESETS.map((preset) => {
              const isSelected = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`flex flex-col items-start justify-between rounded-lg border p-3 text-left transition ${
                    isSelected
                      ? "border-brand-600 bg-brand-50/60 shadow-xs"
                      : "border-line bg-surface hover:border-ink-300 hover:bg-brand-50/20"
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink-900">{preset.name}</span>
                    <span className={`chip text-[10px] ${isSelected ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600"}`}>
                      {preset.badge}
                    </span>
                  </div>
                  <span className="hint mt-1 text-[11px] leading-tight text-ink-500">{preset.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-5">
          {/* Wage & Hike Calculator */}
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

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <span className="text-xs text-ink-500">Annual Gross:</span>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={round2(values.monthlyWage * 12)}
                    onChange={(e) => handleAnnualChange(Number(e.target.value))}
                    disabled={!canEdit}
                    className="field mono w-32 py-1.5 text-right text-xs"
                    aria-label="Annual Gross CTC"
                  />
                  <span className="text-xs text-ink-500">/ yr</span>
                </label>
              </div>
            </div>

            {canEdit ? (
              <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
                <span className="text-xs font-medium text-ink-500">Quick Hike:</span>
                {[5, 10, 15, 20].map((hike) => (
                  <button
                    key={hike}
                    type="button"
                    onClick={() => applyHike(hike)}
                    className="btn-secondary btn-sm text-[11px]"
                    title={`Increase monthly wage by ${hike}%`}
                  >
                    +{hike}%
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Salary Components */}
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
          {/* Working Schedule */}
          <div className="card flex flex-col gap-4 p-5">
            <p className="section-title">Working Schedule</p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="block text-sm text-ink-700">Working days in a week</span>
                {canEdit ? (
                  <div className="mt-1 flex gap-1.5">
                    {[5, 6].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => set("workingDaysPerWeek")(days)}
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          values.workingDaysPerWeek === days
                            ? "bg-brand-600 text-white"
                            : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                        }`}
                      >
                        {days} Days
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <NumberCell
                name="workingDaysPerWeek"
                value={values.workingDaysPerWeek}
                onChange={set("workingDaysPerWeek")}
                disabled={!canEdit}
                step="1"
                width="w-20"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="block text-sm text-ink-700">Break time</span>
                {canEdit ? (
                  <div className="mt-1 flex gap-1.5">
                    {[0.5, 1, 1.5].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => set("breakHours")(hrs)}
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          values.breakHours === hrs
                            ? "bg-brand-600 text-white"
                            : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                        }`}
                      >
                        {hrs}h
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <NumberCell
                name="breakHours"
                value={values.breakHours}
                onChange={set("breakHours")}
                disabled={!canEdit}
                suffix="hrs"
                step="0.25"
                width="w-20"
              />
            </div>
            <p className="hint -mt-1">Deducted from clocked time before it counts as hours worked.</p>
          </div>

          {/* PF Contribution */}
          <div className="card flex flex-col gap-4 p-5">
            <p className="section-title">Provident Fund Contribution</p>
            <p className="hint -mt-2">Calculated on the basic salary.</p>

            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="block text-sm text-ink-700">Rate</span>
                {canEdit ? (
                  <div className="mt-1 flex gap-1.5">
                    {[0, 10, 12].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => set("pfPercent")(rate)}
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          values.pfPercent === rate
                            ? "bg-brand-600 text-white"
                            : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <NumberCell
                name="pfPercent"
                value={values.pfPercent}
                onChange={set("pfPercent")}
                disabled={!canEdit}
                suffix="%"
                width="w-20"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-700">Employee Contribution</span>
              <span className="mono font-semibold text-ink-900">{formatCurrency(breakdown.pfEmployee)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-700">Employer Contribution</span>
              <span className="mono font-semibold text-ink-900">{formatCurrency(breakdown.pfEmployer)}</span>
            </div>
          </div>

          {/* Tax Deductions */}
          <div className="card flex flex-col gap-4 p-5">
            <p className="section-title">Tax Deductions</p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="block text-sm text-ink-700">Professional Tax</span>
                {canEdit ? (
                  <div className="mt-1 flex gap-1.5">
                    {[0, 200].map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => set("professionalTax")(pt)}
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          values.professionalTax === pt
                            ? "bg-brand-600 text-white"
                            : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                        }`}
                      >
                        ₹{pt}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <NumberCell
                name="professionalTax"
                value={values.professionalTax}
                onChange={set("professionalTax")}
                disabled={!canEdit}
                suffix="/ month"
                width="w-24"
              />
            </div>
            <p className="hint">Deducted from the gross salary.</p>
          </div>

          {/* Monthly Summary */}
          <div className="card overflow-hidden">
            <div className="bg-brand-700 px-5 py-3 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-white/70">Monthly Summary</p>
            </div>
            <dl className="flex flex-col divide-y divide-line px-5">
              <div className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-ink-700">Gross Monthly</dt>
                <dd className="mono font-semibold text-ink-900">{formatCurrency(breakdown.grossMonthly)}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-ink-700">Total Deductions</dt>
                <dd className="mono font-semibold text-danger">− {formatCurrency(breakdown.totalDeductions)}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5 text-sm">
                <dt className="font-semibold text-ink-900">Net Pay (Take-home)</dt>
                <dd className="mono text-base font-bold text-present">{formatCurrency(breakdown.netMonthly)}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5 text-xs">
                <dt className="text-ink-500">Cost to Company (CTC)</dt>
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
