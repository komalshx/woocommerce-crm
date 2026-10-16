import { Router } from 'express';
import { prisma } from '../db.js';
import { emailConfigured, wooConfigured, config } from '../config.js';
import { wrap } from '../utils/http.js';
import { getSyncState, startSync } from '../services/sync.js';

const router = Router();

router.get('/status', wrap(async (req, res) => {
  res.json({
    woocommerce: { configured: wooConfigured(), webhookSecretConfigured: Boolean(config.woo.webhookSecret), storeUrl: config.woo.url || null },
    email: { configured: emailConfigured() },
    sync: await getSyncState(),
    segmentRules: config.segments,
  });
}));

router.post('/sync', wrap(async (req, res) => {
  startSync(); // throws 503/409 when not configured or already running
  res.status(202).json({ started: true });
}));

router.get('/webhook-events', wrap(async (req, res) => {
  res.json({ data: await prisma.webhookEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 25 }) });
}));

export default router;
