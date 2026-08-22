#!/usr/bin/env bash
#
# Dayflow — start script for Linux, WSL and Git Bash on Windows.
# macOS users: run ./run-mac.sh instead.
#
# Usage:
#   ./run.sh            set up if needed, then start the development server
#   ./run.sh setup      install dependencies and prepare the database, then stop
#   ./run.sh reset      wipe the database and reseed the demo company
#   ./run.sh build      production build
#   ./run.sh start      production server (builds first if needed)
#   ./run.sh clean      remove node_modules, the build output and the database

set -euo pipefail

cd "$(dirname "$0")"

PORT="${PORT:-3000}"
DB_FILE="prisma/dev.db"

# ---------------------------------------------------------------- output ----
if [ -t 1 ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'
  YELLOW=$'\033[33m'; PLUM=$'\033[35m'; RESET=$'\033[0m'
else
  BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; PLUM=""; RESET=""
fi

step() { printf '%s==>%s %s\n' "$PLUM$BOLD" "$RESET$BOLD" "$1$RESET"; }
info() { printf '    %s\n' "$1"; }
ok()   { printf '    %s%s%s\n' "$GREEN" "$1" "$RESET"; }
warn() { printf '    %s%s%s\n' "$YELLOW" "$1" "$RESET"; }
die()  { printf '%serror:%s %s\n' "$RED$BOLD" "$RESET" "$1" >&2; exit 1; }

banner() {
  printf '\n%sDayflow%s %s— Human Resource Management System%s\n\n' "$BOLD$PLUM" "$RESET" "$DIM" "$RESET"
}

# ------------------------------------------------------------ preflight ----
check_node() {
  command -v node >/dev/null 2>&1 || die "Node.js is not installed. Install Node 18 or newer from https://nodejs.org"
  command -v npm  >/dev/null 2>&1 || die "npm is not available. Reinstall Node.js."

  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$major" -ge 18 ] || die "Node $(node -v) is too old. Dayflow needs Node 18 or newer."
  ok "Node $(node -v), npm $(npm -v)"
}

# ------------------------------------------------------------ env file -----
random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32
  else
    node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("base64"))'
  fi
}

ensure_env() {
  if [ -f .env ]; then
    ok ".env is present"
    return
  fi

  [ -f .env.example ] || die ".env.example is missing. Pull the latest changes and try again."
  cp .env.example .env

  local secret
  secret="$(random_secret)"
  node - "$secret" <<'NODE'
const fs = require("node:fs");
const secret = process.argv[2];
const contents = fs.readFileSync(".env", "utf8")
  .replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET="${secret}"`);
fs.writeFileSync(".env", contents);
NODE
  ok "Created .env with a fresh SESSION_SECRET"
}

# --------------------------------------------------------- dependencies ----
# Compares a checksum of the lockfile rather than timestamps, which are
# unreliable when npm rewrites the lockfile in the same second as the install.
lock_checksum() {
  node -e 'const c=require("node:crypto"),f=require("node:fs");process.stdout.write(c.createHash("sha256").update(f.readFileSync("package-lock.json")).digest("hex"))'
}

ensure_dependencies() {
  local stamp="node_modules/.dayflow-lock"

  if [ -d node_modules ] && [ -f "$stamp" ] && [ "$(cat "$stamp")" = "$(lock_checksum)" ]; then
    ok "Dependencies are up to date"
    return
  fi

  info "Installing dependencies, this takes a minute on a first run…"
  npm install --no-audit --no-fund
  lock_checksum > "$stamp"
  ok "Dependencies installed"
}

# -------------------------------------------------------------- database ---
prepare_database() {
  npx prisma generate >/dev/null 2>&1 || die "Could not generate the Prisma client."
  ok "Prisma client generated"

  if [ -f "$DB_FILE" ]; then
    npx prisma db push --skip-generate >/dev/null 2>&1 || die "Could not apply the schema."
    ok "Database schema is up to date"
    info "Existing data kept. Run ./run.sh reset to reseed the demo company."
  else
    npx prisma db push --skip-generate >/dev/null 2>&1 || die "Could not create the database."
    ok "Database created"
    info "Seeding the demo company…"
    npm run db:seed
  fi
}

reset_database() {
  step "Resetting the database"

  # Only a local SQLite file is ever deleted. Against any other datasource this
  # reseeds without dropping anything, which is the safe behaviour by default.
  local url
  url="$(node -e 'const f=require("node:fs");const m=f.readFileSync(".env","utf8").match(/^DATABASE_URL="?([^"\n]*)"?/m);process.stdout.write(m?m[1]:"")')"

  case "$url" in
    file:*)
      rm -f "$DB_FILE" "$DB_FILE-journal"
      npx prisma db push --skip-generate >/dev/null 2>&1 || die "Could not recreate the database."
      ok "Database recreated"
      ;;
    *)
      warn "DATABASE_URL is not a local SQLite file."
      warn "Reseeding without dropping tables. Drop them yourself if you need a clean slate."
      npx prisma db push --skip-generate >/dev/null 2>&1 || die "Could not apply the schema."
      ok "Schema applied"
      ;;
  esac

  npm run db:seed
}


# ------------------------------------------------------------- commands ----
sign_in_hint() {
  printf '\n  %sSign in at%s http://localhost:%s\n' "$BOLD" "$RESET" "$PORT"
  printf '  %sLogin ID%s OIJODO20220001   %sPassword%s Dayflow@2026   %s(administrator)%s\n' \
    "$DIM" "$RESET" "$DIM" "$RESET" "$DIM" "$RESET"
  printf '  %sLogin ID%s OIARKU20230001   %sPassword%s Dayflow@2026   %s(employee)%s\n\n' \
    "$DIM" "$RESET" "$DIM" "$RESET" "$DIM" "$RESET"
}

do_setup() {
  step "Checking your toolchain"; check_node
  step "Checking configuration";  ensure_env
  step "Installing dependencies"; ensure_dependencies
  step "Preparing the database";  prepare_database
}

case "${1:-dev}" in
  dev)
    banner; do_setup
    step "Starting the development server"
    sign_in_hint
    exec npm run dev -- --port "$PORT"
    ;;

  setup)
    banner; do_setup
    printf '\n%sReady.%s Run ./run.sh to start the server.\n\n' "$GREEN$BOLD" "$RESET"
    ;;

  reset)
    banner
    step "Checking your toolchain"; check_node
    step "Checking configuration";  ensure_env
    step "Installing dependencies"; ensure_dependencies
    reset_database
    printf '\n%sDone.%s\n\n' "$GREEN$BOLD" "$RESET"
    ;;

  build)
    banner; do_setup
    step "Building for production"
    npm run build
    printf '\n%sBuild complete.%s Run ./run.sh start to serve it.\n\n' "$GREEN$BOLD" "$RESET"
    ;;

  start)
    banner; do_setup
    [ -d .next ] || { step "Building for production"; npm run build; }
    step "Starting the production server"
    sign_in_hint
    exec npm run start -- --port "$PORT"
    ;;

  clean)
    banner
    warn "This removes node_modules, .next and $DB_FILE."
    printf '    Continue? [y/N] '
    read -r reply
    case "$reply" in
      [yY]*)
        rm -rf node_modules .next "$DB_FILE" "$DB_FILE-journal"
        ok "Cleaned. Run ./run.sh to set the project up again."
        ;;
      *) info "Cancelled." ;;
    esac
    ;;

  -h|--help|help)
    banner
    sed -n '6,12p' "$0" | sed 's/^# \{0,1\}//'
    ;;

  *)
    die "Unknown command '$1'. Try ./run.sh --help"
    ;;
esac
