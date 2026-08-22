"use server";

import { revalidatePath } from "next/cache";

import { isManager, requireUser } from "@/lib/auth";
import { countWorkingDays, dayKey, eachWorkingDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { fieldErrors, leaveRequestSchema, reviewLeaveSchema } from "@/lib/validations";
import { saveUploadedFile } from "@/lib/storage";
import { failure, success, type ActionState } from "@/lib/action-state";

const read = (form: FormData, key: string) => (form.get(key) as string | null) ?? undefined;

/** Ensure a balance record exists for an employee, leave type, and year (L1 & L2) */
export async function ensureLeaveBalance(employeeId: string, leaveTypeId: string, year: number) {
  const existing = await db.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
  });

  if (existing) return existing;

  const leaveType = await db.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!leaveType) return null;

  return db.leaveBalance.create({
    data: {
      employeeId,
      leaveTypeId,
      year,
      allocated: leaveType.defaultDays,
      used: 0,
    },
  });
}

/** SRS 3.5.1 — an employee applies for time off; a manager may file on someone's behalf. */
export async function requestLeaveAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireUser();

  const parsed = leaveRequestSchema.safeParse({
    employeeId: read(form, "employeeId"),
    leaveTypeId: read(form, "leaveTypeId"),
    startDate: read(form, "startDate"),
    endDate: read(form, "endDate"),
    remarks: read(form, "remarks"),
    attachment: read(form, "attachment"),
  });

  if (!parsed.success) return failure("Check the highlighted fields.", fieldErrors(parsed.error));
  const data = parsed.data;

  const employeeId = isManager(actor.role) && data.employeeId ? data.employeeId : actor.id;

  // L4: Cross-company security check
  const targetEmployee = await db.employee.findFirst({
    where: { id: employeeId, companyId: actor.companyId },
  });
  if (!targetEmployee) return failure("Selected employee is not in your company.");

  const start = dayKey(data.startDate);
  const end = dayKey(data.endDate);

  const leaveType = await db.leaveType.findFirst({
    where: { id: data.leaveTypeId, companyId: actor.companyId },
  });
  if (!leaveType) return failure("That time off type no longer exists.");

  const today = dayKey(new Date());
  if (start < today && !isManager(actor.role) && !leaveType.requiresAttachment) {
    return failure("Start date cannot be in the past. Select today or a future date.");
  }

  // L9 — sick-leave certificate: validate, save to disk and record in Document table.
  const attachmentFile = form.get("attachmentFile");
  let fileUrl: string | null = null;

  if (leaveType.requiresAttachment) {
    if (!attachmentFile || !(attachmentFile instanceof File) || attachmentFile.size === 0) {
      return failure("A certificate attachment is required for sick leave.", {
        attachment: "Upload a PNG, JPEG or PDF certificate",
      });
    }

    try {
      const saved = await saveUploadedFile(attachmentFile);
      fileUrl = saved.fileUrl;

      await db.document.create({
        data: {
          employeeId,
          name: saved.name,
          category: "MEDICAL",
          fileUrl: saved.fileUrl,
          fileSize: saved.fileSize,
          mimeType: saved.mimeType,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "The certificate could not be uploaded.";
      return failure(message, { attachment: message });
    }
  }

  // L10 — fetch company public holidays inside the requested interval.
  const holidays = await db.publicHoliday.findMany({
    where: { companyId: actor.companyId, date: { gte: start, lte: end } },
  });
  const holidayDates = holidays.map((h) => h.date);

  // Working days exclude weekends AND public holidays:
  const days = countWorkingDays(start, end, holidayDates);
  if (days === 0) return failure("That range contains no working days.", { endDate: "Choose at least one working day" });

  const clash = await db.leaveRequest.findFirst({
    where: {
      employeeId,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (clash) return failure("Those dates overlap a request you have already submitted.");

  if (leaveType.isPaid) {
    const year = start.getFullYear();
    // L1 & L2: Ensure balance exists for current year
    const balance = await ensureLeaveBalance(employeeId, leaveType.id, year);
    const available = (balance?.allocated ?? 0) - (balance?.used ?? 0);

    if (days > available) {
      return failure(`Only ${available} day(s) of ${leaveType.name} remain for ${year}.`);
    }
  }

  await db.leaveRequest.create({
    data: {
      employeeId,
      leaveTypeId: leaveType.id,
      startDate: start,
      endDate: end,
      days,
      remarks: data.remarks || null,
      attachment: fileUrl || data.attachment || null,
      status: "PENDING",
    },
  });

  revalidatePath("/time-off");
  return success("Time off request submitted.");
}

/** SRS 3.5.2 — approve or reject. */
export async function reviewLeaveAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireUser();
  if (!isManager(actor.role)) return failure("Only an administrator or HR officer can review time off.");

  const parsed = reviewLeaveSchema.safeParse({
    requestId: read(form, "requestId"),
    decision: read(form, "decision"),
    comment: read(form, "comment"),
  });
  if (!parsed.success) return failure("Check the highlighted fields.", fieldErrors(parsed.error));
  const { requestId, decision, comment } = parsed.data;

  if (decision === "REJECTED" && !comment) {
    return failure("Add a comment explaining the rejection.", { comment: "A reason is required" });
  }

  const request = await db.leaveRequest.findFirst({
    where: { id: requestId, employee: { companyId: actor.companyId } },
    include: { leaveType: true },
  });

  if (!request) return failure("That request no longer exists.");
  if (request.status !== "PENDING") return failure("That request has already been reviewed.");

  try {
    await db.$transaction(async (tx) => {
      // L3: Double approval check guard
      const updated = await tx.leaveRequest.updateMany({
        where: { id: request.id, status: "PENDING" },
        data: {
          status: decision,
          reviewerId: actor.id,
          reviewComment: comment || null,
          reviewedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        throw new Error("ALREADY_REVIEWED");
      }

      if (decision !== "APPROVED") return;

      // L10 — public holidays inside the leave range are not leave days either.
      const holidays = await tx.publicHoliday.findMany({
        where: { companyId: actor.companyId, date: { gte: request.startDate, lte: request.endDate } },
      });
      const holidayDates = holidays.map((h) => h.date);

      if (request.leaveType.isPaid) {
        const year = request.startDate.getFullYear();
        await tx.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              year,
            },
          },
          create: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year,
            allocated: request.leaveType.defaultDays,
            used: request.days,
          },
          update: { used: { increment: request.days } },
        });
      }

      // Approved leave shows up on attendance calendar immediately (T5 & SRS 3.5.2)
      for (const day of eachWorkingDay(request.startDate, request.endDate, holidayDates)) {
        const existingAtt = await tx.attendance.findUnique({
          where: { employeeId_date: { employeeId: request.employeeId, date: day } },
        });

        // Don't erase worked minutes if user already worked (T5)
        const note = request.leaveType.name + (existingAtt?.workedMinutes ? ` (${existingAtt.workedMinutes}m worked)` : "");

        await tx.attendance.upsert({
          where: { employeeId_date: { employeeId: request.employeeId, date: day } },
          create: {
            employeeId: request.employeeId,
            date: day,
            status: "LEAVE",
            note,
          },
          update: {
            status: "LEAVE",
            note,
          },
        });
      }
    });
  } catch (err: any) {
    if (err.message === "ALREADY_REVIEWED" || err?.code === "P2025") {
      return failure("That request has already been reviewed.");
    }
    throw err;
  }

  revalidatePath("/time-off");
  revalidatePath("/attendance");
  revalidatePath("/employees");
  return success(decision === "APPROVED" ? "Request approved." : "Request rejected.");
}

/** L6: Revert or cancel leave action. Restores balance for APPROVED leaves. */
export async function cancelLeaveAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const requestId = read(form, "requestId");
  if (!requestId) return failure("No request selected.");

  const request = await db.leaveRequest.findFirst({
    where: { id: requestId, employee: { companyId: actor.companyId } },
    include: { leaveType: true },
  });
  if (!request) return failure("That request no longer exists.");
  if (request.employeeId !== actor.id && !isManager(actor.role)) {
    return failure("You can only cancel or revert requests in your company.");
  }
  if (request.status === "CANCELLED" || request.status === "REJECTED") {
    return failure("That request is already cancelled or rejected.");
  }

  await db.$transaction(async (tx) => {
    // If it was APPROVED and paid, restore the leave balance (L6)
    if (request.status === "APPROVED" && request.leaveType.isPaid) {
      const year = request.startDate.getFullYear();
      await tx.leaveBalance.updateMany({
        where: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
        },
        data: { used: { decrement: request.days } },
      });

      // L10 — holidays were never marked as leave days, so skip them here too.
      const holidays = await tx.publicHoliday.findMany({
        where: { companyId: actor.companyId, date: { gte: request.startDate, lte: request.endDate } },
      });
      const holidayDates = holidays.map((h) => h.date);

      // Clear attendance leave records
      for (const day of eachWorkingDay(request.startDate, request.endDate, holidayDates)) {
        const att = await tx.attendance.findUnique({
          where: { employeeId_date: { employeeId: request.employeeId, date: day } },
        });

        if (att && att.status === "LEAVE") {
          if (att.workedMinutes > 0) {
            await tx.attendance.update({
              where: { id: att.id },
              data: { status: "PRESENT", note: null },
            });
          } else {
            await tx.attendance.delete({ where: { id: att.id } });
          }
        }
      }
    }

    await tx.leaveRequest.update({ where: { id: request.id }, data: { status: "CANCELLED" } });
  });

  revalidatePath("/time-off");
  revalidatePath("/attendance");
  return success("Request cancelled and leave balance restored.");
}

/** L7: Admin/HR Manual Leave Allocation Adjustment */
export async function adjustLeaveAllocationAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireUser();
  if (!isManager(actor.role)) return failure("Only an Administrator or HR Officer can adjust leave allocations.");

  const employeeId = read(form, "employeeId");
  const leaveTypeId = read(form, "leaveTypeId");
  const yearStr = read(form, "year");
  const allocatedStr = read(form, "allocated");

  if (!employeeId || !leaveTypeId || !allocatedStr) {
    return failure("Employee, Leave Type, and Allocated Days are required.");
  }

  const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
  const allocated = parseFloat(allocatedStr);

  if (isNaN(allocated) || allocated < 0) return failure("Allocated days must be a non-negative number.");

  const employee = await db.employee.findFirst({
    where: { id: employeeId, companyId: actor.companyId },
  });
  if (!employee) return failure("Employee not found.");

  await db.leaveBalance.upsert({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    create: { employeeId, leaveTypeId, year, allocated, used: 0 },
    update: { allocated },
  });

  await db.auditLog.create({
    data: {
      companyId: actor.companyId,
      actorId: actor.id,
      action: "LEAVE_ALLOCATION_UPDATE",
      targetType: "LeaveBalance",
      targetId: `${employeeId}_${leaveTypeId}_${year}`,
      changes: JSON.stringify({ employeeId, leaveTypeId, year, allocated }),
    },
  });

  revalidatePath("/time-off");
  return success("Leave allocation updated successfully.");
}
