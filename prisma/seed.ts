/**
 * Seeds a demo company so the application is usable the moment it starts.
 * Safe to re-run: it clears the demo company first.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEMO_PASSWORD = "Dayflow@2026";
const COMPANY_CODE = "OI";

const LEAVE_TYPES = [
  { code: "PAID", name: "Paid Time Off", isPaid: true, defaultDays: 24, requiresAttachment: false, colour: "#7A3E6E" },
  { code: "SICK", name: "Sick Leave", isPaid: true, defaultDays: 7, requiresAttachment: true, colour: "#0E7490" },
  { code: "UNPAID", name: "Unpaid Leave", isPaid: false, defaultDays: 0, requiresAttachment: false, colour: "#B45309" },
];

const PEOPLE = [
  { firstName: "John", lastName: "Doe", role: "ADMIN", jobPosition: "Chief Operating Officer", department: "Management", wage: 180000, year: 2022 },
  { firstName: "Priya", lastName: "Raman", role: "HR", jobPosition: "HR Officer", department: "People", wage: 90000, year: 2022 },
  { firstName: "Arun", lastName: "Kumar", role: "EMPLOYEE", jobPosition: "Software Engineer", department: "Engineering", wage: 50000, year: 2023 },
  { firstName: "Meera", lastName: "Nair", role: "EMPLOYEE", jobPosition: "Functional Consultant", department: "Delivery", wage: 62000, year: 2023 },
  { firstName: "Sanjay", lastName: "Verma", role: "EMPLOYEE", jobPosition: "QA Engineer", department: "Engineering", wage: 45000, year: 2024 },
  { firstName: "Divya", lastName: "Iyer", role: "EMPLOYEE", jobPosition: "Business Analyst", department: "Delivery", wage: 58000, year: 2024 },
  { firstName: "Rahul", lastName: "Menon", role: "EMPLOYEE", jobPosition: "Support Engineer", department: "Support", wage: 38000, year: 2025 },
];

const initials = (value: string) => value.toUpperCase().replace(/[^A-Z]/g, "").padEnd(2, "X").slice(0, 2);
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

async function main() {
  const existing = await db.company.findUnique({ where: { code: COMPANY_CODE } });
  if (existing) await db.company.delete({ where: { id: existing.id } });

  const company = await db.company.create({
    data: {
      name: "Odoo India",
      code: COMPANY_CODE,
      leaveTypes: { create: LEAVE_TYPES },
    },
    include: { leaveTypes: true },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const serialByYear = new Map<number, number>();
  const created: { id: string; loginId: string; firstName: string; lastName: string; role: string }[] = [];

  for (const person of PEOPLE) {
    const serial = (serialByYear.get(person.year) ?? 0) + 1;
    serialByYear.set(person.year, serial);

    const loginId = `${COMPANY_CODE}${initials(person.firstName)}${initials(person.lastName)}${person.year}${String(serial).padStart(4, "0")}`;
    const dateOfJoining = new Date(person.year, 5, 1 + serial);

    const employee = await db.employee.create({
      data: {
        companyId: company.id,
        loginId,
        empCode: loginId,
        email: `${person.firstName}.${person.lastName}`.toLowerCase() + "@odooindia.example",
        passwordHash,
        mustChangePassword: false,
        role: person.role,
        firstName: person.firstName,
        lastName: person.lastName,
        jobPosition: person.jobPosition,
        department: person.department,
        location: "Chennai",
        mobile: `+91 90000 0${String(1000 + serial).slice(-4)}`,
        dateOfJoining,
        dateOfBirth: new Date(1995 + serial, 2, 12),
        nationality: "Indian",
        gender: ["Priya", "Meera", "Divya"].includes(person.firstName) ? "Female" : "Male",
        maritalStatus: serial % 2 === 0 ? "Married" : "Single",
        residingAddress: `${10 + serial} Anna Salai, Chennai 600002`,
        personalEmail: `${person.firstName.toLowerCase()}@example.com`,
        bankName: "State Bank of India",
        accountNumber: `3040${String(100000 + serial * 37)}`,
        ifscCode: "SBIN0001234",
        panNo: `ABCDE${String(1000 + serial)}F`,
        uanNo: `10${String(100000000 + serial * 13)}`,
        about: `${person.firstName} works as a ${person.jobPosition.toLowerCase()} at Odoo India.`,
        loveAboutJob: "Solving real operational problems for the teams who use what we build.",
        interests: "Cricket, long-distance cycling, and cooking.",
        skills: "Python\nPostgreSQL\nOdoo\nCommunication",
        certifications: "Odoo Functional Certification",
        salary: {
          create: {
            monthlyWage: person.wage,
            workingDaysPerWeek: 5,
            breakHours: 1,
          },
        },
      },
    });

    created.push({ ...employee });
  }

  // Everyone reports to the COO except the COO.
  const coo = created[0];
  await db.employee.updateMany({
    where: { companyId: company.id, NOT: { id: coo.id } },
    data: { managerId: coo.id },
  });

  const year = new Date().getFullYear();
  await db.leaveBalance.createMany({
    data: created.flatMap((employee) =>
      company.leaveTypes.map((type) => ({
        employeeId: employee.id,
        leaveTypeId: type.id,
        year,
        allocated: type.defaultDays,
        used: 0,
      })),
    ),
  });

  // Six weeks of attendance so the month views have something to show.
  const today = startOfDay(new Date());
  const attendance: {
    employeeId: string;
    date: Date;
    checkIn: Date;
    checkOut: Date;
    workedMinutes: number;
    status: string;
  }[] = [];

  for (let offset = 42; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    if (isWeekend(date)) continue;

    for (const [index, employee] of created.entries()) {
      // A deterministic sprinkle of absences and short days.
      const roll = (offset * 7 + index * 3) % 11;
      if (roll === 0) continue;

      const startHour = 9 + (roll % 2);
      const checkIn = new Date(date);
      checkIn.setHours(startHour, (roll * 5) % 60, 0, 0);

      const workedMinutes = roll === 1 ? 260 : 480 + ((roll * 11) % 70);
      const checkOut = new Date(checkIn.getTime() + (workedMinutes + 60) * 60_000);

      attendance.push({
        employeeId: employee.id,
        date,
        checkIn,
        checkOut,
        workedMinutes,
        status: workedMinutes >= 480 ? "PRESENT" : "HALF_DAY",
      });
    }
  }

  // Today stays open for the first employee so the check out widget has something to close.
  const openToday = attendance.find((row) => row.employeeId === created[2].id && row.date.getTime() === today.getTime());
  if (openToday) {
    openToday.checkOut = null as unknown as Date;
    openToday.workedMinutes = 0;
  }

  await db.attendance.createMany({ data: attendance });

  const paid = company.leaveTypes.find((type) => type.code === "PAID")!;
  const sick = company.leaveTypes.find((type) => type.code === "SICK")!;
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const lastMonth = new Date(today);
  lastMonth.setDate(lastMonth.getDate() - 20);

  await db.leaveRequest.createMany({
    data: [
      {
        employeeId: created[3].id,
        leaveTypeId: paid.id,
        startDate: startOfDay(nextWeek),
        endDate: startOfDay(new Date(nextWeek.getTime() + 2 * 86_400_000)),
        days: 3,
        remarks: "Family function out of town.",
        status: "PENDING",
      },
      {
        employeeId: created[4].id,
        leaveTypeId: sick.id,
        startDate: startOfDay(new Date(nextWeek.getTime() + 86_400_000)),
        endDate: startOfDay(new Date(nextWeek.getTime() + 86_400_000)),
        days: 1,
        remarks: "Fever, certificate to follow.",
        status: "PENDING",
      },
      {
        employeeId: created[5].id,
        leaveTypeId: paid.id,
        startDate: startOfDay(lastMonth),
        endDate: startOfDay(new Date(lastMonth.getTime() + 86_400_000)),
        days: 2,
        remarks: "Short break.",
        status: "APPROVED",
        reviewerId: created[1].id,
        reviewComment: "Approved, enjoy.",
        reviewedAt: new Date(),
      },
    ],
  });

  await db.leaveBalance.updateMany({
    where: { employeeId: created[5].id, leaveTypeId: paid.id, year },
    data: { used: 2 },
  });

  // Seed sample documents for employees
  const samplePdfData = "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA0NQo+PgpzdHJlYW0KQVQKL0YxIDI0IFRmCjEwMCA3MDAgVGROCihEYXlmbG93IEhSTVMgRG9jdW1lbnQpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE4IDAwMDAwIG4gCjAwMDAwMDAwNzcgMDAwMDAgbiAKMDAwMDAwMDEzNCAwMDAwMCBuIAowMDAwMDAwMjMwIDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNQovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKMzI1CiUlRU9GCg==";

  for (const emp of created.slice(0, 3)) {
    await db.document.createMany({
      data: [
        {
          employeeId: emp.id,
          name: "Offer Letter",
          type: "Employment",
          fileData: samplePdfData,
          fileType: "application/pdf",
          fileSize: 45200,
          createdAt: new Date(2026, 7, 20),
        },
        {
          employeeId: emp.id,
          name: "Joining Letter",
          type: "Employment",
          fileData: samplePdfData,
          fileType: "application/pdf",
          fileSize: 38100,
          createdAt: new Date(2026, 7, 20),
        },
        {
          employeeId: emp.id,
          name: "Identity Document",
          type: "Identity",
          fileData: samplePdfData,
          fileType: "application/pdf",
          fileSize: 52400,
          createdAt: new Date(2026, 7, 20),
        },
      ],
    });
  }

  console.log("\nSeeded Odoo India with %d employees.\n", created.length);
  console.log("  Sign in with any Login ID below and the password %s\n", DEMO_PASSWORD);
  for (const employee of created) {
    console.log(`  ${employee.loginId}  ${employee.role.padEnd(8)} ${employee.firstName} ${employee.lastName}`);
  }
  console.log("");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
