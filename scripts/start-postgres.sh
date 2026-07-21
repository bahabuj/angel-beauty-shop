#!/usr/bin/env bash
# Starts a local PostgreSQL 17 instance for development.
# - Binaries:   ~/pgroot  (extracted from Debian postgresql-17 deb, full path layout preserved)
# - Data dir:   ~/pgdata
# - Port:       5433  (avoids conflicts with any system postgres on 5432)
# - User/DB:    angelsbeauty / angelsbeauty  (trust auth, localhost only)
#
# No sudo required. Safe to run multiple times (idempotent).
set -euo pipefail

PG_BIN="$HOME/pgroot/usr/lib/postgresql/17/bin"
PG_DATA="$HOME/pgdata"
PG_PORT=5433
PG_LOG="$PG_DATA/pg.log"

# 1. Ensure data dir exists
if [ ! -d "$PG_DATA" ]; then
  echo "[pg] Initializing data directory at $PG_DATA ..."
  "$PG_BIN/initdb" -D "$PG_DATA" -U angelsbeauty --auth=trust --no-locale --encoding=UTF8
  echo "port = $PG_PORT"            >> "$PG_DATA/postgresql.conf"
  echo "listen_addresses = '127.0.0.1'" >> "$PG_DATA/postgresql.conf"
  echo "unix_socket_directories = '/tmp'" >> "$PG_DATA/postgresql.conf"
fi

# 2. Check if already running
if "$PG_BIN/pg_isready" -h 127.0.0.1 -p "$PG_PORT" -U angelsbeauty >/dev/null 2>&1; then
  echo "[pg] Already running on port $PG_PORT"
  exit 0
fi

# 3. Start
echo "[pg] Starting PostgreSQL on port $PG_PORT ..."
"$PG_BIN/pg_ctl" -D "$PG_DATA" -l "$PG_LOG" -o "-p $PG_PORT" start
sleep 1

# 4. Create database if missing
if ! "$PG_BIN/psql" -h 127.0.0.1 -p "$PG_PORT" -U angelsbeauty -d postgres -tAc \
     "SELECT 1 FROM pg_database WHERE datname='angelsbeauty'" | grep -q 1; then
  echo "[pg] Creating database 'angelsbeauty' ..."
  "$PG_BIN/createdb" -h 127.0.0.1 -p "$PG_PORT" -U angelsbeauty angelsbeauty
fi

echo "[pg] Ready: postgresql://angelsbeauty@127.0.0.1:$PG_PORT/angelsbeauty"
