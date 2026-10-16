import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import webhookRouter from './webhooks/woocommerce.js';
import customers from './routes/customers.js';
import orders from './routes/orders.js';
import tasks from './routes/tasks.js';
import communications from './routes/communications.js';
import insights from './routes/insights.js';
import agent from './routes/agent.js';
import integrations from './routes/integrations.js';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: config.clientOrigin }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/webhooks', webhookRouter); // raw body + signature auth, so before json() and requireAuth
app.use(express.json({ limit: '100kb' }));
app.use('/api', requireAuth);
app.use('/api/customers', customers);
app.use('/api/orders', orders);
app.use('/api/tasks', tasks);
app.use('/api/communications', communications);
app.use('/api/insights', insights);
app.use('/api/agent', agent);
app.use('/api/integrations', integrations);
app.use(notFound);
app.use(errorHandler);

export default app;
