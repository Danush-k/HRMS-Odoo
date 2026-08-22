"use client";

import { useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/ui";
import { allocatedBeforeFixed, computeSalary, formatCurrency, round2, type SalaryInput } from "@/lib/salary";
import { updateSalaryAction } from "@/server/actions/salary";
import { type ActionState, idle } from "@/lib/action-state";

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
    description: "60% Basic, 40% HRA, 0% Variable/Bonus, 12% PF",
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

export function EditSalaryModal({
  employee,
  initialSalary,
  isOpen,
  onClose,
  onSaved,
}: {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    loginId: string;
    avatar?: string | null;
    jobPosition?: string | null;
  };
  initialSalary: SalaryValues;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [values, setValues] = useState<SalaryValues>(initialSalary);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [state, setState] = useState<ActionState>(idle);
  const [isPending, startTransition] = useTransition();

  // Reset values when modal is opened for a specific employee
  useEffect(() => {
    if (isOpen) {
      setValues(initialSalary);
      setActivePreset(null);
      setState(idle);
    }
  }, [isOpen, initialSalary]);

  // Handle escape key & body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", escape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", escape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (overAllocated) return;

    const formData = new FormData();
    formData.set("employeeId", employee.id);
    formData.set("monthlyWage", String(values.monthlyWage));
    formData.set("workingDaysPerWeek", String(values.workingDaysPerWeek));
    formData.set("breakHours", String(values.breakHours));
    formData.set("basicPercent", String(values.basicPercent));
    formData.set("hraPercentOfBasic", String(values.hraPercentOfBasic));
    formData.set("standardAllowancePercent", String(values.standardAllowancePercent));
    formData.set("performanceBonusPercent", String(values.performanceBonusPercent));
    formData.set("ltaPercent", String(values.ltaPercent));
    formData.set("pfPercent", String(values.pfPercent));
    formData.set("professionalTax", String(values.professionalTax));

    startTransition(async () => {
      const res = await updateSalaryAction(idle, formData);
      setState(res);
      if (res.ok) {
        onSaved?.();
        setTimeout(() => {
          onClose();
        }, 700);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink-900/50 backdrop-blur-[3px] transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Centered Modal Card with Rounded Edges */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit Salary Structure for ${employee.firstName} ${employee.lastName}`}
        className="relative z-10 w-full max-w-2xl sm:max-w-3xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-ink-900/25 transition-all animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-surface px-6 py-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={employee.avatar}
              name={`${employee.firstName} ${employee.lastName}`}
              size={40}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink-900">
                  {employee.firstName} {employee.lastName}
                </h2>
                <span className="mono rounded bg-brand-50 px-1.5 py-0.5 text-xs font-semibold text-brand-700">
                  {employee.loginId}
                </span>
              </div>
              <p className="text-xs text-ink-500">{employee.jobPosition || "Salary Structure"}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-800 transition"
            aria-label="Close modal"
          >
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {/* Presets Toolbar */}
            <div className="rounded-xl border border-line bg-ink-100/40 p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-600">
                  Quick Structure Presets
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActivePreset(null);
                    setValues(initialSalary);
                  }}
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  Reset to saved
                </button>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {SALARY_PRESETS.map((preset) => {
                  const isSelected = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`flex flex-col items-start justify-between rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? "border-brand-600 bg-brand-50/80 shadow-xs ring-1 ring-brand-500/20"
                          : "border-line bg-surface hover:border-ink-300 hover:bg-brand-50/20"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-ink-900">{preset.name}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[9px] font-semibold ${
                            isSelected ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600"
                          }`}
                        >
                          {preset.badge}
                        </span>
                      </div>
                      <span className="mt-1 text-[10px] leading-tight text-ink-500">
                        {preset.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Wage & Hike Calculator */}
            <div className="card rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <label className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold text-ink-800">Monthly Wage</span>
                  <span className="inline-flex items-center gap-1.5">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={Number.isFinite(values.monthlyWage) ? values.monthlyWage : 0}
                      onChange={(e) => set("monthlyWage")(Number(e.target.value))}
                      className="field mono w-36 py-1.5 text-right text-sm font-semibold"
                      aria-label="Monthly wage"
                    />
                    <span className="text-xs text-ink-500">/ mo</span>
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <span className="text-xs text-ink-500">Annual Gross:</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={Math.round(values.monthlyWage * 12)}
                    onChange={(e) => handleAnnualChange(Number(e.target.value))}
                    className="field mono w-32 py-1.5 text-right text-xs"
                    aria-label="Annual Gross CTC"
                  />
                  <span className="text-xs text-ink-500">/ yr</span>
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
                <span className="text-xs font-medium text-ink-500">Apply Hike:</span>
                {[5, 10, 15, 20].map((hike) => (
                  <button
                    key={hike}
                    type="button"
                    onClick={() => applyHike(hike)}
                    className="btn-secondary btn-sm text-[11px] rounded-md"
                    title={`Increase monthly wage by ${hike}%`}
                  >
                    +{hike}%
                  </button>
                ))}
              </div>
            </div>

            {/* Salary Components */}
            <div className="card rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="section-title">Component Breakdown</p>
                  <p className="hint mt-0.5">Fixed Allowance balances the remainder to 100% of wage.</p>
                </div>
                <span className="mono text-xs font-medium text-ink-500">
                  Gross: {formatCurrency(breakdown.grossMonthly)}
                </span>
              </div>

              {overAllocated ? (
                <p className="mt-3 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
                  Components total {formatCurrency(allocated)} — exceeding {formatCurrency(values.monthlyWage)}. Lower a percentage to save.
                </p>
              ) : null}

              <ul className="mt-3 flex flex-col divide-y divide-line">
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
                    <li key={component.key} className="flex items-center justify-between py-2.5 text-xs">
                      <div className="min-w-[150px]">
                        <p className="font-medium text-ink-900">{component.label}</p>
                        <p className="hint text-[10px]">{component.description}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="mono w-24 text-right font-semibold text-ink-900">
                          {formatCurrency(component.amount)}
                        </span>
                        {key ? (
                          <span className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={Number.isFinite(values[key] as number) ? (values[key] as number) : 0}
                              onChange={(e) => set(key)(Number(e.target.value) as any)}
                              className="field mono w-20 py-1 text-right text-xs"
                              aria-label={component.label}
                            />
                            <span className="w-14 text-[10px] text-ink-500">
                              {component.basis === "basic" ? "% basic" : "% wage"}
                            </span>
                          </span>
                        ) : (
                          <span className="w-36 text-right text-[11px] font-medium text-brand-700">
                            {component.percent}% of wage (Balancing)
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Schedule & Deductions Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Schedule */}
              <div className="card rounded-xl flex flex-col gap-3 p-4">
                <p className="section-title">Schedule & Break</p>
                <div>
                  <span className="text-xs text-ink-700 font-medium">Work days / week</span>
                  <div className="mt-1 flex gap-1.5">
                    {[5, 6].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => set("workingDaysPerWeek")(days)}
                        className={`flex-1 rounded-md py-1 text-xs font-semibold transition ${
                          values.workingDaysPerWeek === days
                            ? "bg-brand-600 text-white"
                            : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                        }`}
                      >
                        {days} Days
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-ink-700 font-medium">Break Time</span>
                  <div className="mt-1 flex gap-1.5">
                    {[0.5, 1, 1.5].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => set("breakHours")(hrs)}
                        className={`flex-1 rounded-md py-1 text-xs font-semibold transition ${
                          values.breakHours === hrs
                            ? "bg-brand-600 text-white"
                            : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                        }`}
                      >
                        {hrs}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="card rounded-xl flex flex-col gap-3 p-4">
                <p className="section-title">PF & Tax</p>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-700 font-medium">PF Rate</span>
                    <span className="mono text-xs font-medium text-danger">
                      − {formatCurrency(breakdown.pfEmployee)}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-1.5">
                    {[0, 10, 12].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => set("pfPercent")(rate)}
                        className={`flex-1 rounded-md py-1 text-xs font-semibold transition ${
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

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-700 font-medium">Professional Tax</span>
                    <span className="mono text-xs font-medium text-danger">
                      − {formatCurrency(breakdown.professionalTax)}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-1.5">
                    {[0, 200].map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => set("professionalTax")(pt)}
                        className={`flex-1 rounded-md py-1 text-xs font-semibold transition ${
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
              </div>
            </div>

            {/* Live Summary */}
            <div className="card rounded-xl overflow-hidden">
              <div className="bg-brand-700 px-4 py-2.5 text-white flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-white/80">
                  Calculated Monthly Projection
                </p>
                <span className="mono text-xs font-semibold text-white/90">
                  CTC: {formatCurrency(breakdown.ctcMonthly)} / mo
                </span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-line bg-brand-50/40 p-3 text-center text-xs">
                <div>
                  <p className="text-[10px] uppercase font-medium text-ink-500">Gross Monthly</p>
                  <p className="mono font-semibold text-ink-900 mt-0.5">{formatCurrency(breakdown.grossMonthly)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-medium text-ink-500">Total Deductions</p>
                  <p className="mono font-semibold text-danger mt-0.5">− {formatCurrency(breakdown.totalDeductions)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-medium text-ink-500">Net Take-Home</p>
                  <p className="mono font-bold text-present mt-0.5 text-sm">{formatCurrency(breakdown.netMonthly)}</p>
                </div>
              </div>
            </div>
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
                onClick={onClose}
                className="btn-secondary btn-sm rounded-lg"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={overAllocated || isPending}
                className="btn-primary btn-sm rounded-lg inline-flex items-center gap-1.5 shadow-xs"
              >
                {isPending ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  "Save Salary Structure"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export const EditSalaryDrawer = EditSalaryModal;
