import { prisma } from '../db.js';
import { config, emailConfigured, wooConfigured } from '../config.js';
import { getStats } from './segments.js';
import { getSyncState } from './sync.js';

export async function segmentCounts() {
  const [total, stats] = await Promise.all([prisma.customer.count(), getStats()]);
  const counts = { new: 0, repeat: 0, loyal: 0, inactive: 0, none: 0 };
  for (const s of stats.values()) counts[s.segment] += 1;
  counts.none = total - stats.size;
  return { total, counts, stats };
}

const monthKey = (d) => d.toISOString().slice(0, 7);

/** Order value is the sum of WooCommerce order totals for qualifying statuses; it is not accounting revenue or profit. */
export async function insightsSummary() {
  const { total, counts, stats } = await segmentCounts();
  const where = { status: { in: config.segments.qualifyingStatuses } };
  const [agg, unmatched, byCurrency] = await Promise.all([
    prisma.order.aggregate({ where, _count: { _all: true }, _sum: { total: true } }),
    prisma.order.count({ where: { ...where, customerId: null } }),
    prisma.order.groupBy({ by: ['currency'], where, _count: { _all: true }, _sum: { total: true } }),
  ]);
  const orderCount = agg._count._all;
  const totalValue = Number(agg._sum.total || 0);
  const purchasing = stats.size;
  const repeatCustomers = [...stats.values()].filter((s) => s.orderCount > 1).length;

  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 11, 1);
  since.setUTCHours(0, 0, 0, 0);
  const months = new Map();
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + i, 1));
    months.set(monthKey(d), { month: monthKey(d), firstOrders: 0, repeatOrders: 0, value: 0 });
  }
  const recent = await prisma.order.findMany({
    where: { ...where, customerId: { not: null }, dateCreated: { gte: since } },
    select: { customerId: true, dateCreated: true, total: true },
  });
  for (const o of recent) {
    const m = months.get(monthKey(o.dateCreated));
    if (!m) continue;
    const first = stats.get(o.customerId)?.firstOrderAt;
    if (first && first.getTime() === o.dateCreated.getTime()) m.firstOrders += 1;
    else m.repeatOrders += 1;
    m.value += Number(o.total);
  }
  return {
    definitions: { ...config.segments },
    totals: {
      customers: total,
      orders: orderCount,
      totalOrderValue: totalValue,
      byCurrency: byCurrency.map((c) => ({ currency: c.currency, orders: c._count._all, value: Number(c._sum.total || 0) })),
      averageOrderValue: orderCount ? totalValue / orderCount : 0,
      purchasingCustomers: purchasing,
      repeatCustomers,
      repeatRate: purchasing ? repeatCustomers / purchasing : 0,
      unmatchedOrders: unmatched,
    },
    segments: counts,
    monthly: [...months.values()],
  };
}

export async function dashboard() {
  const now = new Date();
  const [{ total, counts }, orders, pending, overdue, recentOrders, recentCommunications, sync] = await Promise.all([
    segmentCounts(),
    prisma.order.count(),
    prisma.task.count({ where: { status: 'PENDING' } }),
    prisma.task.count({ where: { status: 'PENDING', dueDate: { lt: now } } }),
    prisma.order.findMany({ orderBy: { dateCreated: 'desc' }, take: 6, include: { customer: { select: { id: true, firstName: true, lastName: true, email: true } } } }),
    prisma.communication.findMany({ orderBy: { createdAt: 'desc' }, take: 6, include: { customer: { select: { id: true, firstName: true, lastName: true, email: true } } } }),
    getSyncState(),
  ]);
  return {
    integration: { wooConfigured: wooConfigured(), emailConfigured: emailConfigured(), sync },
    totals: { customers: total, orders },
    segments: counts,
    tasks: { pending, overdue },
    recentOrders,
    recentCommunications,
  };
}
