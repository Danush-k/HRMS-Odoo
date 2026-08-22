import fs from "fs";
import path from "path";

const target = process.argv[2]?.toLowerCase();

if (!target || !["supabase", "local", "postgres", "sqlite"].includes(target)) {
  console.log("Usage: npx tsx scripts/switch-db.ts <supabase|local>");
  process.exit(1);
}

const isSupabase = target === "supabase" || target === "postgres";
const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
const envPath = path.join(process.cwd(), ".env");

// 1. Update schema.prisma datasource provider
let schemaContent = fs.readFileSync(schemaPath, "utf-8");
if (isSupabase) {
  schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
} else {
  schemaContent = schemaContent.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
}
fs.writeFileSync(schemaPath, schemaContent, "utf-8");

// 2. Update .env DATABASE_URL
let envContent = fs.readFileSync(envPath, "utf-8");
const SUPABASE_DB_URL = process.env.SUPABASE_DATABASE_URL || (isSupabase ? process.env.DATABASE_URL : "");
const LOCAL_DB_URL = process.env.LOCAL_DATABASE_URL || "file:./dev.db";

if (isSupabase && !SUPABASE_DB_URL) {
  console.error("❌ SUPABASE_DATABASE_URL is not set in .env. Please define it in your .env file.");
  process.exit(1);
}

if (isSupabase) {
  envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${SUPABASE_DB_URL}"`);
} else {
  envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${LOCAL_DB_URL}"`);
}
fs.writeFileSync(envPath, envContent, "utf-8");

console.log(`\n🚀 Successfully switched active database to: ${isSupabase ? "⚡ SUPABASE (PostgreSQL)" : "💻 LOCAL (SQLite)"}`);
console.log(`• prisma/schema.prisma -> provider = "${isSupabase ? "postgresql" : "sqlite"}"`);
console.log(`• .env -> DATABASE_URL = "${isSupabase ? "Supabase Cloud PostgreSQL" : "Local SQLite dev.db"}"\n`);
