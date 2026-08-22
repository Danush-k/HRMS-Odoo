"use server";

import { revalidatePath } from "next/cache";

import { canEditSalary, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { allocatedBeforeFixed, computeSalary } from "@/lib/salary";
import { fieldErrors, salarySchema } from "@/lib/validations";
import { failure, success, type ActionState } from "@/lib/action-state";

/** Every column that defines a structure — kept as one list so a revision snapshot and the change check can't drift apart. */
const SALARY_FIELDS = [
  "monthlyWage",
  "workingDaysPerWeek",
  "breakHours",
  "basicPercent",
  "hraPercentOfBasic",
  "standardAllowancePercent",
  "performanceBonusPercent",
  "ltaPercent",
  "pfPercent",
  "professionalTax",
] as const;

/** SRS 3.6.2 — only a manager may change a salary structure. */
export async function updateSalaryAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireUser();
  if (!canEditSalary(actor.role)) return failure("Only an administrator or HR officer can change salary.");

  const parsed = salarySchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return failure("Check the highlighted fields.", fieldErrors(parsed.error));

  const { employeeId, ...values } = parsed.data;

  const target = await db.employee.findFirst({ where: { id: employeeId, companyId: actor.companyId } });
  if (!target) return failure("That employee no longer exists.");

  // Basic, HRA, Standard Allowance, Performance Bonus and LTA together must
  // leave something for Fixed Allowance to balance with. Past this point the
  // components would silently total more than the wage instead of matching
  // it — reject here rather than accept a structure that undercounts itself.
  const allocated = allocatedBeforeFixed(values);
  if (allocated > values.monthlyWage) {
    return failure(
      `Basic, HRA, Standard Allowance, Bonus and LTA add up to ${allocated.toFixed(2)}, which is more than the ` +
        `${values.monthlyWage.toFixed(2)} monthly wage. Lower one of the percentages so Fixed Allowance has ` +
        `something left to balance.`,
    );
  }

  const preview = computeSalary({ ...values });
  if (preview.netMonthly < 0) {
    return failure("Deductions exceed the monthly wage. Lower the PF rate or the professional tax.");
  }

  const current = await db.salary.findUnique({ where: { employeeId } });
  const changed = !current || SALARY_FIELDS.some((field) => current[field] !== values[field]);

  // A structure that actually changes gets its outgoing values written to
  // history before the overwrite — otherwise the previous basis is simply
  // gone, which is the bug this closes. Saving the form with nothing changed
  // is a no-op: no revision, and effectiveFrom is left where it was.
  if (current && changed) {
    await db.salaryRevision.create({
      data: {
        employeeId,
        monthlyWage: current.monthlyWage,
        workingDaysPerWeek: current.workingDaysPerWeek,
        breakHours: current.breakHours,
        basicPercent: current.basicPercent,
        hraPercentOfBasic: current.hraPercentOfBasic,
        standardAllowancePercent: current.standardAllowancePercent,
        performanceBonusPercent: current.performanceBonusPercent,
        ltaPercent: current.ltaPercent,
        pfPercent: current.pfPercent,
        professionalTax: current.professionalTax,
        effectiveFrom: current.effectiveFrom,
        effectiveTo: new Date(),
        changedById: actor.id,
      },
    });
  }

  await db.salary.upsert({
    where: { employeeId },
    create: { employeeId, ...values, effectiveFrom: new Date() },
    update: changed ? { ...values, effectiveFrom: new Date() } : values,
  });

  revalidatePath(`/employees/${employeeId}`);
  return success("Salary structure updated.");
}
