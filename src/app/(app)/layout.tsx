import { redirect } from "next/navigation";

import { TopNav } from "@/components/top-nav";
import { isManager, requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/constants";
import { dayKey } from "@/lib/dates";
import { db } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // Order matters: replace the system-issued password first, then confirm the
  // address (SRS 3.1.1). Both gates live here so no page can forget one.
  if (!user.emailVerifiedAt) redirect("/verify-email");

  const today = await db.attendance.findUnique({
    where: { employeeId_date: { employeeId: user.id, date: dayKey(new Date()) } },
  });

  const openSince = today?.checkIn && !today.checkOut ? today.checkIn.toISOString() : null;

  return (
    <div className="min-h-screen">
      <TopNav
        companyName={user.company.name}
        companyLogo={user.company.logo}
        checkedInSince={openSince}
        onLeaveToday={today?.status === "LEAVE"}
        isManager={isManager(user.role)}
        user={{
          name: `${user.firstName} ${user.lastName}`,
          loginId: user.loginId,
          roleLabel: ROLE_LABEL[user.role],
          avatar: user.avatar,
        }}
      />
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
