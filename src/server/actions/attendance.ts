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

  const now = new Date();
  const worked = existing.workedMinutes + minutesBetween(existing.checkIn, now);

  await db.attendance.update({
    where: { id: existing.id },
    data: { checkOut: now, workedMinutes: worked, status: deriveStatus(worked) },
  });

  revalidatePath("/attendance");
  revalidatePath("/employees");
  return success("Checked out.");
}
