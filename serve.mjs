import { spawn } from 'child_process';

function startServer() {
  console.log('[serve] Starting Next.js dev server...');
  const child = spawn('npx', ['next', 'dev', '-p', '3000'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  child.on('exit', (code, signal) => {
    console.log(`[serve] Server exited with code ${code}, signal ${signal}. Restarting in 3s...`);
    setTimeout(startServer, 3000);
  });

  child.on('error', (err) => {
    console.error('[serve] Failed to start server:', err);
    setTimeout(startServer, 3000);
  });
}

startServer();

// Keep the process alive
process.on('SIGTERM', () => { console.log('[serve] SIGTERM received'); });
process.on('SIGINT', () => { console.log('[serve] SIGINT received'); process.exit(0); });
