import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-500">Dayflow</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink-900">That page does not exist</h1>
        <p className="mt-1 text-sm text-ink-500">The link may be out of date, or the record may have been removed.</p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link href="/employees" className="btn-primary">
            Back to Employees
          </Link>
         
        </div>
      </div>
    </main>
  );
}
