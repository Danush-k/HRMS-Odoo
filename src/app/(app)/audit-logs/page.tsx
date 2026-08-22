import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Avatar, EmptyState } from "@/components/ui";
import { isManager, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Audit Logs" };

export default async function AuditLogsPage() {
  const user = await requireUser();
  if (!isManager(user.role)) redirect("/employees");

  const logs = await db.auditLog.findMany({
    where: { companyId: user.companyId },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Audit Logs</h1>
        <p className="text-sm text-ink-500">
          System audit trail for manual attendance corrections, salary edits, and leave allocation adjustments.
        </p>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          title="No audit log entries"
          description="Audit entries are automatically recorded when HR/Admins modify attendance or leave allocations."
        />
      ) : (
        <div className="table-wrap">
          <table className="grid-table min-w-full text-xs">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target Type</th>
                <th>Target ID</th>
                <th>Changes Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                let parsedChanges: any = null;
                try {
                  parsedChanges = JSON.parse(log.changes);
                } catch {
                  parsedChanges = log.changes;
                }

                return (
                  <tr key={log.id}>
                    <td className="num font-medium text-ink-600">
                      {formatDate(log.createdAt)} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={log.actor.avatar}
                          name={`${log.actor.firstName} ${log.actor.lastName}`}
                          size={24}
                        />
                        <span className="font-medium text-ink-900">
                          {log.actor.firstName} {log.actor.lastName}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="rounded bg-brand-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="font-mono text-ink-600">{log.targetType}</td>
                    <td className="font-mono text-[11px] text-ink-400">{log.targetId}</td>
                    <td>
                      <pre className="max-w-md overflow-x-auto rounded bg-ink-50 p-1.5 font-mono text-[10px] text-ink-700 whitespace-pre-wrap">
                        {typeof parsedChanges === "object"
                          ? JSON.stringify(parsedChanges, null, 2)
                          : String(log.changes)}
                      </pre>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
