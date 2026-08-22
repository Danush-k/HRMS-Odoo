import type { Metadata } from "next";
import Link from "next/link";

import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { NewEmployeeForm } from "./new-employee-form";

export const metadata: Metadata = { title: "New employee" };

export default async function NewEmployeePage() {
  const actor = await requireManager();

  const colleagues = await db.employee.findMany({
    where: { companyId: actor.companyId, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <nav className="flex items-center gap-1.5 text-sm text-ink-500">
        <Link href="/employees" className="hover:text-brand-600 hover:underline">
          Employees
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-ink-800">New</span>
      </nav>

      <div>
        <h1 className="text-xl font-semibold text-ink-900">Add an employee</h1>
        <p className="mt-1 text-sm text-ink-500">
          Dayflow issues the Login ID as{" "}
          <span className="mono text-brand-700">
            {actor.company.code}
            <span className="text-ink-400">·first two of each name·joining year·serial</span>
          </span>{" "}
          and generates a first password. Both are shown once, on save.
        </p>
      </div>

      <NewEmployeeForm
        actorRole={actor.role}
        colleagues={colleagues.map((person) => ({
          id: person.id,
          name: `${person.firstName} ${person.lastName}`,
        }))}
      />
    </div>
  );
}
