"use server";

import { revalidatePath } from "next/cache";
import z from "zod";

import { deriveStatus } from "@/lib/attendance";
import { isManager, requireUser } from "@/lib/auth";
import { dayKey, minutesBetween } from "@/lib/dates";
import { db } from "@/lib/db";
import { failure, success, type ActionState } from "@/lib/action-state";
import { fieldErrors } from "@/lib/validations";

const read = (form: FormData, key: string) => (form.get(key) as string | null) ?? undefined;

const updateAttendanceSchema = z.object({
  attendanceId: z.string().min(1, "Attendance ID is required"),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LEAVE"]),
  note: z.string().optional(),
});

/** Auto-closes open check-ins from past days for the user. */
async function autoClosePastCheckIns(employeeId: string, standardHours: number) {
  const today = dayKey(new Date());
  const unclosed = await db.attendance.findMany({
    where: {
      employeeId,
      checkIn: { not: null },
      checkOut: null,
      date: { lt: today },
    },
  });

  for (const record of unclosed) {
    if (!record.checkIn) continue;
    // Set auto checkOut at end of work day (checkIn + standardHours)
    const autoCheckOut = new Date(record.checkIn.getTime() + standardHours * 60 * 60 * 1000);
    const worked = record.workedMinutes + minutesBetween(record.checkIn, autoCheckOut);
    const status = deriveStatus(worked, standardHours);

    await db.attendance.update({
      where: { id: record.id },
      data: {
        checkOut: autoCheckOut,
        workedMinutes: worked,
        status,
        note: (record.note ? `${record.note}; ` : "") + "Auto-closed: forgot check out",
      },
    });
  }
}

export async function checkInAction(): Promise<ActionState> {
  const user = await requireUser();
  const today = dayKey(new Date());
  const standardHours = user.company.standardWorkHours ?? 8;

  // Auto close any past open check-ins first (T3)
  await autoClosePastCheckIns(user.id, standardHours);

  const existing = await db.attendance.findUnique({
    where: { employeeId_date: { employeeId: user.id, date: today } },
  });

  if (existing?.checkIn && existing.checkOut) {
    return failure("You have already completed attendance for today. Contact HR/Admin for corrections.");
  }
  if (existing?.checkIn && !existing.checkOut) return failure("You are already checked in.");
  if (existing?.status === "LEAVE") return failure("You are on approved leave today.");

  const now = new Date();

  if (!existing) {
    await db.attendance.create({
      data: { employeeId: user.id, date: today, checkIn: now, status: "HALF_DAY" },
    });
  } else {
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
  const standardHours = user.company.standardWorkHours ?? 8;

  const existing = await db.attendance.findUnique({
    where: { employeeId_date: { employeeId: user.id, date: today } },
  });

  if (!existing?.checkIn) return failure("Check in before checking out.");
  if (existing.checkOut) return failure("You have already checked out.");

  const now = new Date();
  const worked = existing.workedMinutes + minutesBetween(existing.checkIn, now);

  await db.attendance.update({
    where: { id: existing.id },
    data: {
      checkOut: now,
      workedMinutes: worked,
      status: deriveStatus(worked, standardHours),
    },
  });

  revalidatePath("/attendance");
  revalidatePath("/employees");
  return success("Checked out.");
}

/** T8: Admin/HR manual attendance correction action with audit log */
export async function updateAttendanceAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireUser();
  if (!isManager(actor.role)) return failure("Only an Administrator or HR Officer can modify attendance records.");

  const parsed = updateAttendanceSchema.safeParse({
    attendanceId: read(form, "attendanceId"),
    checkIn: read(form, "checkIn"),
    checkOut: read(form, "checkOut"),
    status: read(form, "status"),
    note: read(form, "note"),
  });

  if (!parsed.success) return failure("Check highlighted fields", fieldErrors(parsed.error));
  const { attendanceId, checkIn, checkOut, status, note } = parsed.data;

  const existing = await db.attendance.findFirst({
    where: { id: attendanceId, employee: { companyId: actor.companyId } },
  });
  if (!existing) return failure("Attendance record not found.");

  const checkInDate = checkIn ? new Date(checkIn) : existing.checkIn;
  const checkOutDate = checkOut ? new Date(checkOut) : existing.checkOut;
  const workedMinutes = checkInDate && checkOutDate ? minutesBetween(checkInDate, checkOutDate) : existing.workedMinutes;

  await db.$transaction(async (tx) => {
    await tx.attendance.update({
      where: { id: existing.id },
      data: {
        checkIn: checkInDate,
        checkOut: checkOutDate,
        workedMinutes,
        status,
        note: note || existing.note,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: actor.companyId,
        actorId: actor.id,
        action: "ATTENDANCE_UPDATE",
        targetType: "Attendance",
        targetId: existing.id,
        changes: JSON.stringify({
          before: { checkIn: existing.checkIn, checkOut: existing.checkOut, status: existing.status },
          after: { checkIn: checkInDate, checkOut: checkOutDate, status },
        }),
      },
    });
  });

  revalidatePath("/attendance");
  return success("Attendance record updated.");
}
