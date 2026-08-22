import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Tabs } from "@/components/tabs";
import { Avatar, LeaveChip } from "@/components/ui";
import { canEditEmployee, canEditSalary, canViewDocuments, canViewPrivateInfo, canViewSalary, isManager, requireUser } from "@/lib/auth";
import { ROLE_LABEL, type Role } from "@/lib/constants";
import { formatDate, inputDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { ChangePasswordForm } from "../../profile/change-password-form";
import { DetailsForm } from "./details-form";
import { DocumentsSection } from "./documents-section";
import { PrivateInfoForm } from "./private-info-form";
import { ResumeForm } from "./resume-form";
import { ResetPasswordPanel } from "./reset-password-panel";
import { SalaryForm } from "./salary-form";

export const metadata: Metadata = { title: "Employee" };

const text = (value: string | null | undefined) => value ?? "";

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireUser();

  const isSelf = viewer.id === id;
  const managerView = isManager(viewer.role);
  const canEdit = canEditEmployee(viewer, id);
  const showSalary = canViewSalary(viewer, id);
  const showPrivate = canViewPrivateInfo(viewer, id);
  const canViewDocs = canViewDocuments(viewer, id);

  const employee = await db.employee.findFirst({
    where: { id, companyId: viewer.companyId },
    select: {
      id: true,
      companyId: true,
      loginId: true,
      email: true,
      emailVerifiedAt: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true,
      jobPosition: true,
      department: true,
      location: true,
      mobile: true,
      avatar: true,
      managerId: true,
      dateOfJoining: true,
      about: true,
      loveAboutJob: true,
      interests: true,
      skills: true,
      certifications: true,
      company: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      manager: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      ...(showSalary ? { salary: true } : {}),
      ...(showPrivate
        ? {
            dateOfBirth: true,
            residingAddress: true,
            nationality: true,
            personalEmail: true,
            gender: true,
            maritalStatus: true,
            accountNumber: true,
            bankName: true,
            ifscCode: true,
            panNo: true,
            uanNo: true,
            empCode: true,
          }
        : {}),
    },
  });

  if (!employee) notFound();

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

  const salary = "salary" in employee ? (employee.salary as {
    monthlyWage: number;
    workingDaysPerWeek: number;
    breakHours: number;
    basicPercent: number;
    hraPercentOfBasic: number;
    standardAllowancePercent: number;
    performanceBonusPercent: number;
    ltaPercent: number;
    pfPercent: number;
    professionalTax: number;
  } | null) : null;

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
  ];

  if (showPrivate) {
    const priv = employee as typeof employee & {
      dateOfBirth?: Date | null;
      residingAddress?: string | null;
      nationality?: string | null;
      personalEmail?: string | null;
      gender?: string | null;
      maritalStatus?: string | null;
      accountNumber?: string | null;
      bankName?: string | null;
      ifscCode?: string | null;
      panNo?: string | null;
      uanNo?: string | null;
      empCode?: string | null;
    };

    tabs.push({
      id: "private",
      label: "Private Info",
      content: (
        <PrivateInfoForm
          employeeId={employee.id}
          canEdit={canEdit}
          isManager={managerView}
          values={{
            dateOfBirth: inputDate(priv.dateOfBirth),
            residingAddress: text(priv.residingAddress),
            nationality: text(priv.nationality),
            personalEmail: text(priv.personalEmail),
            gender: text(priv.gender),
            maritalStatus: text(priv.maritalStatus),
            dateOfJoining: inputDate(employee.dateOfJoining),
            accountNumber: text(priv.accountNumber),
            bankName: text(priv.bankName),
            ifscCode: text(priv.ifscCode),
            panNo: text(priv.panNo),
            uanNo: text(priv.uanNo),
            empCode: text(priv.empCode),
          }}
        />
      ),
    });
  }

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

  if (canViewDocs) {
    const documents = await db.document.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: "desc" },
    });

    tabs.push({
      id: "documents",
      label: "Documents",
      content: (
        <DocumentsSection
          employeeId={employee.id}
          isSelf={isSelf}
          canUpload={isSelf || isManager(viewer.role)}
          canDelete={isSelf || isManager(viewer.role)}
          documents={documents}
        />
      ),
    });
  }

  if (isSelf || managerView) {
    tabs.push({
      id: "security",
      label: "Security",
      content: (
        <div className="card p-5 sm:p-6">
          <p className="section-title">{isSelf ? "Change your password" : "Reset this password"}</p>
          <p className="hint mt-1 mb-5">
            <span className="mono font-semibold text-brand-700">{employee.loginId}</span>
            {employee.emailVerifiedAt ? (
              <span className="ml-2 text-present">Email confirmed</span>
            ) : (
              <span className="ml-2 text-absent">Email not yet confirmed</span>
            )}
          </p>
          {isSelf ? (
            <ChangePasswordForm />
          ) : (
            <ResetPasswordPanel
              employeeId={employee.id}
              employeeName={`${employee.firstName} ${employee.lastName}`}
            />
          )}
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
          {employee.role === "EMPLOYEE" ? (
            <div>
              <dt className="label">Manager</dt>
              <dd className="text-ink-800">
                {employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : "—"}
              </dd>
            </div>
          ) : null}
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
