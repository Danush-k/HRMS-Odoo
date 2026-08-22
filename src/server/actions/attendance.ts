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

const updateAttendanceSchema = z.object({
  attendanceId: z.string().optional(),
  employeeId: z.string().optional(),
  date: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LEAVE"]),
  note: z.string().optional(),
});

/** T8: Admin/HR manual attendance correction action with audit log */
export async function updateAttendanceAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireUser();
  if (!isManager(actor.role)) return failure("Only an Administrator or HR Officer can modify attendance records.");

  const parsed = updateAttendanceSchema.safeParse({
    attendanceId: read(form, "attendanceId"),
    employeeId: read(form, "employeeId"),
    date: read(form, "date"),
    checkIn: read(form, "checkIn"),
    checkOut: read(form, "checkOut"),
    status: read(form, "status"),
    note: read(form, "note"),
  });

  if (!parsed.success) return failure("Check highlighted fields", fieldErrors(parsed.error));
  const { attendanceId, employeeId, date: dateStr, checkIn, checkOut, status, note } = parsed.data;

  let existing = attendanceId
    ? await db.attendance.findFirst({
        where: { id: attendanceId, employee: { companyId: actor.companyId } },
      })
    : null;

  if (!existing && employeeId && dateStr) {
    const targetDate = new Date(dateStr);
    existing = await db.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: targetDate } },
    });
  }

  const checkInDate = checkIn ? new Date(checkIn) : existing?.checkIn ?? null;
  const checkOutDate = checkOut ? new Date(checkOut) : existing?.checkOut ?? null;
  const workedMinutes = checkInDate && checkOutDate ? minutesBetween(checkInDate, checkOutDate) : existing?.workedMinutes ?? 0;

  await db.$transaction(async (tx) => {
    let recId = existing?.id;

    if (existing) {
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
    } else if (employeeId && dateStr) {
      const targetDate = new Date(dateStr);
      const created = await tx.attendance.create({
        data: {
          employeeId,
          date: targetDate,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          workedMinutes,
          status,
          note: note || "Manual HR entry",
        },
      });
      recId = created.id;
    }

    if (recId) {
      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          actorId: actor.id,
          action: "ATTENDANCE_UPDATE",
          targetType: "Attendance",
          targetId: recId,
          changes: JSON.stringify({
            before: { checkIn: existing?.checkIn, checkOut: existing?.checkOut, status: existing?.status ?? "ABSENT" },
            after: { checkIn: checkInDate, checkOut: checkOutDate, status },
          }),
        },
      });
    }
  });

  revalidatePath("/attendance");
  return success("Attendance record updated.");
}
