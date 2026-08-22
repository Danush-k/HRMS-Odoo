# Dayflow

**Every workday, perfectly aligned.**

A human resource management system covering authentication, role-based access, employee
profiles, attendance, time off and salary structures.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, Server Actions |
| Language | TypeScript, strict |
| Styling | Tailwind CSS v4, design tokens in `src/app/globals.css` |
| Database | Prisma ORM — SQLite for development, PostgreSQL-ready |
| Auth | Signed JWT session in an httpOnly cookie (`jose`), bcrypt password hashing |
| Validation | Zod, shared by the client and the server |

## Getting started

One command, from a fresh clone:

```bash
./run-mac.sh        # macOS
./run.sh            # Linux, WSL, Git Bash on Windows
```

The script checks your Node version, writes a `.env` with a fresh `SESSION_SECRET`,
installs dependencies, creates and seeds the database, then starts the development
server on http://localhost:3000. Re-running it is cheap: it skips whatever is already
done and keeps your data.

| Argument | What it does |
| --- | --- |
| *(none)* | Set up if needed, then start the development server |
| `setup` | Prepare everything, then stop |
| `reset` | Wipe the database and reseed the demo company |
| `build` | Production build |
| `start` | Production server |
| `studio` | Browse the data in Prisma Studio *(macOS script)* |
| `clean` | Remove `node_modules`, `.next` and the database |

Use another port with `PORT=3001 ./run.sh`.

Dayflow needs **Node 18.18 or newer**.

Or do it by hand:

```bash
npm install
cp .env.example .env          # then set SESSION_SECRET
npm run setup                 # generate client, create schema, seed demo data
npm run dev                   # http://localhost:3000
```

`npm run setup` seeds a demo company, **Odoo India**, with seven people, six weeks of
attendance and a few time off requests. Sign in with any of these and the password
`Dayflow@2026`:

| Login ID | Role | Name |
| --- | --- | --- |
| `OIJODO20220001` | Administrator | John Doe |
| `OIPRRA20220002` | HR Officer | Priya Raman |
| `OIARKU20230001` | Employee | Arun Kumar |

Or register a fresh company at `/sign-up`.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:push` | Apply the schema to the database |
| `npm run db:seed` | Reseed demo data |
| `npm run db:reset` | Drop, recreate and reseed |
| `npm run db:studio` | Browse the data in Prisma Studio |

## How it works

### Accounts

Employees do not register themselves. Sign-up creates a **company and its first
administrator**; from there an administrator or HR officer adds employees, and Dayflow
issues each one a Login ID and a first password. The employee is forced to replace that
password the first time they sign in.

**Login ID format** — company code, first two letters of each name, joining year, serial:

```
OI      JO DO    2022    0001      ->  OIJODO20220001
company  names   year    serial
```

### Roles

| | Administrator | HR Officer | Employee |
| --- | --- | --- | --- |
| Add and edit employees | ✓ | ✓ | own limited fields |
| See any salary | ✓ | ✓ | own only, read-only |
| Approve time off | ✓ | ✓ | — |
| See all attendance | ✓ | ✓ | own only |

`src/middleware.ts` keeps signed-out visitors out of the application shell, but it is not
the authorisation boundary. Every page and every server action re-checks the session and
the role on the server through `src/lib/auth.ts`.

### Attendance

One row per employee per day, guaranteed by a unique constraint on
`(employeeId, date)` — a second check-in click cannot open a second day. Status is derived
from hours worked: eight or more is present, four to eight is a half day, none is absent.
Approved leave writes `LEAVE` rows directly onto the calendar.

### Salary

Only the monthly wage and the percentages are stored; every component amount is derived
on read, so changing the wage can never leave a stale breakdown behind.

| Component | Basis |
| --- | --- |
| Basic Salary | 50% of monthly wage |
| House Rent Allowance | 50% of basic |
| Standard Allowance | 16.67% of basic |
| Performance Bonus | 8.33% of basic |
| Leave Travel Allowance | 8.33% of basic |
| Fixed Allowance | the balance: wage less every other component |
| Provident Fund | 12% of basic, employee and employer |
| Professional Tax | flat, per month |

Fixed Allowance is the balancing figure, so the components always total exactly the wage.

### Time off

Paid, sick and unpaid. Weekends never consume a balance. A request is blocked if it
overlaps an existing one or exceeds the remaining allocation, and sick leave requires a
certificate. Approving a request decrements the balance and writes the attendance rows in
**one transaction**, so the two can never disagree.

## Project layout

```
prisma/
  schema.prisma          data model
  seed.ts                demo company
src/
  app/
    (auth)/              sign in, sign up
    (app)/               employees, attendance, time off, profile
    first-login/         forced password change
  components/            shell, forms and shared primitives
  lib/                   auth, session, salary, dates, validation
  server/actions/        every mutation, one file per domain
  middleware.ts          signed-out redirect
```

## Moving to PostgreSQL

1. Set `provider = "postgresql"` in `prisma/schema.prisma`.
2. Point `DATABASE_URL` at the instance.
3. `npx prisma db push && npm run db:seed`.

No model changes are needed.

## Not yet built

Tracked for the branches that follow this MVP:

- Email verification at sign-up and password reset by email
- Object storage for avatars, logos and certificates (currently inline data URLs)
- Payslip generation and PDF export
- Notifications, and an analytics dashboard
- Automated tests and CI
