import crypto from 'node:crypto';
import { config } from '../config.js';

// Optional shared-token guard. Real deployments should set ADMIN_TOKEN (or put the app behind SSO/VPN).
export function requireAuth(req, res, next) {
  if (!config.adminToken) return next();
  const given = Buffer.from((req.get('authorization') || '').replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(config.adminToken);
  if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) return next();
  return res.status(401).json({ error: 'Authentication required' });
}
