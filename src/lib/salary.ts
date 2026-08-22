/**
 * Salary derivation.
 *
 * Only the monthly wage and the percentages are stored. Every component amount is
 * computed from them on read, so a wage change can never leave a stale breakdown
 * behind. Fixed Allowance is the balancing figure: wage minus every other component,
 * which guarantees the components always total exactly the defined wage.
 */

export type SalaryInput = {
  monthlyWage: number;
  basicPercent: number;
  hraPercentOfBasic: number;
  standardAllowancePercent: number;
  performanceBonusPercent: number;
  ltaPercent: number;
  pfPercent: number;
  professionalTax: number;
};

export type SalaryComponent = {
  key: string;
  label: string;
  amount: number;
  percent: number;
  basis: "wage" | "basic";
  description: string;
};

export type SalaryBreakdown = {
  monthlyWage: number;
  yearlyWage: number;
  basic: number;
  components: SalaryComponent[];
  pfEmployee: number;
  pfEmployer: number;
  professionalTax: number;
  grossMonthly: number;
  totalDeductions: number;
  netMonthly: number;
  netYearly: number;
  ctcMonthly: number;
};

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function computeSalary(input: SalaryInput): SalaryBreakdown {
  const wage = Math.max(0, input.monthlyWage);
  const basic = round2((wage * input.basicPercent) / 100);

  const hra = round2((basic * input.hraPercentOfBasic) / 100);
  const standardAllowance = round2((basic * input.standardAllowancePercent) / 100);
  const performanceBonus = round2((basic * input.performanceBonusPercent) / 100);
  const lta = round2((basic * input.ltaPercent) / 100);

  const allocated = basic + hra + standardAllowance + performanceBonus + lta;
  const fixedAllowance = round2(Math.max(0, wage - allocated));

  const components: SalaryComponent[] = [
    {
      key: "basic",
      label: "Basic Salary",
      amount: basic,
      percent: input.basicPercent,
      basis: "wage",
      description: "Base salary computed as a share of the monthly wage.",
    },
    {
      key: "hra",
      label: "House Rent Allowance",
      amount: hra,
      percent: input.hraPercentOfBasic,
      basis: "basic",
      description: "HRA provided to the employee as a share of basic salary.",
    },
    {
      key: "standard",
      label: "Standard Allowance",
      amount: standardAllowance,
      percent: input.standardAllowancePercent,
      basis: "basic",
      description: "A predetermined, fixed amount provided as part of the salary.",
    },
    {
      key: "bonus",
      label: "Performance Bonus",
      amount: performanceBonus,
      percent: input.performanceBonusPercent,
      basis: "basic",
      description: "Variable amount paid during payroll, defined as a share of basic salary.",
    },
    {
      key: "lta",
      label: "Leave Travel Allowance",
      amount: lta,
      percent: input.ltaPercent,
      basis: "basic",
      description: "Paid by the company to cover travel expenses.",
    },
    {
      key: "fixed",
      label: "Fixed Allowance",
      amount: fixedAllowance,
      percent: wage > 0 ? round2((fixedAllowance / wage) * 100) : 0,
      basis: "wage",
      description: "The balancing component: monthly wage less every other component.",
    },
  ];

  const pfEmployee = round2((basic * input.pfPercent) / 100);
  const pfEmployer = round2((basic * input.pfPercent) / 100);
  const professionalTax = round2(input.professionalTax);

  const grossMonthly = round2(wage);
  const totalDeductions = round2(pfEmployee + professionalTax);
  const netMonthly = round2(grossMonthly - totalDeductions);

  return {
    monthlyWage: grossMonthly,
    yearlyWage: round2(grossMonthly * 12),
    basic,
    components,
    pfEmployee,
    pfEmployer,
    professionalTax,
    grossMonthly,
    totalDeductions,
    netMonthly,
    netYearly: round2(netMonthly * 12),
    ctcMonthly: round2(grossMonthly + pfEmployer),
  };
}

/**
 * Pro-rates the monthly net against days actually payable.
 * Unpaid leave and unrecorded days reduce the payable day count.
 */
export function prorate(netMonthly: number, payableDays: number, totalWorkingDays: number) {
  if (totalWorkingDays <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, payableDays / totalWorkingDays));
  return round2(netMonthly * ratio);
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
