import crypto from 'node:crypto';
import express, { Router } from 'express';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { wrap } from '../utils/http.js';
import { upsertOrder } from '../services/sync.js';
import { upsertWooCustomer } from '../services/customers.js';

const router = Router();

function validSignature(rawBody, signature) {
  const expected = crypto.createHmac('sha256', config.woo.webhookSecret).update(rawBody).digest();
  const given = Buffer.from(signature || '', 'base64');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

async function handle(topic, payload) {
  if (!Number.isInteger(payload?.id)) throw new Error('Payload has no numeric id');
  switch (topic) {
    case 'order.created':
    case 'order.updated':
    case 'order.restored':
      await upsertOrder(payload);
      return 'PROCESSED';
    case 'order.deleted':
      await prisma.order.deleteMany({ where: { wooId: payload.id } });
      return 'PROCESSED';
    case 'customer.created':
    case 'customer.updated':
      await upsertWooCustomer(payload);
      return 'PROCESSED';
    default:
      return 'IGNORED'; // e.g. customer.deleted: CRM history is kept
  }
}

// Mounted before express.json(): the signature must be computed over the unmodified raw body.
router.post('/woocommerce', express.raw({ type: '*/*', limit: '2mb' }), wrap(async (req, res) => {
  if (!config.woo.webhookSecret) return res.status(503).json({ error: 'Webhook secret is not configured' });
  if (!Buffer.isBuffer(req.body) || !validSignature(req.body, req.get('x-wc-webhook-signature'))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  const topic = req.get('x-wc-webhook-topic');
  const deliveryId = req.get('x-wc-webhook-delivery-id') || req.get('x-wc-webhook-id');
  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(200).json({ ignored: 'non-JSON payload (WooCommerce ping)' });
  }
  if (!topic || !deliveryId) return res.status(400).json({ error: 'Missing WooCommerce webhook headers' });

  const seen = await prisma.webhookEvent.findUnique({ where: { deliveryId } });
  if (seen?.status === 'PROCESSED' || seen?.status === 'IGNORED') return res.json({ duplicate: true });
  await prisma.webhookEvent.upsert({ where: { deliveryId }, create: { deliveryId, topic, status: 'RECEIVED' }, update: { topic, status: 'RECEIVED', error: null } });
  try {
    const status = await handle(topic, payload);
    await prisma.webhookEvent.update({ where: { deliveryId }, data: { status } });
    res.json({ status });
  } catch (e) {
    await prisma.webhookEvent.update({ where: { deliveryId }, data: { status: 'FAILED', error: String(e.message).slice(0, 300) } });
    res.status(500).json({ error: 'Processing failed' }); // non-2xx makes WooCommerce retry
  }
}));

export default router;
