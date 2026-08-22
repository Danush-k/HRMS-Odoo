"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DayflowLogoMark } from "./brand-icons";
import { AttendanceWidget } from "./attendance-widget";
import { UserMenu } from "./user-menu";

const LINKS = [
  { href: "/employees", label: "Dashboard" },
  { href: "/attendance", label: "Attendance" },
  { href: "/time-off", label: "Time Off" },
  { href: "/payroll", label: "Payroll" },
];

export function TopNav({
  companyName,
  companyLogo,
  user,
  checkedInSince,
  onLeaveToday,
  isManager = false,
}: {
  companyName: string;
  companyLogo: string | null;
  user: { name: string; loginId: string; roleLabel: string; avatar: string | null };
  checkedInSince: string | null;
  onLeaveToday: boolean;
  isManager?: boolean;
}) {
  const pathname = usePathname();

  const links = [
    ...LINKS,
    ...(isManager
      ? [
          { href: "/reports", label: "Analytics & Reports" },
          { href: "/audit-logs", label: "Audit Logs" },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-brand-900/40 bg-brand-700 text-white">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-1 px-4 sm:px-6">
        <Link href="/employees" className="mr-3 flex shrink-0 items-center gap-2.5">
          {companyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={companyLogo} alt="" className="h-7 w-7 rounded-lg object-cover shadow-2xs" />
          ) : (
            <DayflowLogoMark size={28} className="rounded-lg shadow-2xs shrink-0" />
          )}
          <span className="hidden max-w-[180px] truncate text-sm font-bold tracking-tight sm:block">{companyName}</span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Main">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-white/18 font-semibold text-white shadow-2xs"
                    : "font-medium text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <AttendanceWidget checkedInSince={checkedInSince} onLeaveToday={onLeaveToday} />
          <UserMenu {...user} />
        </div>
      </div>
    </header>
  );
}
