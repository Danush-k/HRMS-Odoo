import { describe, expect, it } from "vitest";
import { computeSalary } from "../lib/salary";
import { deriveStatus } from "../lib/attendance";
import { countWorkingDays, dayKey } from "../lib/dates";

describe("Salary Math", () => {
  it("computes exact breakdown for monthly wage 50,000", () => {
    const breakdown = computeSalary({
      monthlyWage: 50000,
      basicPercent: 50,
      hraPercentOfBasic: 50,
      standardAllowancePercent: 16.67,
      performanceBonusPercent: 8.33,
      ltaPercent: 8.33,
      pfPercent: 12,
      professionalTax: 200,
    });

    expect(breakdown.monthlyWage).toBe(50000);
    expect(breakdown.basic).toBe(25000);
    expect(breakdown.grossMonthly).toBe(50000);
    expect(breakdown.totalDeductions).toBe(3200); // 3000 PF + 200 PT
    expect(breakdown.netMonthly).toBe(46800);
  });
});

describe("Attendance Status Derivation", () => {
  it("returns PRESENT when hours worked >= standard work hours (8h)", () => {
    expect(deriveStatus(480, 8)).toBe("PRESENT");
    expect(deriveStatus(540, 8)).toBe("PRESENT");
  });

  it("returns HALF_DAY when hours worked >= 4h but < 8h", () => {
    expect(deriveStatus(240, 8)).toBe("HALF_DAY");
    expect(deriveStatus(300, 8)).toBe("HALF_DAY");
  });

  it("returns ABSENT when hours worked < 4h (e.g. 15 min, 60 min, 239 min)", () => {
    expect(deriveStatus(15, 8)).toBe("ABSENT");
    expect(deriveStatus(60, 8)).toBe("ABSENT");
    expect(deriveStatus(239, 8)).toBe("ABSENT");
    expect(deriveStatus(0, 8)).toBe("ABSENT");
  });
});

describe("Date & Working Day Utilities", () => {
  it("counts weekdays correctly, excluding weekends", () => {
    const monday = new Date("2026-08-24T00:00:00Z");
    const friday = new Date("2026-08-28T00:00:00Z");
    const sunday = new Date("2026-08-30T00:00:00Z");

    expect(countWorkingDays(monday, friday)).toBe(5);
    expect(countWorkingDays(monday, sunday)).toBe(5);
  });

  it("normalises date to midnight string ISO key correctly", () => {
    const dateStr = "2026-08-22T10:00:00Z";
    const key = dayKey(dateStr);
    expect(key).toBeInstanceOf(Date);
  });
});

describe("Resume Text Parser", () => {
  it("extracts summary, skills, certifications, and interests accurately", async () => {
    const { parseResumeText } = await import("../lib/resume-parser");

    const sampleResume = `
    Kavin Soorya
    Software Engineer

    Summary
    Full-stack software developer with 4 years of experience building enterprise web applications and scalable APIs.

    Technical Skills
    TypeScript, Next.js, Python, PostgreSQL, Docker, Git

    Certifications
    AWS Certified Cloud Practitioner
    Odoo Functional Certification

    Interests & Hobbies
    Cricket, Open-Source Contributions, Chess

    What I Love About My Job
    I am passionate about solving complex workflow problems and crafting clean user experiences.
    `;

    const parsed = parseResumeText(sampleResume);

    expect(parsed.about).toContain("Full-stack software developer");
    expect(parsed.skills).toContain("TypeScript");
    expect(parsed.skills).toContain("Next.js");
    expect(parsed.skills).toContain("PostgreSQL");
    expect(parsed.certifications).toContain("AWS Certified Cloud Practitioner");
    expect(parsed.certifications).toContain("Odoo Functional Certification");
    expect(parsed.interests).toContain("Cricket");
    expect(parsed.loveAboutJob).toContain("passionate about solving complex workflow problems");
  });

  it("handles category-prefixed, parenthetical, and pipe-delimited skill lists", async () => {
    const { parseResumeText } = await import("../lib/resume-parser");

    const resumeWithCategories = `
    Alex Rivera
    Senior Full Stack Engineer

    TECHNICAL SKILLS
    • Programming Languages: Python, JavaScript, TypeScript, Java, SQL
    • Frameworks & Libraries: React.js, Next.js, Django, FastAPI (REST APIs), Tailwind CSS
    • Databases & Cloud: PostgreSQL, MongoDB, Redis, AWS (S3, EC2), Docker, Kubernetes
    • Tools & Practices: Git, GitHub Actions, CI/CD, Agile, Postman, Linux

    EXPERIENCE
    Software Engineer at TechCorp
    `;

    const parsed = parseResumeText(resumeWithCategories);

    expect(parsed.skills).toContain("Python");
    expect(parsed.skills).toContain("JavaScript");
    expect(parsed.skills).toContain("TypeScript");
    expect(parsed.skills).toContain("React");
    expect(parsed.skills).toContain("Next.js");
    expect(parsed.skills).toContain("Django");
    expect(parsed.skills).toContain("FastAPI");
    expect(parsed.skills).toContain("REST APIs");
    expect(parsed.skills).toContain("PostgreSQL");
    expect(parsed.skills).toContain("MongoDB");
    expect(parsed.skills).toContain("Docker");
    expect(parsed.skills).toContain("Kubernetes");
    expect(parsed.skills).toContain("Git");
    expect(parsed.skills).toContain("CI/CD");
  });

  it("handles inline headers like 'SKILLS: Python, TypeScript, React'", async () => {
    const { parseResumeText } = await import("../lib/resume-parser");

    const resumeInline = `
    John Doe
    SKILLS: Python, TypeScript, React, Next.js, Odoo, PostgreSQL, Docker, Git
    `;

    const parsed = parseResumeText(resumeInline);

    expect(parsed.skills).toContain("Python");
    expect(parsed.skills).toContain("TypeScript");
    expect(parsed.skills).toContain("React");
    expect(parsed.skills).toContain("Next.js");
    expect(parsed.skills).toContain("Odoo");
    expect(parsed.skills).toContain("PostgreSQL");
    expect(parsed.skills).toContain("Docker");
    expect(parsed.skills).toContain("Git");
  });
});

