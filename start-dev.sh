#!/bin/bash
# Daemon script to start Next.js dev server
cd /home/z/my-project

# Kill any existing process on port 3000
fuser -k 3000/tcp 2>/dev/null || true
sleep 1

# Start the server
exec npx next dev -p 3000 --webpack >> /home/z/my-project/dev.log 2>&1
