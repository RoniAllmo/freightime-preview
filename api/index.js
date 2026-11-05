/**
 * Express app for the FreighTime B2B API. Exported without listening,
 * so a serverless platform can mount it; server.js listens locally.
 *
 * Authentication, rate limiting, hosting and client-input retention are
 * open decisions (PRODUCT_SPEC.md §0.8). This app adds no request
 * logging, and it must not be exposed publicly until they are decided.
 */

import express from 'express';
import { loadDatabase, lookupCompliance } from './lib/compliance.js';

const db = loadDatabase();
const app = express();
app.disable('x-powered-by');

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', schema_version: db.schema_version, family_count: db.family_count });
});

app.get('/api/v1/compliance', (req, res) => {
  const { status, body } = lookupCompliance(db, req.query);
  res.status(status).json(body);
});

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Use GET /api/v1/compliance?hs6=XXXXXX&import_type=commercial|personal.' });
});

export default app;
