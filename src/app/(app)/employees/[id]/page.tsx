import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Tabs } from "@/components/tabs";
import { Avatar, LeaveChip } from "@/components/ui";
import { canEditEmployee, canEditSalary, canViewSalary, isManager, requireUser } from "@/lib/auth";
import { ROLE_LABEL, type Role } from "@/lib/constants";
import { formatDate, inputDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { ChangePasswordForm } from "../../profile/change-password-form";
import { DetailsForm } from "./details-form";
import { PrivateInfoForm } from "./private-info-form";
import { ResumeForm } from "./resume-form";
import { SalaryForm } from "./salary-form";

export const metadata: Metadata = { title: "Employee" };

const text = (value: string | null | undefined) => value ?? "";

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireUser();

  const employee = await db.employee.findFirst({
    where: { id, companyId: viewer.companyId },
    include: { salary: true, manager: true, company: true },
  });

  if (!employee) notFound();

  const isSelf = viewer.id === employee.id;
  const managerView = isManager(viewer.role);
  const canEdit = canEditEmployee(viewer, employee.id);
  const showSalary = canViewSalary(viewer, employee.id);

  const colleagues = managerView
    ? await db.employee.findMany({
        where: { companyId: viewer.companyId, status: "ACTIVE", NOT: { id: employee.id } },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { firstName: "asc" },
      })
    : [];

  const recentLeave = await db.leaveRequest.findMany({
    where: { employeeId: employee.id },
    include: { leaveType: true },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const salary = employee.salary;

  const tabs = [
    {
      id: "resume",
      label: "Resume",
      content: (
        <ResumeForm
          employeeId={employee.id}
          canEdit={canEdit}
          values={{
            about: text(employee.about),
            loveAboutJob: text(employee.loveAboutJob),
            interests: text(employee.interests),
            skills: text(employee.skills),
            certifications: text(employee.certifications),
          }}
        />
      ),
    },
    {
      id: "private",
      label: "Private Info",
      content: (
        <PrivateInfoForm
          employeeId={employee.id}
          canEdit={canEdit}
          isManager={managerView}
          values={{
            dateOfBirth: inputDate(employee.dateOfBirth),
            residingAddress: text(employee.residingAddress),
            nationality: text(employee.nationality),
            personalEmail: text(employee.personalEmail),
            gender: text(employee.gender),
            maritalStatus: text(employee.maritalStatus),
            dateOfJoining: inputDate(employee.dateOfJoining),
            accountNumber: text(employee.accountNumber),
            bankName: text(employee.bankName),
            ifscCode: text(employee.ifscCode),
            panNo: text(employee.panNo),
            uanNo: text(employee.uanNo),
            empCode: text(employee.empCode),
          }}
        />
      ),
    },
  ];

  if (showSalary) {
    tabs.push({
      id: "salary",
      label: "Salary Info",
      content: (
        <SalaryForm
          employeeId={employee.id}
          canEdit={canEditSalary(viewer.role)}
          initial={{
            monthlyWage: salary?.monthlyWage ?? 0,
            workingDaysPerWeek: salary?.workingDaysPerWeek ?? 5,
            breakHours: salary?.breakHours ?? 1,
            basicPercent: salary?.basicPercent ?? 50,
            hraPercentOfBasic: salary?.hraPercentOfBasic ?? 50,
            standardAllowancePercent: salary?.standardAllowancePercent ?? 16.67,
            performanceBonusPercent: salary?.performanceBonusPercent ?? 8.33,
            ltaPercent: salary?.ltaPercent ?? 8.33,
            pfPercent: salary?.pfPercent ?? 12,
            professionalTax: salary?.professionalTax ?? 200,
          }}
        />
      ),
    });
  }

  if (isSelf) {
    tabs.push({
      id: "security",
      label: "Security",
      content: (
        <div className="card p-5 sm:p-6">
          <p className="section-title">Change your password</p>
          <p className="hint mt-1 mb-5">
            Signed in as <span className="mono font-semibold text-brand-700">{employee.loginId}</span>
          </p>
          <ChangePasswordForm />
        </div>
      ),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <nav className="flex items-center gap-1.5 text-sm text-ink-500">
        <Link href="/employees" className="hover:text-brand-600 hover:underline">
          Employees
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-ink-800">
          {isSelf ? "My Profile" : `${employee.firstName} ${employee.lastName}`}
        </span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar src={employee.avatar} name={`${employee.firstName} ${employee.lastName}`} size={44} />
          <div>
            <h1 className="text-xl font-semibold text-ink-900">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-sm text-ink-500">
              {employee.jobPosition || "No job position"} · {ROLE_LABEL[employee.role as Role]}
              {employee.status === "INACTIVE" ? <span className="ml-2 text-danger">Inactive</span> : null}
            </p>
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="label">Login ID</dt>
            <dd className="mono font-semibold text-brand-700">{employee.loginId}</dd>
          </div>
          <div>
            <dt className="label">Joined</dt>
            <dd className="num text-ink-800">{formatDate(employee.dateOfJoining)}</dd>
          </div>
          <div>
            <dt className="label">Manager</dt>
            <dd className="text-ink-800">
              {employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : "—"}
            </dd>
          </div>
        </dl>
      </div>

      <DetailsForm
        canEdit={canEdit}
        isManager={managerView}
        colleagues={colleagues.map((person) => ({
          id: person.id,
          name: `${person.firstName} ${person.lastName}`,
        }))}
        values={{
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          jobPosition: text(employee.jobPosition),
          loginId: employee.loginId,
          email: employee.email,
          mobile: text(employee.mobile),
          avatar: employee.avatar,
          companyName: employee.company.name,
          department: text(employee.department),
          location: text(employee.location),
          managerId: text(employee.managerId),
          role: employee.role,
          status: employee.status,
        }}
      />

      <div className="card px-5 pt-1 pb-5 sm:px-6">
        <Tabs items={tabs} />
      </div>

      {recentLeave.length > 0 ? (
        <section className="card p-5">
          <p className="section-title">Recent time off</p>
          <ul className="mt-3 flex flex-col divide-y divide-line">
            {recentLeave.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="text-ink-800">{request.leaveType.name}</span>
                <span className="num text-ink-500">
                  {formatDate(request.startDate)} → {formatDate(request.endDate)} · {request.days}d
                </span>
                <LeaveChip status={request.status} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
