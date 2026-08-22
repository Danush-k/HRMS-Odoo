import { z } from "zod";

/** SRS 3.1.1 — "password must follow security rules". */
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number")
  .regex(/[^A-Za-z0-9]/, "Add a symbol");

const optionalText = z.string().trim().max(2000).optional().or(z.literal(""));
const optionalDate = z
  .string()
  .optional()
  .transform((value) => (value ? new Date(value) : null))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), "Enter a valid date");

export const signUpSchema = z
  .object({
    companyName: z.string().trim().min(2, "Enter the company name"),
    logo: z.string().optional(),
    firstName: z.string().trim().min(1, "Enter a first name"),
    lastName: z.string().trim().min(1, "Enter a last name"),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    phone: z.string().trim().min(6, "Enter a phone number"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your Login ID or email"),
  password: z.string().min(1, "Enter your password"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your Login ID or email"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "This reset link is missing its token"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const employeeCreateSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name"),
  lastName: z.string().trim().min(1, "Enter a last name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(["ADMIN", "HR", "EMPLOYEE"]),
  jobPosition: optionalText,
  department: optionalText,
  location: optionalText,
  mobile: optionalText,
  managerId: z.string().optional(),
  dateOfJoining: z.string().min(1, "Choose a joining date"),
  monthlyWage: z.coerce.number().min(0, "Wage cannot be negative").default(0),
});

/** Fields an employee may change on their own record (SRS 3.3.2). */
export const selfProfileSchema = z.object({
  mobile: optionalText,
  residingAddress: optionalText,
  personalEmail: z.string().trim().toLowerCase().email("Enter a valid email address").optional().or(z.literal("")),
  avatar: z.string().optional(),
  about: optionalText,
  loveAboutJob: optionalText,
  interests: optionalText,
  skills: optionalText,
  certifications: optionalText,
});

/** Everything a manager may change, on top of the self-editable fields. */
export const managerProfileSchema = selfProfileSchema.extend({
  firstName: z.string().trim().min(1, "Enter a first name"),
  lastName: z.string().trim().min(1, "Enter a last name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(["ADMIN", "HR", "EMPLOYEE"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  jobPosition: optionalText,
  department: optionalText,
  location: optionalText,
  managerId: z.string().optional(),
  dateOfBirth: optionalDate,
  nationality: optionalText,
  gender: optionalText,
  maritalStatus: optionalText,
  dateOfJoining: optionalDate,
  accountNumber: optionalText,
  bankName: optionalText,
  ifscCode: optionalText,
  panNo: optionalText,
  uanNo: optionalText,
  empCode: optionalText,
});

export const salarySchema = z.object({
  employeeId: z.string().min(1),
  monthlyWage: z.coerce.number().min(0, "Wage cannot be negative"),
  workingDaysPerWeek: z.coerce.number().int().min(1).max(7),
  breakHours: z.coerce.number().min(0).max(8),
  basicPercent: z.coerce.number().min(0).max(100),
  hraPercentOfBasic: z.coerce.number().min(0).max(100),
  standardAllowancePercent: z.coerce.number().min(0).max(100),
  performanceBonusPercent: z.coerce.number().min(0).max(100),
  ltaPercent: z.coerce.number().min(0).max(100),
  pfPercent: z.coerce.number().min(0).max(100),
  professionalTax: z.coerce.number().min(0),
});

export const leaveRequestSchema = z
  .object({
    employeeId: z.string().optional(),
    leaveTypeId: z.string().min(1, "Choose a time off type"),
    startDate: z.string().min(1, "Choose a start date"),
    endDate: z.string().min(1, "Choose an end date"),
    remarks: optionalText,
    attachment: z.string().optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "The end date cannot be before the start date",
    path: ["endDate"],
  });

export const reviewLeaveSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: optionalText,
});

/** Flattens a ZodError into the { field: message } shape the forms render. */
export function fieldErrors(error: z.ZodError) {
  const flat = error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(flat).map(([key, messages]) => [key, messages?.[0] ?? "Invalid value"]),
  ) as Record<string, string>;
}
