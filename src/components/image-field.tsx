"use client";

import { useRef, useState } from "react";

import { Avatar } from "./ui";

const MAX_BYTES = 1_500_000;

/**
 * Reads an image straight into a data URL so the MVP has no object-storage
 * dependency. Swap the hidden value for an upload URL when object storage lands.
 */
export function ImageField({
  name,
  label,
  initial,
  fallbackName,
  size = 84,
  round = true,
}: {
  name: string;
  label: string;
  initial?: string | null;
  fallbackName: string;
  size?: number;
  round?: boolean;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That image is over 1.5 MB. Choose a smaller one.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setValue(String(reader.result));
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name={name} value={value} />

      {round ? (
        <Avatar src={value || null} name={fallbackName} size={size} />
      ) : value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" style={{ height: size, width: size }} className="rounded-md border border-line object-cover" />
      ) : (
        <span
          style={{ height: size, width: size }}
          className="grid place-items-center rounded-md border border-dashed border-ink-300 text-[11px] text-ink-400"
        >
          No logo
        </span>
      )}

      <div className="flex flex-col items-start gap-1.5">
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => pick(event.target.files?.[0])}
        />
        <div className="flex gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={() => input.current?.click()}>
            {value ? "Replace" : label}
          </button>
          {value ? (
            <button type="button" className="btn-ghost btn-sm" onClick={() => setValue("")}>
              Remove
            </button>
          ) : null}
        </div>
        {error ? <p className="error-text">{error}</p> : <p className="hint">PNG or JPG, up to 1.5 MB.</p>}
      </div>
    </div>
  );
}
