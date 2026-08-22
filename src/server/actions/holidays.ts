"use server";

import { revalidatePath } from "next/cache";
import z from "zod";

import { isManager, requireUser } from "@/lib/auth";
import { dayKey } from "@/lib/dates";
import { db } from "@/lib/db";
import { failure, success, type ActionState } from "@/lib/action-state";

/** L10 — Admin/HR manage the company public holiday calendar. */

const holidaySchema = z.object({
  name: z.string().trim().min(2, "Holiday name must be at least 2 characters"),
  date: z.string().min(1, "Date is required"),
  isRecurring: z.boolean().optional(),
});

export async function addPublicHolidayAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireUser();
  if (!isManager(actor.role)) return failure("Only HR/Admin can manage public holidays.");

  const name = form.get("name") as string;
  const dateStr = form.get("date") as string;
  const isRecurring = form.get("isRecurring") === "on";

  const parsed = holidaySchema.safeParse({ name, date: dateStr, isRecurring });
  if (!parsed.success) return failure("Invalid holiday details.", { name: "Enter at least 2 characters", ...(dateStr ? {} : { date: "Date is required" }) });

  // Normalise to UTC midnight so it matches attendance/leave day keys.
  const holidayDate = dayKey(new Date(`${parsed.data.date}T00:00:00`));
  if (Number.isNaN(holidayDate.getTime())) return failure("Enter a valid date.", { date: "Enter a valid date" });

  const existing = await db.publicHoliday.findUnique({
    where: { companyId_date: { companyId: actor.companyId, date: holidayDate } },
  });
  if (existing) return failure("A public holiday already exists on this date.", { date: "A holiday already exists on this date" });

  await db.publicHoliday.create({
    data: {
      companyId: actor.companyId,
      name: parsed.data.name,
      date: holidayDate,
      isRecurring: Boolean(isRecurring),
    },
  });

  revalidatePath("/time-off");
  return success("Public holiday added successfully.");
}

export async function deletePublicHolidayAction(holidayId: string): Promise<ActionState> {
  const actor = await requireUser();
  if (!isManager(actor.role)) return failure("Only HR/Admin can delete public holidays.");

  await db.publicHoliday.deleteMany({
    where: { id: holidayId, companyId: actor.companyId },
  });

  revalidatePath("/time-off");
  return success("Holiday deleted.");
}
