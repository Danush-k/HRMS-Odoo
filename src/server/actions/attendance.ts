"use server";

import { revalidatePath } from "next/cache";

import { deriveStatus } from "@/lib/attendance";
import { requireUser } from "@/lib/auth";
import { dayKey, minutesBetween } from "@/lib/dates";
import { db } from "@/lib/db";
import { failure, success, type ActionState } from "@/lib/action-state";

/**
 * Records a check in for today. The unique constraint on (employeeId, date) plus the
 * guard below make this idempotent — a second click cannot open a second day.
 */
export async function checkInAction(): Promise<ActionState> {
  const user = await requireUser();
  const today = dayKey(new Date());

  const existing = await db.attendance.findUnique({
    where: { employeeId_date: { employeeId: user.id, date: today } },
  });

  if (existing?.checkIn && !existing.checkOut) return failure("You are already checked in.");
  if (existing?.status === "LEAVE") return failure("You are on approved leave today.");

  const now = new Date();

  if (!existing) {
    await db.attendance.create({
      data: { employeeId: user.id, date: today, checkIn: now, status: "HALF_DAY" },
    });
  } else {
    // Returning after a check out: reopen the day and keep the minutes already banked.
    await db.attendance.update({
      where: { id: existing.id },
      data: { checkIn: now, checkOut: null },
    });
  }

  revalidatePath("/attendance");
  revalidatePath("/employees");
  return success("Checked in.");
}

export async function checkOutAction(): Promise<ActionState> {
  const user = await requireUser();
  const today = dayKey(new Date());

  const existing = await db.attendance.findUnique({
    where: { employeeId_date: { employeeId: user.id, date: today } },
  });

  if (!existing?.checkIn) return failure("Check in before checking out.");
  if (existing.checkOut) return failure("You have already checked out.");

  const salary = await db.salary.findUnique({ where: { employeeId: user.id }, select: { breakHours: true } });

  const now = new Date();
  // The configured break is time in the office that isn't work, so it comes
  // off this session's raw span before banking it — "Worked" then means what
  // it says, and payroll pays for the same figure it displays. Deducted once
  // per check-in/check-out block: a day resumed after an earlier check-out
  // loses the break again for that block, which is the right call for the
  // ordinary one-in one-out day this is built around.
  const rawMinutes = minutesBetween(existing.checkIn, now);
  const netMinutes = Math.max(0, rawMinutes - (salary?.breakHours ?? 1) * 60);
  const worked = existing.workedMinutes + netMinutes;

  await db.attendance.update({
    where: { id: existing.id },
    data: { checkOut: now, workedMinutes: worked, status: deriveStatus(worked) },
  });

  revalidatePath("/attendance");
  revalidatePath("/employees");
  return success("Checked out.");
}
