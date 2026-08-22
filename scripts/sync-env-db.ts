import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Determine environment mode from argument, process.env.APP_ENV, or process.env.NODE_ENV
const arg = process.argv[2]?.toLowerCase();
const envMode = (
  arg ||
  process.env.APP_ENV ||
  (process.env.NODE_ENV === "production" ? "deploy" : "test")
).toLowerCase();

const isDeploy =
  envMode === "deploy" ||
  envMode === "production" ||
  envMode === "supabase" ||
  envMode === "postgres";

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
const envPath = path.join(process.cwd(), ".env");

const SUPABASE_DB_URL = process.env.SUPABASE_DATABASE_URL || (isDeploy ? process.env.DATABASE_URL : "");
const LOCAL_DB_URL = process.env.LOCAL_DATABASE_URL || "file:./dev.db";

if (isDeploy && !SUPABASE_DB_URL) {
  console.error("❌ SUPABASE_DATABASE_URL is not set in .env. Please define it in your .env file.");
  process.exit(1);
}

// 1. Sync prisma/schema.prisma provider
if (fs.existsSync(schemaPath)) {
  let schema = fs.readFileSync(schemaPath, "utf-8");
  const targetProvider = isDeploy ? "postgresql" : "sqlite";
  const currentProvider = schema.includes('provider = "postgresql"') ? "postgresql" : "sqlite";

  if (targetProvider !== currentProvider) {
    schema = schema.replace(
      /datasource\s+db\s+{\s*provider\s*=\s*"[^"]+"/m,
      `datasource db {\n  provider = "${targetProvider}"`
    );
    fs.writeFileSync(schemaPath, schema, "utf-8");
  }
}

// 2. Sync .env
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, "utf-8");
  const targetUrl = isDeploy ? SUPABASE_DB_URL : LOCAL_DB_URL;
  const targetAppEnv = isDeploy ? "deploy" : "test";

  // Ensure APP_ENV is present/updated
  if (/^APP_ENV=.*$/m.test(envContent)) {
    envContent = envContent.replace(/^APP_ENV=.*$/m, `APP_ENV="${targetAppEnv}"`);
  } else {
    envContent = `APP_ENV="${targetAppEnv}"\n` + envContent;
  }

  // Ensure DATABASE_URL is updated
  if (/^DATABASE_URL=.*$/m.test(envContent)) {
    envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${targetUrl}"`);
  } else {
    envContent = `DATABASE_URL="${targetUrl}"\n` + envContent;
  }

  fs.writeFileSync(envPath, envContent, "utf-8");
}

console.log(`\n⚙️  Environment Mode: ${isDeploy ? "🚀 DEPLOY (Supabase PostgreSQL)" : "🧪 TEST (Local SQLite)"}`);
console.log(`• APP_ENV = "${isDeploy ? "deploy" : "test"}"`);
console.log(`• Provider = "${isDeploy ? "postgresql" : "sqlite"}"`);
console.log(`• DATABASE_URL = "${isDeploy ? "Supabase Cloud PostgreSQL" : "file:./dev.db"}"\n`);
