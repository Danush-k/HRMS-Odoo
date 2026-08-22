"use client";

import { useActionState, useEffect, useState } from "react";

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
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setValues(initial);
  }, [initial]);

  useEffect(() => {
    if (state.ok) {
      setIsEditing(false);
    }
  }, [state]);

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
    setIsEditing(false);
  };

  const applyHike = (percent: number) => {
    const nextWage = Math.round(values.monthlyWage * (1 + percent / 100));
    setValues((current) => ({ ...current, monthlyWage: nextWage }));
  };

  const handleAnnualChange = (annual: number) => {
    const monthly = Math.round(annual / 12);
    setValues((current) => ({ ...current, monthlyWage: Math.max(0, monthly) }));
  };

  const breakdown = computeSalary(values);
  const allocated = allocatedBeforeFixed(values);
  const overAllocated = allocated > values.monthlyWage;

  const getComponent = (key: string) => breakdown.components.find((c) => c.key === key)?.amount ?? 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Section Header with Read-Only vs Edit Toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-line/70">
        <div>
          <h2 className="text-base font-bold text-ink-900">Salary Structure & Compensation</h2>
          <p className="text-xs text-ink-500">Gross wages, allowances, statutory PF contributions, and take-home pay.</p>
        </div>

        {canEdit ? (
          <div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetToSaved}
                  className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-ink-50 active:scale-95 transition"
                >
                  Cancel
                </button>
                <SubmitButton
                  form="salary-structure-form"
                  pendingLabel="Saving…"
                  disabled={overAllocated}
                  className="btn-primary text-xs px-3.5 py-1.5 shadow-xs active:scale-95 transition"
                >
                  Save
                </SubmitButton>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 active:scale-95 transition"
              >
                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Edit
              </button>
            )}
          </div>
        ) : null}
      </div>

      <FormMessage state={state} />

      {!isEditing ? (
        /* Read-Only Mode */
        <div className="flex flex-col gap-6">
          {/* Top KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-4 shadow-3xs">
              <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">Annual Gross CTC</span>
              <p className="mt-1 text-xl font-bold text-ink-900 mono">{formatCurrency(breakdown.yearlyWage)}</p>
              <span className="text-[11px] text-ink-400">Total yearly compensation</span>
            </div>

            <div className="card p-4 shadow-3xs">
              <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">Monthly Gross</span>
              <p className="mt-1 text-xl font-bold text-brand-700 mono">{formatCurrency(breakdown.grossMonthly)}</p>
              <span className="text-[11px] text-ink-400">Before deductions</span>
            </div>

            <div className="card p-4 shadow-3xs">
              <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">Monthly Deductions</span>
              <p className="mt-1 text-xl font-bold text-danger mono">{formatCurrency(breakdown.totalDeductions)}</p>
              <span className="text-[11px] text-ink-400">PF + Professional Tax</span>
            </div>

            <div className="card p-4 shadow-3xs bg-gradient-to-br from-emerald-50/50 via-surface to-emerald-50/20 border-emerald-200">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Net Take-Home Pay</span>
              <p className="mt-1 text-xl font-bold text-emerald-700 mono">{formatCurrency(breakdown.netMonthly)}</p>
              <span className="text-[11px] text-emerald-600 font-medium">Estimated in-hand monthly</span>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-5 shadow-xs flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500 border-b border-line/60 pb-2">
                Earnings & Allowances Breakdown
              </h3>
              <dl className="flex flex-col divide-y divide-line text-sm">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-ink-700">Basic Salary ({values.basicPercent}%)</dt>
                  <dd className="font-semibold text-ink-900 mono">{formatCurrency(breakdown.basic)}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-ink-700">House Rent Allowance (HRA)</dt>
                  <dd className="font-semibold text-ink-900 mono">{formatCurrency(getComponent("hra"))}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-ink-700">Standard Allowance</dt>
                  <dd className="font-semibold text-ink-900 mono">{formatCurrency(getComponent("standard"))}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-ink-700">Performance Bonus</dt>
                  <dd className="font-semibold text-ink-900 mono">{formatCurrency(getComponent("bonus"))}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-ink-700">Leave Travel Allowance (LTA)</dt>
                  <dd className="font-semibold text-ink-900 mono">{formatCurrency(getComponent("lta"))}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-ink-700">Fixed / Special Allowance</dt>
                  <dd className="font-semibold text-ink-900 mono">{formatCurrency(getComponent("fixed"))}</dd>
                </div>
              </dl>
            </div>

            <div className="card p-5 shadow-xs flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500 border-b border-line/60 pb-2">
                Statutory Deductions & Schedule
              </h3>
              <dl className="flex flex-col divide-y divide-line text-sm">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-ink-700">Provident Fund Rate</dt>
                  <dd className="font-semibold text-ink-900 mono">{values.pfPercent}%</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-ink-700">Employee PF Contribution</dt>
                  <dd className="font-semibold text-danger mono">− {formatCurrency(breakdown.pfEmployee)}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-ink-700">Employer PF Contribution</dt>
                  <dd className="font-semibold text-ink-900 mono">{formatCurrency(breakdown.pfEmployer)}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-ink-700">Professional Tax</dt>
                  <dd className="font-semibold text-danger mono">− {formatCurrency(values.professionalTax)}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-ink-700">Working Schedule</dt>
                  <dd className="font-semibold text-ink-900">{values.workingDaysPerWeek} days / week · {values.breakHours}h daily break</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <form id="salary-structure-form" action={action} className="flex flex-col gap-5">
          <input type="hidden" name="employeeId" value={employeeId} />

          {/* Structure Presets */}
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
                        : "border-line bg-surface hover:border-brand-300 hover:bg-canvas/50"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink-900">{preset.name}</span>
                      <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-800">
                        {preset.badge}
                      </span>
                    </div>
                    <span className="mt-1 text-[11px] text-ink-500 leading-tight">{preset.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Grid: Wage Inputs + Breakdown */}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="flex flex-col gap-5 lg:col-span-2">
              {/* Gross Wage Card */}
              <div className="card flex flex-col gap-4 p-5">
                <p className="section-title">Gross Wage</p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="monthlyWage">
                      Monthly Gross (Wage)
                    </label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-ink-400">
                        ₹
                      </span>
                      <input
                        id="monthlyWage"
                        name="monthlyWage"
                        type="number"
                        min="0"
                        step="100"
                        value={values.monthlyWage}
                        onChange={(event) => set("monthlyWage")(Number(event.target.value))}
                        disabled={!canEdit}
                        className="field pl-7 mono text-base font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label" htmlFor="annualGross">
                      Annual Gross (CTC)
                    </label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-ink-400">
                        ₹
                      </span>
                      <input
                        id="annualGross"
                        type="number"
                        min="0"
                        step="any"
                        value={values.monthlyWage * 12}
                        onChange={(event) => handleAnnualChange(Number(event.target.value))}
                        disabled={!canEdit}
                        className="field pl-7 mono text-base font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Hike Buttons */}
                <div>
                  <span className="hint">Quick Hike</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {[5, 10, 15, 20, 25].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => applyHike(pct)}
                        className="rounded border border-line bg-canvas px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 transition"
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="workingDaysPerWeek">
                      Working Days / Week
                    </label>
                    <input
                      id="workingDaysPerWeek"
                      name="workingDaysPerWeek"
                      type="number"
                      min="1"
                      max="7"
                      value={values.workingDaysPerWeek}
                      onChange={(event) => set("workingDaysPerWeek")(Number(event.target.value))}
                      disabled={!canEdit}
                      className="field mt-1"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="breakHours">
                      Daily Break (hours)
                    </label>
                    <input
                      id="breakHours"
                      name="breakHours"
                      type="number"
                      min="0"
                      max="4"
                      step="0.5"
                      value={values.breakHours}
                      onChange={(event) => set("breakHours")(Number(event.target.value))}
                      disabled={!canEdit}
                      className="field mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Component Allocation */}
              <div className="card flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between">
                  <p className="section-title">Salary Components</p>
                  <span className="text-xs text-ink-500">
                    Allocated:{" "}
                    <span className={`mono font-semibold ${overAllocated ? "text-danger" : "text-ink-900"}`}>
                      {formatCurrency(allocated)}
                    </span>{" "}
                    / {formatCurrency(values.monthlyWage)}
                  </span>
                </div>

                {overAllocated ? (
                  <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
                    Components exceed 100% of the gross wage by {formatCurrency(allocated - values.monthlyWage)}. Reduce one or more percentages.
                  </p>
                ) : null}

                <div className="divide-y divide-line text-sm">
                  {/* Basic */}
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="font-medium text-ink-900">Basic Salary</p>
                      <p className="hint">Percent of Gross Wage</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <NumberCell
                        name="basicPercent"
                        value={values.basicPercent}
                        onChange={set("basicPercent")}
                        disabled={!canEdit}
                        suffix="%"
                        width="w-20"
                      />
                      <span className="mono w-28 text-right font-semibold text-ink-900">
                        {formatCurrency(breakdown.basic)}
                      </span>
                    </div>
                  </div>

                  {/* HRA */}
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="font-medium text-ink-900">House Rent Allowance (HRA)</p>
                      <p className="hint">Percent of Basic ({values.hraPercentOfBasic}% of Basic)</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <NumberCell
                        name="hraPercentOfBasic"
                        value={values.hraPercentOfBasic}
                        onChange={set("hraPercentOfBasic")}
                        disabled={!canEdit}
                        suffix="%"
                        width="w-20"
                      />
                      <span className="mono w-28 text-right font-semibold text-ink-900">
                        {formatCurrency(getComponent("hra"))}
                      </span>
                    </div>
                  </div>

                  {/* Standard Allowance */}
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="font-medium text-ink-900">Standard Allowance</p>
                      <p className="hint">Percent of Gross Wage</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <NumberCell
                        name="standardAllowancePercent"
                        value={values.standardAllowancePercent}
                        onChange={set("standardAllowancePercent")}
                        disabled={!canEdit}
                        suffix="%"
                        width="w-20"
                      />
                      <span className="mono w-28 text-right font-semibold text-ink-900">
                        {formatCurrency(getComponent("standard"))}
                      </span>
                    </div>
                  </div>

                  {/* Performance Bonus */}
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="font-medium text-ink-900">Performance Bonus</p>
                      <p className="hint">Percent of Gross Wage</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <NumberCell
                        name="performanceBonusPercent"
                        value={values.performanceBonusPercent}
                        onChange={set("performanceBonusPercent")}
                        disabled={!canEdit}
                        suffix="%"
                        width="w-20"
                      />
                      <span className="mono w-28 text-right font-semibold text-ink-900">
                        {formatCurrency(getComponent("bonus"))}
                      </span>
                    </div>
                  </div>

                  {/* LTA */}
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="font-medium text-ink-900">Leave Travel Allowance (LTA)</p>
                      <p className="hint">Percent of Gross Wage</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <NumberCell
                        name="ltaPercent"
                        value={values.ltaPercent}
                        onChange={set("ltaPercent")}
                        disabled={!canEdit}
                        suffix="%"
                        width="w-20"
                      />
                      <span className="mono w-28 text-right font-semibold text-ink-900">
                        {formatCurrency(getComponent("lta"))}
                      </span>
                    </div>
                  </div>

                  {/* Fixed Allowance (remainder) */}
                  <div className="flex items-center justify-between py-2.5 bg-canvas/40 -mx-5 px-5 rounded-md">
                    <div>
                      <p className="font-medium text-ink-900">Fixed / Special Allowance</p>
                      <p className="hint">Automatically balances the remainder of Gross Wage</p>
                    </div>
                    <span className="mono font-semibold text-brand-700">
                      {formatCurrency(getComponent("fixed"))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: PF & Deductions */}
            <div className="flex flex-col gap-5">
              {/* Provident Fund */}
              <div className="card flex flex-col gap-4 p-5">
                <p className="section-title">Provident Fund (PF)</p>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-sm text-ink-700">PF Rate</span>
                    <div className="mt-1 flex gap-1.5">
                      {[0, 12].map((rate) => (
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
                  </div>
                  <NumberCell
                    name="professionalTax"
                    value={values.professionalTax}
                    onChange={set("professionalTax")}
                    disabled={!canEdit}
                    suffix="/ mo"
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

        </form>
      )}
    </div>
  );
}
