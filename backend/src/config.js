import 'dotenv/config';

const num = (v, d) => (Number.isFinite(Number(v)) && v !== undefined && v !== '' ? Number(v) : d);

export const config = {
  port: num(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  adminToken: process.env.ADMIN_TOKEN || '',
  woo: {
    url: (process.env.WOOCOMMERCE_URL || '').replace(/\/$/, ''),
    key: process.env.WOOCOMMERCE_CONSUMER_KEY || '',
    secret: process.env.WOOCOMMERCE_CONSUMER_SECRET || '',
    webhookSecret: process.env.WOOCOMMERCE_WEBHOOK_SECRET || '',
  },
  email: {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || '',
  },
  // Single place where segment rules live. Documented in README.
  segments: {
    // Only these order statuses count as purchases. Cancelled/failed/refunded/pending do not.
    qualifyingStatuses: ['completed', 'processing'],
    loyalMinOrders: num(process.env.LOYAL_MIN_ORDERS, 3),
    inactiveAfterDays: num(process.env.INACTIVE_AFTER_DAYS, 90),
  },
};

export const wooConfigured = () => Boolean(config.woo.url && config.woo.key && config.woo.secret);
export const emailConfigured = () => Boolean(config.email.apiKey && config.email.from);
