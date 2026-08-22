"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type TabItem = { id: string; label: string; content: ReactNode };

export function Tabs({ items, initial }: { items: TabItem[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? items[0]?.id);
  const current = items.find((item) => item.id === active) ?? items[0];
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keep active valid if items change
  useEffect(() => {
    if (!items.some((item) => item.id === active) && items.length > 0) {
      setActive(items[0].id);
    }
  }, [items, active]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = items.findIndex((item) => item.id === current?.id);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        nextIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
        break;
      case "ArrowRight":
        e.preventDefault();
        nextIndex = currentIndex === items.length - 1 ? 0 : currentIndex + 1;
        break;
      case "Home":
        e.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        e.preventDefault();
        nextIndex = items.length - 1;
        break;
      default:
        break;
    }

    if (nextIndex !== null && items[nextIndex]) {
      const nextTab = items[nextIndex];
      setActive(nextTab.id);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div>
      <div
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
        className="flex flex-wrap gap-1 border-b border-line px-1"
      >
        {items.map((item, index) => {
          const selected = item.id === current?.id;
          return (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`tab-${item.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.id)}
              className={`-mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-sm transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 ${
                selected
                  ? "border-brand-600 font-bold text-brand-700 bg-brand-50/40"
                  : "border-transparent font-medium text-ink-500 hover:text-ink-900 hover:bg-ink-50/50"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {current ? (
        <div
          role="tabpanel"
          id={`panel-${current.id}`}
          aria-labelledby={`tab-${current.id}`}
          tabIndex={0}
          className="pt-5 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-brand-400"
        >
          {current.content}
        </div>
      ) : null}
    </div>
  );
}
