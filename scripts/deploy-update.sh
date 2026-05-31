#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/bodybuild}"
SERVICE_NAME="${SERVICE_NAME:-bodybuild}"
BRANCH="${BRANCH:-}"
BACKUP_DIR="${BACKUP_DIR:-/var/lib/bodybuild/backups/deploy}"
DATABASE_URL="${DATABASE_URL:-file:/var/lib/bodybuild/bodybuild.db}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT:-8787}/api/health}"
RUN_LINT="${RUN_LINT:-0}"
RUN_PROD_CHECK="${RUN_PROD_CHECK:-0}"
ALLOW_DIRTY="${ALLOW_DIRTY:-0}"
LOCK_FILE="${LOCK_FILE:-/tmp/bodybuild-deploy.lock}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"
}

database_path_from_url() {
  case "$DATABASE_URL" in
    file:*) printf '%s\n' "${DATABASE_URL#file:}" ;;
    *) printf '%s\n' "" ;;
  esac
}

run_health_check() {
  local attempt
  for attempt in $(seq 1 20); do
    if curl -fsS "$HEALTH_URL" >/tmp/bodybuild-health.json 2>/tmp/bodybuild-health.err; then
      if grep -q '"ok"[[:space:]]*:[[:space:]]*true' /tmp/bodybuild-health.json; then
        log "health check passed: $HEALTH_URL"
        return 0
      fi
    fi
    sleep 1
  done

  log "health response:"
  cat /tmp/bodybuild-health.json 2>/dev/null || true
  log "health error:"
  cat /tmp/bodybuild-health.err 2>/dev/null || true
  return 1
}

need_cmd git
need_cmd npm
need_cmd curl
need_cmd tar
need_cmd sudo
need_cmd systemctl

if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_FILE"
  flock -n 9 || fail "another deploy is already running"
fi

cd "$APP_DIR"

if [ ! -d .git ]; then
  fail "$APP_DIR is not a git repository"
fi

if [ "$ALLOW_DIRTY" != "1" ]; then
  git diff --quiet || fail "working tree has unstaged changes; set ALLOW_DIRTY=1 to override"
  git diff --cached --quiet || fail "working tree has staged changes; set ALLOW_DIRTY=1 to override"
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
DEPLOY_BRANCH="${BRANCH:-$CURRENT_BRANCH}"
PREVIOUS_COMMIT="$(git rev-parse HEAD)"
STAMP="$(date '+%Y%m%d-%H%M%S')"
DB_PATH="$(database_path_from_url)"

log "deploy start"
log "app dir: $APP_DIR"
log "branch: $DEPLOY_BRANCH"
log "previous commit: $PREVIOUS_COMMIT"
log "service: $SERVICE_NAME"
log "health url: $HEALTH_URL"

mkdir -p "$BACKUP_DIR"

if [ -n "$DB_PATH" ] && [ -f "$DB_PATH" ]; then
  log "backup database: $DB_PATH"
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB_PATH" 'PRAGMA wal_checkpoint(TRUNCATE);' || log "sqlite checkpoint failed; continuing with file copy"
  else
    log "sqlite3 not found; skipping WAL checkpoint"
  fi
  cp "$DB_PATH" "$BACKUP_DIR/bodybuild-$STAMP.db"
  [ -f "$DB_PATH-wal" ] && cp "$DB_PATH-wal" "$BACKUP_DIR/bodybuild-$STAMP.db-wal"
  [ -f "$DB_PATH-shm" ] && cp "$DB_PATH-shm" "$BACKUP_DIR/bodybuild-$STAMP.db-shm"
fi

BUILD_BACKUP="$BACKUP_DIR/build-$STAMP.tgz"
if [ -d dist ] || [ -d dist-server ]; then
  log "backup build artifacts: $BUILD_BACKUP"
  tar -czf "$BUILD_BACKUP" dist dist-server 2>/dev/null || true
fi

log "fetch latest code"
git fetch origin "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

log "install dependencies"
npm ci --include=dev

log "generate prisma client"
npm run prisma:generate

log "ensure database schema"
npm run db:init

if [ "$RUN_LINT" = "1" ]; then
  log "run lint"
  npm run lint
fi

log "build app"
npm run build

log "check export payload"
npm run export:check

if [ "$RUN_PROD_CHECK" = "1" ]; then
  log "run production smoke check"
  npm run prod:check
fi

log "restart service"
sudo systemctl restart "$SERVICE_NAME"

log "health check"
if ! run_health_check; then
  log "deploy failed after restart"
  log "previous commit: $PREVIOUS_COMMIT"
  log "database backup dir: $BACKUP_DIR"
  log "build backup: $BUILD_BACKUP"
  fail "health check failed"
fi

log "deploy complete"
