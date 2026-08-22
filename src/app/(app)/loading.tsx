export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-28 rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50/70 to-surface p-6 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-brand-100/60" />
          <div className="flex flex-col gap-2">
            <div className="h-6 w-48 rounded bg-brand-200/50" />
            <div className="h-4 w-32 rounded bg-brand-100/60" />
          </div>
        </div>
      </div>

      {/* 4 Stat Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4 rounded-xl border border-line bg-surface shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-ink-200" />
              <div className="h-8 w-8 rounded-lg bg-brand-50" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="h-7 w-12 rounded bg-ink-200" />
              <div className="h-3 w-16 rounded bg-ink-100" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Table / Grid Skeleton */}
      <div className="card rounded-xl border border-line bg-surface p-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-brand-100/80 bg-brand-50/70 p-3 rounded-lg mb-4">
          <div className="h-4 w-32 rounded bg-brand-200/60" />
          <div className="h-4 w-24 rounded bg-brand-200/60" />
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center justify-between py-2.5 border-b border-line/60">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-ink-200" />
                <div className="flex flex-col gap-1.5">
                  <div className="h-3.5 w-36 rounded bg-ink-200" />
                  <div className="h-2.5 w-24 rounded bg-ink-100" />
                </div>
              </div>
              <div className="h-3.5 w-20 rounded bg-ink-200" />
              <div className="h-3.5 w-16 rounded bg-ink-200" />
              <div className="h-6 w-16 rounded-full bg-brand-50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
