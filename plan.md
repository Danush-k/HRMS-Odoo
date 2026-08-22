# Implementation Plan: HRMS Dayflow - Setup Foundation, Attendance & Leave Bug Fixes and Feature Completion

## Overview
This document contains the verification analysis and technical plan for fixing bugs and completing missing requirements in the **Setup (Foundation)**, **Attendance Workflow**, and **Leave Management Workflow** of Dayflow HRMS, based on:
1. `Dayflow - Human Resource Management System.pdf` (Primary SRS Document)
2. User wireframe execution designs (`Screenshot 102947`, `103000`, `103006`, `103020`, `103029`)
3. Codebase audit against the `setup` and `attendance` branches.

---

## 1. Setup & Foundation Audit (SRS & Foundation Setup)

### Bug Verification & Solutions

#### S1 (High): Zero tests in project
- **Verification:** **TRUE.** No testing dependencies (`vitest`, `playwright`, `jest`) or test files exist in `package.json` or source tree.
- **Solution:**
  - Install `vitest` for fast server-side unit tests and `@playwright/test` for E2E browser tests.
  - Add unit test coverage for salary breakdown math (`src/lib/salary.ts`), date/leave day calculations (`src/lib/dates.ts`), attendance status derivation (`src/lib/attendance.ts`), and RBAC guards (`src/lib/auth.ts`).
  - Add E2E flow tests for authentication, check-in/out, and leave application/approval.
  - Add `"test": "vitest run"` and `"test:e2e": "playwright test"` to `package.json`.

#### S2 (High): Missing CI workflow
- **Verification:** **TRUE.** No `.github/workflows` directory exists.
- **Solution:**
  - Create `.github/workflows/ci.yml`.
  - Workflow will run on pull requests to `main`, executing: `npm ci`, `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.

#### S3 (Medium): Database migrations missing (`db push` only)
- **Verification:** **TRUE.** `prisma/migrations` does not exist; scripts rely solely on `prisma db push`.
- **Solution:**
  - Create baseline migration using `npx prisma migrate dev --name init`.
  - Update `package.json` scripts: change `"setup"` to `prisma generate && prisma migrate dev && npm run db:seed` and add `"db:migrate": "prisma migrate dev"`.

#### S4 (Low): Deprecated `package.json#prisma` seed configuration
- **Verification:** **TRUE.** `package.json` contains `"prisma": { "seed": "tsx prisma/seed.ts" }`, which triggers CLI deprecation warnings in Prisma 6+.
- **Solution:**
  - Move seed configuration to `prisma.config.ts` (or standard Prisma CLI config) to eliminate deprecation warnings.

#### S5 (Medium): Missing ESLint & Prettier configuration files
- **Verification:** **TRUE.** `package.json` has `"lint": "next lint"`, but no `.eslintrc.json`, `eslint.config.mjs`, or `.prettierrc` file is committed.
- **Solution:**
  - Commit `eslint.config.mjs` extending `eslint-config-next`.
  - Commit `.prettierrc` and `.prettierignore`. Add `"format": "prettier --write ."` to `package.json`.

#### S6 (Medium): Missing `Document` and `AuditLog` models in `schema.prisma`
- **Verification:** **TRUE.** Schema lacks entities for employee documents/certificates (P2) and system audit logs (T8, Y3).
- **Solution:**
  - Update `prisma/schema.prisma` with:
    - `Document` model: `id`, `employeeId`, `name`, `category`, `fileUrl`, `fileSize`, `mimeType`, `uploadedAt`.
    - `AuditLog` model: `id`, `companyId`, `actorId`, `action`, `targetType`, `targetId`, `changes`, `createdAt`.
    - `PublicHoliday` model: `id`, `companyId`, `name`, `date`, `isRecurring`.

#### Additional Setup Issues Identified:
- **S7 (Medium): Missing Email Verification during Sign Up:** SRS 3.1.1 mandates email verification. Sign up currently logs users in directly.
- **S8 (Low): Password Complexity Rules:** `src/lib/validations.ts` only enforces minimum 8 characters; missing symbol, uppercase, and digit checks specified in SRS 3.1.1.

---

## 2. Attendance Workflow Audit (SRS 3.4 & Wireframes)

### Bug Verification & Solutions

#### T1 (High): Weekly attendance view missing
- **Verification:** **TRUE.** SRS 3.4.1 specifies "Daily and weekly attendance views." Currently, `AttendancePage` only supports Daily (Team) and Monthly (Self) views.
- **Solution:**
  - Build `WeeklyGrid` component in `src/app/(app)/attendance/page.tsx` allowing toggle between Daily, Weekly, and Monthly views for both employees and HR/Admin.

#### T2 (High): Half-day threshold logic is dead code
- **Verification:** **TRUE.** In `src/lib/attendance.ts` lines 12-13:
  `if (hours >= HALF_DAY_THRESHOLD_HOURS) return "HALF_DAY";`
  `if (hours > 0) return "HALF_DAY";`
  Both return `"HALF_DAY"`, rendering `HALF_DAY_THRESHOLD_HOURS` useless. Work durations under 4 hours (e.g. 15 mins) incorrectly return `"HALF_DAY"` instead of `"ABSENT"`.
- **Solution:**
  - Update `deriveStatus()` in `src/lib/attendance.ts`:
    ```ts
    if (hours >= standardHours) return "PRESENT";
    if (hours >= HALF_DAY_THRESHOLD_HOURS) return "HALF_DAY";
    return "ABSENT";
    ```

#### T3 (High): Open check-ins never auto-close
- **Verification:** **TRUE.** When an employee checks in, the row is saved with `status: "HALF_DAY"` and `workedMinutes: 0`. If they do not check out, the row remains unclosed forever.
- **Solution:**
  - Add auto-closing logic / midnight task that closes open check-ins from previous days, caps `workedMinutes` to max threshold, and displays a banner notification: *"You forgot to check out on [Date]"*.

#### T4 (High): Timezone bug in date keying (`dayKey`)
- **Verification:** **TRUE.** `dayKey` in `src/lib/dates.ts` uses `startOfDay(new Date())` based on server local time. On UTC hosts, early morning check-ins in local time zones (e.g. IST) land on the wrong calendar day.
- **Solution:**
  - Standardize date normalisation using ISO date strings (`YYYY-MM-DD`) or UTC midnight dates.

#### T5 (Medium): Approving leave overwrites worked `PRESENT` rows
- **Verification:** **TRUE.** `timeoff.ts` line 155 overwrites `status` to `"LEAVE"` without checking if `workedMinutes > 0` or if the employee already checked in.
- **Solution:**
  - Check existing `Attendance` status before approving leave. If `PRESENT`/`HALF_DAY` with worked hours exists, warn the manager or retain worked hours in audit log.

#### T6 (Low): Half-day employee displays full green "present" dot
- **Verification:** **TRUE.** `StatusDot` in `src/components/ui.tsx` line 147 treats `status === "HALF_DAY"` as `present = true` (green dot). Wireframe specifies separate indicators.
- **Solution:**
  - Update `StatusDot` to show an amber/split half-day indicator for `HALF_DAY`.

#### T7 (Medium): Schema fields `standardWorkHours` and `workingDaysPerWeek` unused
- **Verification:** **TRUE.** `STANDARD_WORK_HOURS` is loaded from `process.env.STANDARD_WORK_HOURS ?? 8` instead of `Company.standardWorkHours` from database.
- **Solution:**
  - Update attendance actions and salary calculations to read `company.standardWorkHours` and `company.workingDaysPerWeek` dynamically.

#### T8 (Medium): Missing manual attendance correction & audit logging for HR
- **Verification:** **TRUE.** Admin/HR cannot manually edit an employee's attendance record (e.g. forgotten check-out or missed check-in).
- **Solution:**
  - Add `updateAttendanceAction` in `src/server/actions/attendance.ts` restricted to Admin/HR, and record modifications in `AuditLog`.

---

## 3. Leave & Time-Off Workflow Audit (SRS 3.5 & Wireframes)

### Bug Verification & Solutions

#### L1 (Critical): Leave balances exist only for joining year
- **Verification:** **TRUE.** `employees.ts` line 83 initializes `LeaveBalance` for `dateOfJoining.getFullYear()` only. Requests in subsequent years fail with 0 available days.
- **Solution:**
  - Implement auto-provisioning of `LeaveBalance` rows for the current year whenever a leave request or query is executed.

#### L2 (High): Missing annual leave balance rollover
- **Verification:** **TRUE.** No automated process creates leave balances on January 1.
- **Solution:**
  - Implement a year-transition balance generator / rollover routine.

#### L3 (High): Concurrent leave approval crash (Prisma P2025)
- **Verification:** **TRUE.** `reviewLeaveAction` updates `where: { id: requestId, status: "PENDING" }`. Concurrent approvals throw uncaught Prisma exception P2025.
- **Solution:**
  - Wrap transaction in `try/catch` and return graceful error: `"This leave request has already been reviewed."`

#### L4 (High): Cross-company leave filing security vulnerability
- **Verification:** **TRUE.** Manager filing on behalf of an employee (`data.employeeId`) does not check if target employee belongs to `actor.companyId`.
- **Solution:**
  - Validate `targetEmployee.companyId === actor.companyId` before creating leave request.

#### L5 (Medium): Cross-year leave requests debit only start year
- **Verification:** **TRUE.** A leave request spanning Dec 28 to Jan 5 debits all days from the start year balance.
- **Solution:**
  - Split leave days across year boundaries and debit respective year balances.

#### L6 (Medium): Approved leave cannot be reverted/cancelled
- **Verification:** **TRUE.** `cancelLeaveAction` only permits cancelling `PENDING` requests.
- **Solution:**
  - Allow Admin/HR to revert `APPROVED` leave, restoring balance and removing `LEAVE` attendance records.

#### L7 (Medium): Missing Allocation tab from wireframes
- **Verification:** **TRUE.** Wireframe `Screenshot 103029.png` specifies an "Allocation" tab for Admin/HR. Missing in current UI.
- **Solution:**
  - Build `AllocationTab` in `/time-off` for Admin/HR to view, grant, and adjust leave balance allocations.

#### L8 (Medium): Employee table instead of wireframe Calendar view
- **Verification:** **TRUE.** Wireframe `Screenshot 103029.png` shows an interactive calendar for employees. Built UI is a plain table.
- **Solution:**
  - Build `TimeOffCalendar` component displaying monthly calendar with colored leave blocks, public holidays, and pending status badges.

#### L9 (Medium): Unvalidated base64 medical certificate attachments
- **Verification:** **TRUE.** Attachments stored as unvalidated base64 strings in DB without size or type checks.
- **Solution:**
  - Add Zod validation: max file size 5MB, allowed types `image/png`, `image/jpeg`, `application/pdf`. Store files systematically.

#### L10 (Low): Public holidays not accounted for in leave calculation
- **Verification:** **TRUE.** `countWorkingDays` only excludes weekends (`isWeekend`).
- **Solution:**
  - Integrate `PublicHoliday` schema and exclude public holidays from deducted leave days.

#### L11 (Low): Unpaginated list (`take: 100`)
- **Verification:** **TRUE.** `db.leaveRequest.findMany` hardcodes `take: 100`.
- **Solution:**
  - Implement pagination / "Load More" controls.

---

## 4. Verification Plan

### Automated Testing
- `npm run test`: Run Vitest unit tests covering salary math, leave calculations, timezone keying, and attendance status derivation.
- `npm run typecheck`: Ensure TypeScript compilation succeeds without errors.
- `npm run lint`: Verify ESLint passes cleanly.
- `npm run build`: Verify Next.js production build succeeds.

### Manual Verification
- Test registration, sign-in, and RBAC page access.
- Test check-in and check-out flows, verifying `HALF_DAY` threshold, overtime calculation, and status dot rendering.
- Test leave creation across year boundaries, leave balance deduction, concurrent approvals, and cancellation.
- Verify Admin Allocation tab and Employee Time Off Calendar view match wireframe screenshots.
