# Implementation Plan: L9 (Sick Leave Certificate Upload & Validation) & L10 (Public Holiday Calendar)

This document provides a file-by-file specification for implementing **L9** (Sick-leave certificate size/MIME validation and storage) and **L10** (Public holiday calendar management and leave deduction exclusion).

---

## Overview of Changes

### L9: Sick-Leave Certificate Attachment Validation & Local/Blob Storage
- **Goal:** Prevent base64 database bloat. Enforce file size $\le 5\text{MB}$ and MIME types (`image/png`, `image/jpeg`, `application/pdf`). Save files to local disk storage (`public/uploads/certificates/`) or Vercel Blob, storing file metadata in the `Document` model.
- **Affected Components:** Schema, Zod validations, Storage helper, Leave Server Action, Request Form UI.

### L10: Public Holiday Calendar Management & Leave Deduction Exclusion
- **Goal:** Allow Admin/HR to manage company public holidays. Exclude public holidays (along with weekends) when calculating deducted leave days and highlight holidays on the Time Off calendar.
- **Affected Components:** Schema, Date utilities, Holiday Server Action, Leave Server Action, Time Off UI & Calendar View.

---

## File-by-File Implementation Details

### 1. `prisma/schema.prisma`

#### [MODIFY] [schema.prisma](file:///c:/Users/Balakumaran/Downloads/HRMS-Odoo/prisma/schema.prisma)
Add `PublicHoliday` model and update `Company` relation.

```prisma
// 1. Add relation to Company model:
model Company {
  // ... existing fields ...
  publicHolidays PublicHoliday[]
}

// 2. Add PublicHoliday model at the bottom of schema.prisma:
model PublicHoliday {
  id          String   @id @default(cuid())
  companyId   String
  name        String   // e.g. "Independence Day", "Diwali", "New Year's Day"
  date        DateTime // Normalized UTC midnight date
  isRecurring Boolean  @default(false)
  createdAt   DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, date])
  @@index([companyId])
}
```

---

### 2. `src/lib/storage.ts`

#### [NEW] [storage.ts](file:///c:/Users/Balakumaran/Downloads/HRMS-Odoo/src/lib/storage.ts)
Helper module to handle file validation and local disk saving (with fallback for Vercel Blob).

```ts
import fs from "fs/promises";
import path from "path";

export const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "application/pdf"];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type SaveFileResult = {
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  name: string;
};

export async function saveUploadedFile(file: File): Promise<SaveFileResult> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Only PNG, JPEG, and PDF files are allowed.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File size exceeds 5 MB limit.");
  }

  // Generate unique filename
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileName = `${timestamp}_${safeName}`;

  // Local storage directory in public/uploads/certificates
  const uploadDir = path.join(process.cwd(), "public", "uploads", "certificates");
  await fs.mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return {
    fileUrl: `/uploads/certificates/${fileName}`,
    fileSize: file.size,
    mimeType: file.type,
    name: file.name,
  };
}
```

---

### 3. `src/lib/dates.ts`

#### [MODIFY] [dates.ts](file:///c:/Users/Balakumaran/Downloads/HRMS-Odoo/src/lib/dates.ts)
Update `countWorkingDays()` to accept an optional array of `publicHolidays` and exclude them from leave day deductions.

```ts
// Update countWorkingDays signature and logic:
export function countWorkingDays(start: Date, end: Date, publicHolidays: Date[] = []) {
  if (end < start) return 0;
  
  const holidaySet = new Set(publicHolidays.map((h) => isoDay(h)));

  return eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) })
    .filter((d) => !isWeekend(d) && !holidaySet.has(isoDay(d)))
    .length;
}

export function eachWorkingDay(start: Date, end: Date, publicHolidays: Date[] = []) {
  if (end < start) return [];
  const holidaySet = new Set(publicHolidays.map((h) => isoDay(h)));

  return eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) })
    .filter((d) => !isWeekend(d) && !holidaySet.has(isoDay(d)));
}
```

---

### 4. `src/server/actions/holidays.ts`

#### [NEW] [holidays.ts](file:///c:/Users/Balakumaran/Downloads/HRMS-Odoo/src/server/actions/holidays.ts)
Server actions for Admin/HR to add, edit, and delete public holidays.

```ts
"use server";

import { revalidatePath } from "next/cache";
import z from "zod";

import { isManager, requireUser } from "@/lib/auth";
import { dayKey } from "@/lib/dates";
import { db } from "@/lib/db";
import { failure, success, type ActionState } from "@/lib/action-state";

const holidaySchema = z.object({
  name: z.string().min(2, "Holiday name must be at least 2 characters"),
  date: z.string().min(1, "Date is required"),
  isRecurring: z.boolean().optional(),
});

export async function addPublicHolidayAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireUser();
  if (!isManager(actor.role)) return failure("Only HR/Admin can manage public holidays.");

  const name = form.get("name") as string;
  const dateStr = form.get("date") as string;
  const isRecurring = form.get("isRecurring") === "on";

  const parsed = holidaySchema.safeParse({ name, date: dateStr, isRecurring });
  if (!parsed.success) return failure("Invalid holiday details.");

  const holidayDate = dayKey(parsed.data.date);

  const existing = await db.publicHoliday.findUnique({
    where: { companyId_date: { companyId: actor.companyId, date: holidayDate } },
  });
  if (existing) return failure("A public holiday already exists on this date.");

  await db.publicHoliday.create({
    data: {
      companyId: actor.companyId,
      name: parsed.data.name,
      date: holidayDate,
      isRecurring: Boolean(isRecurring),
    },
  });

  revalidatePath("/time-off");
  return success("Public holiday added successfully.");
}

export async function deletePublicHolidayAction(holidayId: string): Promise<ActionState> {
  const actor = await requireUser();
  if (!isManager(actor.role)) return failure("Only HR/Admin can delete public holidays.");

  await db.publicHoliday.deleteMany({
    where: { id: holidayId, companyId: actor.companyId },
  });

  revalidatePath("/time-off");
  return success("Holiday deleted.");
}
```

---

### 5. `src/server/actions/timeoff.ts`

#### [MODIFY] [timeoff.ts](file:///c:/Users/Balakumaran/Downloads/HRMS-Odoo/src/server/actions/timeoff.ts)
Integrate file upload handling for sick leave (L9) and public holiday exclusion (L10).

```ts
// 1. In requestLeaveAction:
// Handle file attachment upload if file is present
const attachmentFile = form.get("attachmentFile") as File | null;
let savedDocumentId: string | null = null;
let fileUrl: string | null = null;

if (leaveType.requiresAttachment) {
  if (!attachmentFile || attachmentFile.size === 0) {
    return failure("A certificate attachment is required for sick leave.");
  }
  
  const saved = await saveUploadedFile(attachmentFile);
  fileUrl = saved.fileUrl;

  const doc = await db.document.create({
    data: {
      employeeId,
      name: saved.name,
      category: "MEDICAL",
      fileUrl: saved.fileUrl,
      fileSize: saved.fileSize,
      mimeType: saved.mimeType,
    },
  });
  savedDocumentId = doc.id;
}

// 2. Fetch company public holidays for the requested date interval (L10):
const holidays = await db.publicHoliday.findMany({
  where: {
    companyId: actor.companyId,
    date: { gte: start, lte: end },
  },
});
const holidayDates = holidays.map((h) => h.date);

// Calculate working days excluding weekends AND public holidays:
const days = countWorkingDays(start, end, holidayDates);
```

---

### 6. `src/app/(app)/time-off/holiday-manager.tsx`

#### [NEW] [holiday-manager.tsx](file:///c:/Users/Balakumaran/Downloads/HRMS-Odoo/src/app/(app)/time-off/holiday-manager.tsx)
UI component for HR to view and add public holidays.

```tsx
"use client";

import { useActionState } from "react";
import { addPublicHolidayAction, deletePublicHolidayAction } from "@/server/actions/holidays";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui";

type Holiday = { id: string; name: string; date: Date };

export function HolidayManager({ holidays, isHR }: { holidays: Holiday[]; isHR: boolean }) {
  const [state, action] = useActionState(addPublicHolidayAction, { ok: true });

  return (
    <div className="card p-5 flex flex-col gap-4">
      <h3 className="text-base font-semibold text-ink-900">Public Holidays Calendar</h3>

      {isHR ? (
        <form action={action} className="flex flex-wrap items-end gap-3 border-b border-line pb-4">
          <FormMessage state={state} />
          <Field label="Holiday Name" name="name" required>
            <Input name="name" placeholder="e.g. Independence Day" required />
          </Field>          <Field label="Date" name="date" required>
            <Input name="date" type="date" required />
          </Field>
          <SubmitButton className="btn-primary">Add Holiday</SubmitButton>
        </form>
      ) : null}

      <div className="flex flex-col gap-2">
        {holidays.length === 0 ? (
          <p className="text-sm text-ink-500">No public holidays added yet.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {holidays.map((h) => (
              <li key={h.id} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-medium text-ink-900">{h.name}</span>
                  <span className="ml-2 text-xs text-ink-500">
                    {new Date(h.date).toLocaleDateString("en-US", { dateStyle: "medium" })}
                  </span>
                </div>
                {isHR ? (
                  <button
                    type="button"
                    onClick={() => deletePublicHolidayAction(h.id)}
                    className="text-xs text-danger hover:underline"
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

---

### 7. `src/app/(app)/time-off/calendar-view.tsx`

#### [MODIFY] [calendar-view.tsx](file:///c:/Users/Balakumaran/Downloads/HRMS-Odoo/src/app/(app)/time-off/calendar-view.tsx)
Highlight public holidays with distinct badges on the calendar.

```tsx
// Accept publicHolidays prop in TimeOffCalendarView:
type PublicHolidayItem = { id: string; name: string; date: Date };

export function TimeOffCalendarView({
  requests,
  publicHolidays = [],
}: {
  requests: LeaveRequestItem[];
  publicHolidays?: PublicHolidayItem[];
}) {
  // Inside the monthDays mapping:
  const isHoliday = publicHolidays.find((ph) => isoDay(ph.date) === key);

  return (
    // ... inside day cell:
    <div className={`h-24 rounded border p-1 ${isHoliday ? "bg-purple-50 border-purple-300" : ""}`}>
      {isHoliday ? (
        <span className="inline-block rounded bg-purple-600 px-1 py-0.5 text-[9px] text-white font-medium" title={isHoliday.name}>
          🎉 {isHoliday.name}
        </span>
      ) : null}
    </div>
  );
}
```

---

## Verification Steps After Implementation

1. **Database Migration:**
   Run `npx prisma db push` to add `PublicHoliday` table to `dev.db`.
2. **Test Sick Leave Attachment (L9):**
   - Apply for Sick Leave and attach a PDF or PNG file.
   - Verify file is saved in `public/uploads/certificates/`.
   - Verify `Document` table row has `mimeType` (`application/pdf`) and `fileSize`.
3. **Test Public Holiday Exclusion (L10):**
   - Log in as HR and add a Public Holiday (e.g. Nov 9).
   - Apply for leave spanning Nov 6 to Nov 10.
   - Verify working days calculated subtracts both weekend days and Nov 9.
   - Verify Nov 9 displays a holiday badge on the Time Off Calendar.
