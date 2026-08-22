"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export function BackToPayrollButton() {
  return (
    <Link
      href="/payroll"
      className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700 shadow-sm transition-all duration-200 hover:border-brand-700 hover:bg-brand-700 hover:text-white hover:shadow-md active:scale-95"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Back to Payroll
    </Link>
  );
}

export type PayslipData = {
  companyName: string;
  companyLogo: string | null;
  employeeName: string;
  employeeLoginId: string;
  jobPosition?: string | null;
  department?: string | null;
  period: string;
  payableDays: number;
  totalWorkingDays: number;
  generatedDate: string;
  generatedByName: string;
  components: { label: string; amount: number }[];
  grossMonthly: number;
  pfEmployee: number;
  professionalTax: number;
  totalDeductions: number;
  netPay: number;
};

export function DownloadPayslipPdfButton({ data, autoDownload }: { data: PayslipData; autoDownload?: boolean }) {
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (autoDownload) {
      handleDownloadPdf();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownload]);

  const handleDownloadPdf = async () => {
    setGenerating(true);

    try {
      // Create hidden off-screen printable container matching monochrome B&W invoice design
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "-9999px";
      container.style.width = "794px"; // A4 width at 96 DPI
      container.style.backgroundColor = "#ffffff";
      container.style.padding = "40px 40px 60px 40px";
      container.style.fontFamily = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      container.style.color = "#000000";

      const formattedNetPay = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(data.netPay);
      const formattedGross = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(data.grossMonthly);
      const formattedDeductions = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(data.totalDeductions);

      container.innerHTML = `
        <!-- Top Header Block -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #000000; padding-bottom: 20px;">
          <div>
            <h1 style="font-size: 32px; font-weight: 800; margin: 0 0 10px 0; color: #000000; text-transform: uppercase; letter-spacing: -0.02em;">PAYSLIP</h1>
            <table style="font-size: 13px; color: #222222; border-collapse: collapse;">
              <tr><td style="padding-right: 16px; font-weight: 700; color: #000000;">Pay Period:</td><td>${data.period}</td></tr>
              <tr><td style="padding-right: 16px; font-weight: 700; color: #000000;">Date of Issue:</td><td>${data.generatedDate}</td></tr>
              <tr><td style="padding-right: 16px; font-weight: 700; color: #000000;">Payable Days:</td><td>${data.payableDays} / ${data.totalWorkingDays} days</td></tr>
            </table>
          </div>
          <div style="text-align: right;">
            ${
              data.companyLogo
                ? `<img src="${data.companyLogo}" style="max-height: 52px; max-width: 220px; object-fit: contain;" />`
                : `<div style="font-size: 24px; font-weight: 800; color: #000000; letter-spacing: -0.02em;">${data.companyName}</div>`
            }
          </div>
        </div>

        <!-- Party Metadata Details -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 28px; font-size: 13px;">
          <div>
            <div style="font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.05em; font-size: 11px; margin-bottom: 6px;">COMPANY DETAILS</div>
            <div style="font-weight: 700; color: #000000; font-size: 14px;">${data.companyName}</div>
            <div style="color: #333333;">HR & Payroll Department</div>
            <div style="color: #333333;">Issued by: ${data.generatedByName}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.05em; font-size: 11px; margin-bottom: 6px;">EMPLOYEE (PAID TO)</div>
            <div style="font-weight: 800; font-size: 15px; color: #000000;">${data.employeeName}</div>
            <div style="color: #222222; font-family: monospace; font-weight: 600;">ID: ${data.employeeLoginId}</div>
            ${data.jobPosition ? `<div style="color: #333333;">${data.jobPosition} ${data.department ? `(${data.department})` : ""}</div>` : ""}
          </div>
        </div>

        <!-- Highlighted Net Pay Box (Monochrome Black & White) -->
        <div style="background-color: #f9f9f9; border: 2px solid #000000; border-radius: 6px; padding: 18px 20px; margin-bottom: 28px;">
          <div style="font-size: 28px; font-weight: 900; color: #000000;">${formattedNetPay}</div>
          <div style="font-size: 12px; font-weight: 600; color: #444444; margin-top: 4px;">Net Paid for ${data.period} (${data.payableDays} of ${data.totalWorkingDays} working days)</div>
        </div>

        <!-- Earnings Table (Black & White) -->
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0; border-bottom: 1px solid #000000; padding-bottom: 4px;">EARNINGS BREAKDOWN</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background-color: #e5e5e5; text-align: left; color: #000000; border-bottom: 1px solid #000000;">
                <th style="padding: 8px 10px; font-weight: 700;">Description</th>
                <th style="padding: 8px 10px; font-weight: 700; text-align: right;">Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              ${data.components
                .map(
                  (c) => `
                <tr style="border-bottom: 1px solid #e5e5e5;">
                  <td style="padding: 7px 10px; color: #111111;">${c.label}</td>
                  <td style="padding: 7px 10px; text-align: right; font-family: monospace; color: #000000; font-weight: 500;">${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(c.amount)}</td>
                </tr>
              `
                )
                .join("")}
              <tr style="font-weight: 800; background-color: #f2f2f2; border-top: 1px solid #000000;">
                <td style="padding: 9px 10px; color: #000000;">Gross Monthly Salary</td>
                <td style="padding: 9px 10px; text-align: right; font-family: monospace; color: #000000;">${formattedGross}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Deductions Table (Black & White) -->
        <div style="margin-bottom: 28px;">
          <h3 style="font-size: 13px; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0; border-bottom: 1px solid #000000; padding-bottom: 4px;">DEDUCTIONS BREAKDOWN</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background-color: #e5e5e5; text-align: left; color: #000000; border-bottom: 1px solid #000000;">
                <th style="padding: 8px 10px; font-weight: 700;">Description</th>
                <th style="padding: 8px 10px; font-weight: 700; text-align: right;">Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #e5e5e5;">
                <td style="padding: 7px 10px; color: #111111;">Provident Fund (employee)</td>
                <td style="padding: 7px 10px; text-align: right; font-family: monospace; color: #000000; font-weight: 500;">${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(data.pfEmployee)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e5e5;">
                <td style="padding: 7px 10px; color: #111111;">Professional Tax</td>
                <td style="padding: 7px 10px; text-align: right; font-family: monospace; color: #000000; font-weight: 500;">${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(data.professionalTax)}</td>
              </tr>
              <tr style="font-weight: 800; background-color: #f2f2f2; border-top: 1px solid #000000;">
                <td style="padding: 9px 10px; color: #000000;">Total Deductions</td>
                <td style="padding: 9px 10px; text-align: right; font-family: monospace; color: #000000;">${formattedDeductions}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Summary Totals Section -->
        <div style="display: flex; justify-content: flex-end; border-top: 2px solid #000000; padding-top: 14px; margin-bottom: 24px;">
          <table style="width: 320px; border-collapse: collapse; font-size: 13px;">
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 6px 0; color: #333333; font-weight: 600;">Gross Salary:</td>
              <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 700; color: #000000;">${formattedGross}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 6px 0; color: #333333; font-weight: 600;">Deductions:</td>
              <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 700; color: #000000;">${formattedDeductions}</td>
            </tr>
            <tr style="font-size: 16px; font-weight: 900;">
              <td style="padding: 10px 0; color: #000000;">NET PAYABLE:</td>
              <td style="padding: 10px 0; text-align: right; font-family: monospace; color: #000000;">${formattedNetPay}</td>
            </tr>
          </table>
        </div>
      `;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Payslip_${data.period.replace(/\s+/g, "_")}_${data.employeeName.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownloadPdf}
      disabled={generating}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-700 hover:shadow-md active:scale-95 disabled:opacity-60"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {generating ? "Generating PDF..." : "Download Official PDF"}
    </button>
  );
}
