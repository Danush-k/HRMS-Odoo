"use client";

import { useState, type ReactNode } from "react";

export type TabItem = { id: string; label: string; content: ReactNode };

export function Tabs({ items, initial }: { items: TabItem[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? items[0]?.id);
  const current = items.find((item) => item.id === active) ?? items[0];

  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-line px-1">
        {items.map((item) => {
          const selected = item.id === current?.id;
          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setActive(item.id)}
              className={`-mb-px rounded-t-md border-b-2 px-4 py-2.5 text-sm transition ${
                selected
                  ? "border-brand-600 font-semibold text-brand-700"
                  : "border-transparent font-medium text-ink-500 hover:text-ink-800"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="pt-5">
        {current?.content}
      </div>
    </div>
  );
}
