"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AttendanceWidget } from "./attendance-widget";
import { UserMenu } from "./user-menu";

const LINKS = [
  { href: "/employees", label: "Employees" },
  { href: "/attendance", label: "Attendance" },
  { href: "/time-off", label: "Time Off" },
];

export function TopNav({
  companyName,
  companyLogo,
  user,
  checkedInSince,
  onLeaveToday,
}: {
  companyName: string;
  companyLogo: string | null;
  user: { name: string; loginId: string; roleLabel: string; avatar: string | null };
  checkedInSince: string | null;
  onLeaveToday: boolean;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-brand-900/40 bg-brand-700 text-white">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-1 px-4 sm:px-6">
        <Link href="/employees" className="mr-3 flex shrink-0 items-center gap-2">
          {companyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={companyLogo} alt="" className="h-7 w-7 rounded object-cover" />
          ) : (
            <span className="grid h-7 w-7 place-items-center rounded bg-white/15 text-xs font-bold">
              {companyName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="hidden max-w-[180px] truncate text-sm font-semibold sm:block">{companyName}</span>
        </Link>

        <nav className="flex items-center gap-0.5" aria-label="Main">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded px-3 py-1.5 text-sm transition ${
                  active ? "bg-white/15 font-semibold text-white" : "font-medium text-white/75 hover:bg-white/10"
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
