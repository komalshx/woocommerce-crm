import { Router } from 'express';
import { prisma } from '../db.js';
import { wrap, HttpError, pageArgs, pageMeta } from '../utils/http.js';
import { idParams, taskCreateBody, taskListQuery, taskUpdateBody } from '../validators/index.js';

const router = Router();

router.get('/', wrap(async (req, res) => {
  const q = taskListQuery.parse(req.query);
  const now = new Date();
  const where = {
    ...(q.customerId ? { customerId: q.customerId } : {}),
    ...(q.status === 'completed' ? { status: 'COMPLETED' } : {}),
    ...(q.status === 'pending' ? { status: 'PENDING' } : {}),
    ...(q.status === 'overdue' ? { status: 'PENDING', dueDate: { lt: now } } : {}),
  };
  const [total, data] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({ where, orderBy: [{ status: 'desc' }, { dueDate: 'asc' }], ...pageArgs(q), include: { customer: { select: { id: true, firstName: true, lastName: true, email: true } } } }),
  ]);
  res.json({ data, meta: pageMeta(total, q) });
}));

router.post('/', wrap(async (req, res) => {
  const body = taskCreateBody.parse(req.body);
  const customer = await prisma.customer.findUnique({ where: { id: body.customerId }, select: { id: true } });
  if (!customer) throw new HttpError(404, 'Customer not found');
  res.status(201).json(await prisma.task.create({ data: body }));
}));

router.patch('/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const body = taskUpdateBody.parse(req.body);
  const data = { ...body };
  if (body.status) data.completedAt = body.status === 'COMPLETED' ? new Date() : null;
  res.json(await prisma.task.update({ where: { id }, data }));
}));

router.delete('/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  await prisma.task.delete({ where: { id } });
  res.status(204).end();
}));

export default router;
