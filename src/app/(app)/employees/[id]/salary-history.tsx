import { formatCurrency } from "@/lib/salary";
import { formatDate } from "@/lib/dates";

export type SalaryRevisionRow = {
  id: string;
  monthlyWage: number;
  effectiveFrom: Date;
  effectiveTo: Date;
  changedBy: { firstName: string; lastName: string };
};

/**
 * Read-only. Every past structure this employee has had, most recent first,
 * with who ended it and the period it covered — the record updateSalaryAction
 * writes on every change that actually changes something.
 */
export function SalaryHistory({ revisions, currentSince }: { revisions: SalaryRevisionRow[]; currentSince: Date }) {
  if (revisions.length === 0) {
    return (
      <div className="card p-5">
        <p className="section-title">Change History</p>
        <p className="hint mt-2">No changes yet. Current structure has applied since {formatDate(currentSince)}.</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <p className="section-title">Change History</p>
      <p className="hint mt-1">Current structure has applied since {formatDate(currentSince)}.</p>

      <ul className="mt-4 flex flex-col divide-y divide-line">
        {revisions.map((revision) => (
          <li key={revision.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
            <div>
              <span className="mono font-medium text-ink-900">{formatCurrency(revision.monthlyWage)}</span>
              <span className="text-ink-500"> · {formatDate(revision.effectiveFrom)} – {formatDate(revision.effectiveTo)}</span>
            </div>
            <span className="text-xs text-ink-500">
              Changed by {revision.changedBy.firstName} {revision.changedBy.lastName}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
