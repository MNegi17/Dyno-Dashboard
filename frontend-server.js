import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const BACKEND_URL = process.env.BACKEND_URL || 'https://backend-production-bbaa.up.railway.app';

console.log(`[Frontend Server] Starting on port ${PORT}...`);

// Proxy /api/uniware -> Uniware OMS
app.use('/api/uniware', createProxyMiddleware({
  target: 'https://purpleunited.unicommerce.com',
  changeOrigin: true,
  pathRewrite: { '^/api/uniware': '' },
  timeout: 30000
}));

// Proxy /api -> Railway Python Backend
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  timeout: 90000
}));

// Serve Vite build output
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Fallback: All other routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Frontend Server] Running on http://0.0.0.0:${PORT}`);
  console.log(`[Frontend Server] Proxying /api/uniware -> https://purpleunited.unicommerce.com`);
  console.log(`[Frontend Server] Proxying /api -> ${BACKEND_URL}`);
});
