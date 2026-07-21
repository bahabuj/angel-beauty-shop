#!/bin/bash
# Fully detached dev server daemon
cd /home/z/my-project

# Clear log
: > /home/z/my-project/dev.log

# Start dev server in its own session, fully detached
exec /usr/local/bin/bun run dev >> /home/z/my-project/dev.log 2>&1
