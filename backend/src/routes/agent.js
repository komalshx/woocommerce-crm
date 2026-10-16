import { Router } from 'express';
import { prisma } from '../db.js';
import { wrap, HttpError } from '../utils/http.js';
import { idParams, taskCreateBody } from '../validators/index.js';
import { attentionList, recommendFor } from '../services/agent.js';

const router = Router();

router.get('/attention', wrap(async (req, res) => res.json({ data: await attentionList() })));

router.get('/customers/:id/recommendations', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const result = await recommendFor(id);
  if (!result) throw new HttpError(404, 'Customer not found');
  res.json(result);
}));

// The only write the agent can perform: a follow-up task, and only when the user approves it in the UI.
router.post('/actions/create-task', wrap(async (req, res) => {
  const body = taskCreateBody.parse(req.body);
  const customer = await prisma.customer.findUnique({ where: { id: body.customerId }, select: { id: true } });
  if (!customer) throw new HttpError(404, 'Customer not found');
  res.status(201).json(await prisma.task.create({ data: { ...body, source: 'agent' } }));
}));

export default router;
