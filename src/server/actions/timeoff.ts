"use server";

import { revalidatePath } from "next/cache";

import { isManager, requireUser } from "@/lib/auth";
import { countWorkingDays, dayKey, eachWorkingDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { fieldErrors, leaveRequestSchema, reviewLeaveSchema } from "@/lib/validations";
import { failure, success, type ActionState } from "@/lib/action-state";

const read = (form: FormData, key: string) => (form.get(key) as string | null) ?? undefined;

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
  const start = dayKey(data.startDate);
  const end = dayKey(data.endDate);
  const days = countWorkingDays(start, end);

  if (days === 0) return failure("That range contains no working days.", { endDate: "Choose at least one weekday" });

  const leaveType = await db.leaveType.findFirst({
    where: { id: data.leaveTypeId, companyId: actor.companyId },
  });
  if (!leaveType) return failure("That time off type no longer exists.");

  if (leaveType.requiresAttachment && !data.attachment) {
    return failure("A certificate is required for sick leave.", { attachment: "Attach a certificate" });
  }

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
    const balance = await db.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: { employeeId, leaveTypeId: leaveType.id, year: start.getFullYear() },
      },
    });
    const available = (balance?.allocated ?? 0) - (balance?.used ?? 0);
    if (days > available) {
      return failure(`Only ${available} day(s) of ${leaveType.name} remain for ${start.getFullYear()}.`);
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
      attachment: data.attachment || null,
      status: "PENDING",
    },
  });

  revalidatePath("/time-off");
  return success("Time off request submitted.");
}

/**
 * SRS 3.5.2 — approve or reject. Approval decrements the balance and writes the
 * attendance rows in a single transaction, so the two can never disagree.
 */
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

  await db.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: request.id, status: "PENDING" },
      data: {
        status: decision,
        reviewerId: actor.id,
        reviewComment: comment || null,
        reviewedAt: new Date(),
      },
    });

    if (decision !== "APPROVED") return;

    if (request.leaveType.isPaid) {
      await tx.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year: request.startDate.getFullYear(),
          },
        },
        create: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year: request.startDate.getFullYear(),
          allocated: request.leaveType.defaultDays,
          used: request.days,
        },
        update: { used: { increment: request.days } },
      });
    }

    // Approved leave shows up on the attendance calendar immediately (SRS 3.5.2).
    for (const day of eachWorkingDay(request.startDate, request.endDate)) {
      await tx.attendance.upsert({
        where: { employeeId_date: { employeeId: request.employeeId, date: day } },
        create: {
          employeeId: request.employeeId,
          date: day,
          status: "LEAVE",
          note: request.leaveType.name,
        },
        update: { status: "LEAVE", note: request.leaveType.name },
      });
    }
  });

  revalidatePath("/time-off");
  revalidatePath("/attendance");
  revalidatePath("/employees");
  return success(decision === "APPROVED" ? "Request approved." : "Request rejected.");
}

/** An employee may withdraw their own request while it is still pending. */
export async function cancelLeaveAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const requestId = read(form, "requestId");
  if (!requestId) return failure("No request selected.");

  const request = await db.leaveRequest.findFirst({
    where: { id: requestId, employee: { companyId: actor.companyId } },
  });
  if (!request) return failure("That request no longer exists.");
  if (request.employeeId !== actor.id && !isManager(actor.role)) {
    return failure("You can only cancel your own requests.");
  }
  if (request.status !== "PENDING") return failure("Only a pending request can be cancelled.");

  await db.leaveRequest.update({ where: { id: request.id }, data: { status: "CANCELLED" } });
  revalidatePath("/time-off");
  return success("Request cancelled.");
}
