import { Router } from 'express';
import { prisma } from '../db.js';
import { wrap, HttpError, normalizeEmail, pageArgs, pageMeta } from '../utils/http.js';
import { customerBody, customerCreateBody, customerListQuery, idParams, noteBody, noteIdParams } from '../validators/index.js';
import { emptyStats, getStats } from '../services/segments.js';
import { findDuplicateGroups } from '../services/customers.js';

const router = Router();
const withStats = (customers, stats) => customers.map((c) => ({ ...c, stats: stats.get(c.id) || emptyStats }));

router.get('/', wrap(async (req, res) => {
  const q = customerListQuery.parse(req.query);
  const and = [];
  for (const token of (q.q || '').split(/\s+/).filter(Boolean)) {
    and.push({ OR: [
      { email: { contains: token, mode: 'insensitive' } },
      { firstName: { contains: token, mode: 'insensitive' } },
      { lastName: { contains: token, mode: 'insensitive' } },
      { phone: { contains: token } },
    ] });
  }
  if (q.segment) {
    const all = await getStats();
    if (q.segment === 'none') and.push({ id: { notIn: [...all.keys()] } });
    else and.push({ id: { in: [...all].filter(([, s]) => s.segment === q.segment).map(([id]) => id) } });
  }
  const where = and.length ? { AND: and } : {};
  const orderBy = q.sort === 'name' ? [{ lastName: q.dir }, { firstName: q.dir }] : { [q.sort]: q.dir };
  const [total, rows] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({ where, orderBy, ...pageArgs(q) }),
  ]);
  const stats = await getStats(rows.map((c) => c.id));
  res.json({ data: withStats(rows, stats), meta: pageMeta(total, q) });
}));

router.get('/duplicates', wrap(async (req, res) => res.json({ data: await findDuplicateGroups() })));

router.post('/', wrap(async (req, res) => {
  const body = customerCreateBody.parse(req.body);
  const customer = await prisma.customer.create({ data: { ...body, email: normalizeEmail(body.email), source: 'crm' } });
  res.status(201).json(customer);
}));

router.get('/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { dateCreated: 'desc' }, take: 50, include: { items: { select: { name: true, quantity: true } } } },
      notes: { orderBy: { createdAt: 'asc' } },
      tasks: { orderBy: [{ status: 'desc' }, { dueDate: 'asc' }] },
      communications: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
  if (!customer) throw new HttpError(404, 'Customer not found');
  const stats = await getStats([id]);
  res.json({ ...customer, stats: stats.get(id) || emptyStats });
}));

// WooCommerce-sourced records are owned by WooCommerce: only CRM tags may be changed.
router.patch('/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const body = customerBody.parse(req.body);
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Customer not found');
  let data = body;
  if (existing.source === 'woocommerce') {
    if (Object.keys(body).some((k) => k !== 'tags')) throw new HttpError(403, 'Name, email and phone come from WooCommerce and cannot be edited here. Only tags can be changed.');
  } else if (body.email) data = { ...body, email: normalizeEmail(body.email) };
  res.json(await prisma.customer.update({ where: { id }, data }));
}));

router.post('/:id/notes', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const { body } = noteBody.parse(req.body);
  const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
  if (!customer) throw new HttpError(404, 'Customer not found');
  res.status(201).json(await prisma.note.create({ data: { customerId: id, body } }));
}));

router.patch('/notes/:noteId', wrap(async (req, res) => {
  const { noteId } = noteIdParams.parse(req.params);
  const { body } = noteBody.parse(req.body);
  res.json(await prisma.note.update({ where: { id: noteId }, data: { body } }));
}));

router.delete('/notes/:noteId', wrap(async (req, res) => {
  const { noteId } = noteIdParams.parse(req.params);
  await prisma.note.delete({ where: { id: noteId } });
  res.status(204).end();
}));

export default router;
