"use server";

import { revalidatePath } from "next/cache";

import { canEditSalary, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { allocatedBeforeFixed, computeSalary } from "@/lib/salary";
import { fieldErrors, salarySchema } from "@/lib/validations";
import { failure, success, type ActionState } from "@/lib/action-state";

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

  await db.salary.upsert({
    where: { employeeId },
    create: { employeeId, ...values },
    update: values,
  });

  revalidatePath(`/employees/${employeeId}`);
  return success("Salary structure updated.");
}
