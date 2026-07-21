#!/usr/bin/env python3
"""Proper double-fork daemon launcher for the dev server.

Double-fork + setsid ensures the spawned process:
  1. Is not a process group leader (first fork)
  2. Becomes a new session leader with no controlling terminal (setsid)
  3. Cannot reacquire a controlling terminal (second fork)
  4. Reparents to PID 1 (init/tini) so it survives bash tool teardown

Writes the final child PID to /home/z/my-project/dev-server.pid.
"""
import os
import sys
import subprocess
import time

WORKDIR = "/home/z/my-project"
LOGFILE = "/home/z/my-project/dev.log"
PIDFILE = "/home/z/my-project/dev-server.pid"
BUN = "/usr/local/bin/bun"

# Truncate the log
with open(LOGFILE, "w") as f:
    f.write("")

# First fork
pid = os.fork()
if pid > 0:
    # Parent exits immediately
    print(f"first-fork parent exiting, child={pid}")
    sys.exit(0)

# Child: become new session leader, drop controlling terminal
os.setsid()

# Second fork — child cannot reacquire a controlling terminal
pid = os.fork()
if pid > 0:
    # Intermediate parent exits
    sys.exit(0)

# Grandchild: the actual daemon
os.chdir(WORKDIR)
os.umask(0)

# Detach all stdio from the bash tool's pipes
devnull_fd = os.open(os.devnull, os.O_RDWR)
log_fd = os.open(LOGFILE, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
os.dup2(devnull_fd, 0)  # stdin <- /dev/null
os.dup2(log_fd, 1)      # stdout -> dev.log
os.dup2(log_fd, 2)      # stderr -> dev.log

# Write PID before exec so the launcher can verify
with open(PIDFILE, "w") as f:
    f.write(str(os.getpid()))

# Flush any buffered output
sys.stdout.flush()
sys.stderr.flush()

# Exec bun — replaces this process entirely
os.execv(BUN, [BUN, "run", "dev"])
