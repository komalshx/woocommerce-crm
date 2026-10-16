import { prisma } from '../db.js';
import { config } from '../config.js';
import { emptyStats, getStats } from './segments.js';

const DAY_MS = 86_400_000;
const fmt = (d) => d.toISOString().slice(0, 10);
const nameOf = (c) => [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || `Customer #${c.id}`;

/**
 * CRM Action Agent: deterministic, rule-based. No AI model is called.
 * Each recommendation separates facts (from the database) from the inference drawn, and attaches an action
 * that is only executed after the user approves it in the UI.
 */
export async function recommendFor(customerId) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return null;
  const now = new Date();
  const [statsMap, orders, tasks, comms] = await Promise.all([
    getStats([customerId]),
    prisma.order.findMany({ where: { customerId }, orderBy: { dateCreated: 'desc' }, take: 5, select: { id: true, number: true, status: true, total: true, currency: true, dateCreated: true } }),
    prisma.task.findMany({ where: { customerId, status: 'PENDING' }, orderBy: { dueDate: 'asc' } }),
    prisma.communication.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);
  const stats = statsMap.get(customerId) || emptyStats;
  const recs = [];
  const name = nameOf(customer);

  if (stats.segment === 'inactive') {
    const days = Math.floor((now - stats.lastOrderAt) / DAY_MS);
    recs.push({
      key: 'reengage',
      title: 'Re-engage an inactive customer',
      facts: [
        `Last qualifying order: ${fmt(stats.lastOrderAt)} (${days} days ago)`,
        `Inactivity rule: more than ${config.segments.inactiveAfterDays} days without a qualifying order`,
        `Qualifying orders on record: ${stats.orderCount}`,
      ],
      inference: 'The customer may have lapsed. The data cannot say why.',
      actions: [
        { type: 'draft_email', label: 'Prepare re-engagement email', templateName: 'Inactive customer re-engagement' },
        { type: 'create_task', label: 'Create follow-up task', payload: { customerId, title: `Re-engage ${name}`, description: `No qualifying order since ${fmt(stats.lastOrderAt)}.`, dueDate: new Date(now.getTime() + 3 * DAY_MS).toISOString() } },
      ],
    });
  }

  const overdue = tasks.filter((t) => t.dueDate && t.dueDate < now);
  if (overdue.length) {
    recs.push({
      key: 'overdue',
      title: 'Overdue follow-up tasks',
      facts: overdue.map((t) => `Task "${t.title}" was due ${fmt(t.dueDate)}`),
      inference: null,
      actions: [],
    });
  }

  const latest = orders[0];
  if (latest && ['completed', 'processing'].includes(latest.status) && now - latest.dateCreated < 14 * DAY_MS) {
    const contactedSince = comms.some((c) => c.createdAt > latest.dateCreated && c.status !== 'FAILED');
    if (!contactedSince) {
      recs.push({
        key: 'post-purchase',
        title: 'Recent order with no follow-up',
        facts: [`Order #${latest.number} (${latest.status}) placed ${fmt(latest.dateCreated)}`, 'No email recorded since that order'],
        inference: 'A short post-purchase check-in could be appropriate.',
        actions: [{ type: 'draft_email', label: 'Prepare post-purchase email', templateName: 'Post-purchase follow-up' }],
      });
    }
  }

  if (!customer.email) {
    recs.push({ key: 'no-email', title: 'No email address on file', facts: ['This customer has no email, so email cannot be sent.'], inference: null, actions: [] });
  }

  return {
    customer: { id: customer.id, name, email: customer.email },
    segment: stats.segment,
    stats,
    recentOrders: orders,
    pendingTasks: tasks.length,
    recentCommunications: comms.map((c) => ({ id: c.id, subject: c.subject, status: c.status, createdAt: c.createdAt })),
    recommendations: recs,
    note: recs.length ? null : 'No rule matched this customer based on the data currently synchronized.',
  };
}

/** Customers worth reviewing: inactive (by rule) or with overdue tasks. */
export async function attentionList(limit = 25) {
  const [stats, overdue] = await Promise.all([
    getStats(),
    prisma.task.groupBy({ by: ['customerId'], where: { status: 'PENDING', dueDate: { lt: new Date() } }, _count: { _all: true } }),
  ]);
  const reasons = new Map();
  const add = (id, text) => reasons.set(id, [...(reasons.get(id) || []), text]);
  for (const [id, s] of stats) if (s.segment === 'inactive') add(id, `Inactive since ${fmt(s.lastOrderAt)}`);
  for (const o of overdue) add(o.customerId, `${o._count._all} overdue task(s)`);
  const ids = [...reasons.keys()].slice(0, limit);
  const customers = await prisma.customer.findMany({ where: { id: { in: ids } } });
  return customers.map((c) => ({ id: c.id, name: nameOf(c), email: c.email, reasons: reasons.get(c.id) }));
}
