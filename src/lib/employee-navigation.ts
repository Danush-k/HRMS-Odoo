import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { dayKey } from "@/lib/dates";

export type AdjacentEmployee = {
  id: string;
  name: string;
};

export type EmployeeNavigationMeta = {
  current: number;
  total: number;
  previous: AdjacentEmployee | null;
  next: AdjacentEmployee | null;
  hasFilter: boolean;
  activeTab?: string;
  queryParams: Record<string, string>;
};

/**
 * Computes server-side navigation metadata for an employee profile,
 * adhering to the company tenancy, search query, status filters, and active tab.
 */
export async function getEmployeeNavigationMeta({
  companyId,
  currentEmployeeId,
  searchParams,
}: {
  companyId: string;
  currentEmployeeId: string;
  searchParams?: { q?: string; status?: string; tab?: string };
}): Promise<EmployeeNavigationMeta> {
  const q = searchParams?.q?.trim();
  const status = searchParams?.status?.trim() || "ALL";
  const activeTab = searchParams?.tab?.trim();

  const where: Prisma.EmployeeWhereInput = {
    companyId,
  };

  if (q) {
    const words = q.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      const w = words[0];
      where.OR = [
        { firstName: { contains: w } },
        { lastName: { contains: w } },
        { loginId: { contains: w } },
        { email: { contains: w } },
        { jobPosition: { contains: w } },
        { department: { contains: w } },
      ];
    } else {
      const firstWord = words[0];
      const lastWord = words.slice(1).join(" ");
      where.OR = [
        {
          AND: [
            { firstName: { contains: firstWord } },
            { lastName: { contains: lastWord } },
          ],
        },
        {
          AND: [
            { firstName: { contains: lastWord } },
            { lastName: { contains: firstWord } },
          ],
        },
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { loginId: { contains: q } },
        { email: { contains: q } },
        { jobPosition: { contains: q } },
        { department: { contains: q } },
      ];
    }
  }

  // Attendance status filter awareness if status filter is active
  if (status !== "ALL") {
    const today = dayKey(new Date());
    const allTodayAttendance = await db.attendance.findMany({
      where: {
        date: today,
        employee: { companyId },
      },
      select: { employeeId: true, status: true, checkIn: true, checkOut: true },
    });

    const statusMap = new Map<string, "PRESENT" | "LEAVE" | "ABSENT" | "HALF_DAY">();
    for (const row of allTodayAttendance) {
      if (row.status === "LEAVE") {
        statusMap.set(row.employeeId, "LEAVE");
      } else if (row.status === "HALF_DAY") {
        statusMap.set(row.employeeId, "HALF_DAY");
      } else if (row.checkIn && !row.checkOut) {
        statusMap.set(row.employeeId, "PRESENT");
      } else if (row.status === "PRESENT") {
        statusMap.set(row.employeeId, "PRESENT");
      } else {
        statusMap.set(row.employeeId, "ABSENT");
      }
    }

    if (status === "PRESENT") {
      const presentEmpIds = Array.from(statusMap.entries())
        .filter(([_, st]) => st === "PRESENT" || st === "HALF_DAY")
        .map(([id]) => id);
      where.id = { in: presentEmpIds };
    } else if (status === "LEAVE") {
      const leaveEmpIds = Array.from(statusMap.entries())
        .filter(([_, st]) => st === "LEAVE")
        .map(([id]) => id);
      where.id = { in: leaveEmpIds };
    } else if (status === "HALF_DAY") {
      const halfDayEmpIds = Array.from(statusMap.entries())
        .filter(([_, st]) => st === "HALF_DAY")
        .map(([id]) => id);
      where.id = { in: halfDayEmpIds };
    } else if (status === "ABSENT") {
      const nonAbsentEmpIds = Array.from(statusMap.entries())
        .filter(([_, st]) => st === "PRESENT" || st === "HALF_DAY" || st === "LEAVE")
        .map(([id]) => id);
      where.id = { notIn: nonAbsentEmpIds };
    }
  }

  // Fetch only lightweight identifiers ordered exactly as the employee list
  const list = await db.employee.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
    orderBy: [{ status: "asc" }, { firstName: "asc" }],
  });

  const total = list.length;
  const index = list.findIndex((e) => e.id === currentEmployeeId);

  const queryParams: Record<string, string> = {};
  if (q) queryParams.q = q;
  if (status && status !== "ALL") queryParams.status = status;
  if (activeTab) queryParams.tab = activeTab;

  if (index === -1) {
    // Current employee was not in the filtered list (e.g. navigated directly or filtered out)
    return {
      current: 1,
      total,
      previous: null,
      next: total > 0 ? { id: list[0].id, name: `${list[0].firstName} ${list[0].lastName}`.trim() } : null,
      hasFilter: Boolean(q || (status && status !== "ALL")),
      activeTab,
      queryParams,
    };
  }

  const prevEmp = index > 0 ? list[index - 1] : null;
  const nextEmp = index < total - 1 ? list[index + 1] : null;

  return {
    current: index + 1,
    total,
    previous: prevEmp ? { id: prevEmp.id, name: `${prevEmp.firstName} ${prevEmp.lastName}`.trim() } : null,
    next: nextEmp ? { id: nextEmp.id, name: `${nextEmp.firstName} ${nextEmp.lastName}`.trim() } : null,
    hasFilter: Boolean(q || (status && status !== "ALL")),
    activeTab,
    queryParams,
  };
}
