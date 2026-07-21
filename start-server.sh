#!/bin/bash
cd /home/z/my-project
exec node -e "
const { startServer } = require('next/dist/server/lib/start-server');
startServer({
  dir: process.cwd(),
  isDev: false,
  hostname: '0.0.0.0',
  port: 3000,
  allowRetry: false,
}).catch(err => console.error('Server error:', err));
"
