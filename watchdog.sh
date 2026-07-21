#!/bin/bash
# Persistent dev server watchdog — restarts next dev if it dies
cd /home/z/my-project
exec >> /home/z/my-project/dev.log 2>&1

# Detach from controlling tty
trap '' HUP INT TERM

while true; do
  echo "[watchdog] starting next dev at $(date -u +%FT%TZ)"
  /usr/local/bin/bun run dev
  EXIT=$?
  echo "[watchdog] next dev exited (code=$EXIT) at $(date -u +%FT%TZ), restarting in 3s..."
  sleep 3
done
