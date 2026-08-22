import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10%,var(--color-brand-100),transparent_65%)]"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-7 text-center">
          <Link href="/sign-in" className="inline-block">
            <span
              style={{ fontFamily: "var(--font-display)" }}
              className="text-4xl leading-none tracking-tight text-brand-700"
            >
              Dayflow
            </span>
          </Link>
          <p className="mt-1.5 text-sm text-ink-500">Every workday, perfectly aligned.</p>
        </div>

        {children}
      </div>
    </main>
  );
}
