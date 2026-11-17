const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
// Private Google Apps Script Webhook (Server-side only, completely hidden from clients)
const GOOGLE_SCRIPT_WEBHOOK = process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz9WhVhY_m3bqAIohqRJSpDjg2xqYA1UfSZ6PBf7Wc7nCUg_W9tCvWy2vmpxUt1K-0tlQ/exec';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

// Simple in-memory rate limiter: max 10 requests per minute per IP
const rateLimits = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxReqs = 10;
  const record = rateLimits.get(ip) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
  } else {
    record.count++;
  }
  rateLimits.set(ip, record);
  return record.count > maxReqs;
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimits.entries()) {
    if (now > record.resetAt) rateLimits.delete(ip);
  }
}, 60000);

const server = http.createServer((req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // Apply Security Headers to all responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // --- Secure Form Submission API Proxy ---
  if (pathname === '/api/quote' && req.method === 'POST') {
    if (isRateLimited(clientIp)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Too many requests. Please wait a moment.' }));
      return;
    }

    let body = '';
    const MAX_SIZE = 15 * 1024 * 1024; // 15MB max payload

    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Payload too large.' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);

        // Anti-Bot Honeypot Check: if bot filled hidden field, return fake success
        if (payload._hp_fax && payload._hp_fax.trim() !== '') {
          console.warn(`[Security] Bot honeypot triggered from ${clientIp}. Dropping silently.`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', message: 'Quote received.' }));
          return;
        }

        // Basic payload validation
        if (!payload.firstName || !payload.phone || !payload.email) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Missing required contact fields.' }));
          return;
        }

        // Remove honeypot field before forwarding
        delete payload._hp_fax;

        // Immediate Fast Response to User (Zero Wait Time)
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Quote received successfully.' }));

        // Reliable background delivery to Google Apps Script (Drive, Sheets & Email)
        const targetUrl = new URL(GOOGLE_SCRIPT_WEBHOOK);
        const postData = JSON.stringify(payload);

        const options = {
          hostname: targetUrl.hostname,
          path: targetUrl.pathname + targetUrl.search,
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const forwardReq = https.request(options, (forwardRes) => {
          let responseData = '';
          forwardRes.on('data', d => responseData += d);
          forwardRes.on('end', () => {
            if (forwardRes.statusCode >= 300 && forwardRes.statusCode < 400 && forwardRes.headers.location) {
              https.get(forwardRes.headers.location, () => {
                console.log(`[Google Webhook Success] Quote for ${payload.firstName} ${payload.lastName} logged and emailed successfully.`);
              }).on('error', err => console.error('[Google Redirect Error]:', err.message));
            } else {
              console.log(`[Google Webhook Success] Quote for ${payload.firstName} ${payload.lastName} processed.`);
            }
          });
        });

        forwardReq.on('error', (err) => {
          console.error('[Google Webhook Delivery Error]:', err.message);
        });

        forwardReq.write(postData);
        forwardReq.end();
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON payload.' }));
      }
    });
    return;
  }

  // --- Static File Serving ---
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  // Prevent directory traversal attacks
  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Website is running at http://localhost:${PORT}`);
});
