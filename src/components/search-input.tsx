"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function SearchInput({ placeholder = "Search", paramName = "q" }: { placeholder?: string; paramName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get(paramName) ?? "");

  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(paramName, value);
      else next.delete(paramName);
      next.delete("page");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full max-w-sm">
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="9" cy="9" r="5.5" />
        <path d="M13.5 13.5L17 17" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="field pl-8"
      />
    </div>
  );
}
