"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export type EmployeePdfData = {
  name: string;
  loginId: string;
  role: string;
  email: string;
  mobile: string;
  department: string;
  jobPosition: string;
  location: string;
  companyName: string;
  dateOfJoining: string;
  managerName?: string;
  about?: string;
  skills?: string;
  certifications?: string;
};

export function DownloadProfilePdfButton({ data }: { data: EmployeePdfData }) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);

    try {
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "-9999px";
      container.style.width = "794px";
      container.style.backgroundColor = "#ffffff";
      container.style.padding = "40px 40px 60px 40px";
      container.style.fontFamily = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      container.style.color = "#000000";

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #000000; padding-bottom: 16px;">
          <div>
            <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 6px 0; color: #000000;">${data.name}</h1>
            <p style="font-size: 14px; font-weight: 600; color: #333333; margin: 0;">${data.jobPosition || "Team Member"} — ${data.department || "General"}</p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 20px; font-weight: 800; color: #000000;">${data.companyName}</div>
            <div style="font-size: 12px; font-family: monospace; font-weight: 600; color: #222222; margin-top: 4px;">ID: ${data.loginId}</div>
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0; border-bottom: 1px solid #000000; padding-bottom: 4px;">EMPLOYEE DETAILS</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr style="border-bottom: 1px solid #e5e5e5;"><td style="padding: 8px 0; font-weight: 700; width: 180px;">Work Email:</td><td>${data.email}</td></tr>
            <tr style="border-bottom: 1px solid #e5e5e5;"><td style="padding: 8px 0; font-weight: 700;">Mobile:</td><td>${data.mobile || "—"}</td></tr>
            <tr style="border-bottom: 1px solid #e5e5e5;"><td style="padding: 8px 0; font-weight: 700;">Location:</td><td>${data.location || "—"}</td></tr>
            <tr style="border-bottom: 1px solid #e5e5e5;"><td style="padding: 8px 0; font-weight: 700;">Date of Joining:</td><td>${data.dateOfJoining}</td></tr>
            <tr style="border-bottom: 1px solid #e5e5e5;"><td style="padding: 8px 0; font-weight: 700;">System Role:</td><td>${data.role}</td></tr>
            ${data.managerName ? `<tr style="border-bottom: 1px solid #e5e5e5;"><td style="padding: 8px 0; font-weight: 700;">Manager:</td><td>${data.managerName}</td></tr>` : ""}
          </table>
        </div>

        ${
          data.about
            ? `<div style="margin-bottom: 24px;">
                <h3 style="font-size: 13px; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0; border-bottom: 1px solid #000000; padding-bottom: 4px;">ABOUT</h3>
                <p style="font-size: 13px; color: #222222; margin: 0; line-height: 1.5;">${data.about}</p>
              </div>`
            : ""
        }

        ${
          data.skills
            ? `<div style="margin-bottom: 24px;">
                <h3 style="font-size: 13px; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0; border-bottom: 1px solid #000000; padding-bottom: 4px;">SKILLS & COMPETENCIES</h3>
                <p style="font-size: 13px; color: #222222; margin: 0; line-height: 1.5;">${data.skills}</p>
              </div>`
            : ""
        }

        ${
          data.certifications
            ? `<div style="margin-bottom: 24px;">
                <h3 style="font-size: 13px; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0; border-bottom: 1px solid #000000; padding-bottom: 4px;">CERTIFICATIONS</h3>
                <p style="font-size: 13px; color: #222222; margin: 0; line-height: 1.5;">${data.certifications}</p>
              </div>`
            : ""
        }
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
      pdf.save(`Employee_Profile_${data.name.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("Failed to download profile PDF.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={generating}
      className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-700 shadow-sm transition-all hover:bg-brand-700 hover:text-white hover:shadow-md active:scale-95 disabled:opacity-60"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {generating ? "Generating PDF..." : "Download Profile PDF"}
    </button>
  );
}
