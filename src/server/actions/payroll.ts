"use server";

import { revalidatePath } from "next/cache";

import { isManager, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generatePayslip } from "@/lib/payroll";
import { failure, success, type ActionState } from "@/lib/action-state";

const read = (form: FormData, key: string) => Number(form.get(key));

/**
 * Generates or regenerates every active employee's payslip for one month.
 * Skips an employee with no salary structure rather than aborting the whole
 * run — in practice every employee gets one at creation, so this is a safety
 * net, not the expected path.
 */
export async function runPayrollAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireUser();
  if (!isManager(actor.role)) return failure("Only an administrator or HR officer can run payroll.");

  const year = read(form, "year");
  const month = read(form, "month");
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return failure("Choose a valid month.");
  }

  const now = new Date();
  const requested = new Date(year, month - 1, 1);
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (requested > currentMonth) {
    return failure("Payroll can't be run for a month that hasn't started yet.");
  }

  const employees = await db.employee.findMany({
    where: { companyId: actor.companyId, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
  });

  let generated = 0;
  const skipped: string[] = [];

  for (const employee of employees) {
    try {
      await generatePayslip(employee.id, year, month, actor.id);
      generated += 1;
    } catch {
      skipped.push(`${employee.firstName} ${employee.lastName}`);
    }
  }

  revalidatePath("/payroll");

  if (generated === 0) {
    return failure("No payslips could be generated. Check that employees have a salary structure configured.");
  }

  return success(
    `Generated ${generated} payslip${generated === 1 ? "" : "s"}.`,
    skipped.length ? `Skipped (no salary structure): ${skipped.join(", ")}` : undefined,
  );
}
