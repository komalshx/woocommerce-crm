import { Router } from 'express';
import { prisma } from '../db.js';
import { wrap, pageArgs, pageMeta } from '../utils/http.js';
import { emailPreviewBody, emailSendBody, idParams, pageQuery, templateBody } from '../validators/index.js';
import { previewEmail, sendEmail } from '../services/email.js';
import { z } from 'zod';

const router = Router();
const listQuery = pageQuery.extend({
  customerId: z.coerce.number().int().positive().optional(),
  status: z.enum(['ATTEMPTED', 'ACCEPTED', 'FAILED']).optional(),
});

router.get('/', wrap(async (req, res) => {
  const q = listQuery.parse(req.query);
  const where = { ...(q.customerId ? { customerId: q.customerId } : {}), ...(q.status ? { status: q.status } : {}) };
  const [total, data] = await Promise.all([
    prisma.communication.count({ where }),
    prisma.communication.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q), include: { customer: { select: { id: true, firstName: true, lastName: true, email: true } } } }),
  ]);
  res.json({ data, meta: pageMeta(total, q) });
}));

router.get('/templates', wrap(async (req, res) => res.json({ data: await prisma.emailTemplate.findMany({ orderBy: { name: 'asc' } }) })));
router.post('/templates', wrap(async (req, res) => res.status(201).json(await prisma.emailTemplate.create({ data: templateBody.parse(req.body) }))));
router.put('/templates/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  res.json(await prisma.emailTemplate.update({ where: { id }, data: templateBody.parse(req.body) }));
}));
router.delete('/templates/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  await prisma.emailTemplate.delete({ where: { id } });
  res.status(204).end();
}));

router.post('/preview', wrap(async (req, res) => res.json(await previewEmail(emailPreviewBody.parse(req.body)))));

router.post('/send', wrap(async (req, res) => {
  const { communication, duplicate } = await sendEmail(emailSendBody.parse(req.body));
  // 200 with the real outcome; the client must read communication.status (ACCEPTED vs FAILED).
  res.status(communication.status === 'FAILED' ? 502 : 200).json({ duplicate, communication });
}));

export default router;
