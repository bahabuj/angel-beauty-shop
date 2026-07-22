#!/usr/bin/env python3
"""Launch angel-beauty-shop dev server fully detached from the current shell."""
import os, signal, subprocess, sys, time

PROJECT_DIR = "/home/z/my-project/angel-beauty-shop"
LOG_FILE = "/tmp/angel-dev.log"
PID_FILE = "/tmp/angel-dev.pid"

try:
    with open(PID_FILE) as f: old_pid = int(f.read().strip())
    try: os.kill(old_pid, signal.SIGTERM); time.sleep(2)
    except: pass
except: pass

env = {k: v for k, v in os.environ.items() if k != "DATABASE_URL"}
with open(os.path.join(PROJECT_DIR, ".env.local")) as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line: continue
        k, _, v = line.partition("=")
        env[k] = v.strip().strip('"').strip("'")

watchdog_script = """#!/bin/bash
cd /home/z/my-project/angel-beauty-shop
trap '' HUP INT TERM
while true; do
    echo "[watchdog] starting next dev at $(date -u +%FT%TZ)"
    /usr/local/bin/bun run dev
    EXIT=$?
    echo "[watchdog] next dev exited (code=$EXIT) at $(date -u +%FT%TZ), restarting in 3s..."
    sleep 3
done
"""
with open("/tmp/angel-watchdog.sh", "w") as f: f.write(watchdog_script)
os.chmod("/tmp/angel-watchdog.sh", 0o755)
with open(LOG_FILE, "w") as f: pass

proc = subprocess.Popen(
    ["/bin/bash", "/tmp/angel-watchdog.sh"],
    stdout=open(LOG_FILE, "ab"),
    stderr=subprocess.STDOUT,
    stdin=subprocess.DEVNULL,
    env=env,
    start_new_session=True,
    cwd=PROJECT_DIR,
)
with open(PID_FILE, "w") as f: f.write(str(proc.pid))
print(f"Started watchdog PID={proc.pid}, log={LOG_FILE}")
print("Waiting 12s for next dev to be ready...")
time.sleep(12)
if proc.poll() is None:
    print(f"Watchdog alive after 12s.")
else:
    print(f"Watchdog died with code={proc.returncode}")
    sys.exit(1)
