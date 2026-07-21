#!/bin/bash
cd /home/z/my-project
echo "[$(date)] Starting server..." >> /home/z/my-project/server-lifecycle.log
npx next dev -p 3000
EXIT_CODE=$?
echo "[$(date)] Server exited with code $EXIT_CODE" >> /home/z/my-project/server-lifecycle.log
