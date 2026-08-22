import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || "587", 10);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

console.log("Testing SMTP connection with settings:");
console.log("Host:", host);
console.log("Port:", port);
console.log("User:", user);
console.log("Pass:", pass ? `${pass.substring(0, 10)}...` : "NOT SET");

if (!host || !user || !pass) {
  console.error("❌ Missing SMTP environment variables.");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Verification Failed:", error);
  } else {
    console.log("✅ SMTP Server Connection & Authentication SUCCESSFUL!");
  }
});
