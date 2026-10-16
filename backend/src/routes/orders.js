import { Router } from 'express';
import { prisma } from '../db.js';
import { wrap, HttpError, pageArgs, pageMeta } from '../utils/http.js';
import { idParams, orderListQuery } from '../validators/index.js';

const router = Router();
const customerSelect = { id: true, firstName: true, lastName: true, email: true };

// Orders are read-only mirrors of WooCommerce; there are intentionally no write endpoints.
router.get('/', wrap(async (req, res) => {
  const q = orderListQuery.parse(req.query);
  const where = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.customerId ? { customerId: q.customerId } : {}),
    ...(q.from || q.to ? { dateCreated: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } } : {}),
    ...(q.q ? { OR: [
      { number: { contains: q.q } },
      { billingName: { contains: q.q, mode: 'insensitive' } },
      { billingEmail: { contains: q.q, mode: 'insensitive' } },
    ] } : {}),
  };
  const [total, data] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, orderBy: { dateCreated: 'desc' }, ...pageArgs(q), include: { customer: { select: customerSelect }, items: { select: { name: true, quantity: true }, take: 3 } } }),
  ]);
  res.json({ data, meta: pageMeta(total, q) });
}));

router.get('/statuses', wrap(async (req, res) => {
  const rows = await prisma.order.groupBy({ by: ['status'], _count: { _all: true } });
  res.json({ data: rows.map((r) => ({ status: r.status, count: r._count._all })) });
}));

router.get('/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, customer: { select: customerSelect } } });
  if (!order) throw new HttpError(404, 'Order not found');
  res.json(order);
}));

export default router;
