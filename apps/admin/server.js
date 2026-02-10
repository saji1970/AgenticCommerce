import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;
const MANDATE_SERVICE_URL = process.env.MANDATE_SERVICE_URL || 'http://localhost:3001';

// Parse JSON bodies before proxy
app.use(express.json());

// Proxy /api requests to mandate-service
app.use('/api', async (req, res) => {
  try {
    const url = `${MANDATE_SERVICE_URL}${req.originalUrl}`;
    const fetchHeaders = {
      'content-type': 'application/json',
    };
    if (req.headers.authorization) {
      fetchHeaders['authorization'] = req.headers.authorization;
    }

    const hasBody = !['GET', 'HEAD', 'DELETE'].includes(req.method);

    const response = await fetch(url, {
      method: req.method,
      headers: fetchHeaders,
      body: hasBody && req.body ? JSON.stringify(req.body) : undefined,
    });

    res.status(response.status);
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('content-type', contentType);
    }
    const body = await response.text();
    res.send(body);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(502).json({ error: 'Bad Gateway' });
  }
});

// Serve static files from dist
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback - serve index.html for all non-API, non-file routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Admin UI running on port ${PORT}`);
  console.log(`Proxying /api to ${MANDATE_SERVICE_URL}`);
});
