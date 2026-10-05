import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

// An actual HTTP request catches Express stripping /api from the mounted proxy.
test('frontend preserves /api and query string when forwarding to backend', { timeout: 15000 }, async () => {
  const backend = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ path: req.url, method: req.method }));
  });
  backend.listen(0, '127.0.0.1');
  await once(backend, 'listening');
  const child = spawn(process.execPath, ['frontend-server.js'], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, PORT: '0', BACKEND_URL: `http://127.0.0.1:${backend.address().port}` },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
  });
  try {
    const port = await new Promise((resolve, reject) => {
      let output = '';
      child.stdout.on('data', chunk => {
        output += chunk;
        const match = output.match(/Running on http:\/\/0\.0\.0\.0:(\d+)/);
        if (match) resolve(Number(match[1]));
      });
      child.on('error', reject);
      child.on('exit', code => reject(new Error(`Frontend exited ${code}`)));
    });
    const response = await fetch(`http://127.0.0.1:${port}/api/sync?force_yesterday=false`, { method: 'POST' });
    assert.deepEqual(await response.json(), { path: '/api/sync?force_yesterday=false', method: 'POST' });
  } finally {
    child.kill();
    backend.close();
  }
});
