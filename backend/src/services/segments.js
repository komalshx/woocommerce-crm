import { prisma } from '../db.js';
import { config } from '../config.js';

const DAY_MS = 86_400_000;

/**
 * Segment rules (thresholds live in config.js). Evaluated in this order:
 *  - none:     no qualifying purchase matched to this customer
 *  - inactive: last qualifying purchase older than inactiveAfterDays
 *  - loyal:    >= loyalMinOrders qualifying purchases
 *  - repeat:   2..(loyalMinOrders-1) qualifying purchases
 *  - new:      exactly 1 qualifying purchase
 * Guest orders without an email cannot be matched to a customer and are excluded from segments.
 */
export function segmentFor({ orderCount, lastOrderAt }, now = new Date()) {
  const { inactiveAfterDays, loyalMinOrders } = config.segments;
  if (!orderCount) return 'none';
  if (now - lastOrderAt > inactiveAfterDays * DAY_MS) return 'inactive';
  if (orderCount >= loyalMinOrders) return 'loyal';
  if (orderCount > 1) return 'repeat';
  return 'new';
}

/** Returns Map<customerId, stats> for qualifying orders. Pass ids to limit, or omit for all customers. */
export async function getStats(ids) {
  const rows = await prisma.order.groupBy({
    by: ['customerId'],
    where: {
      customerId: ids ? { in: ids } : { not: null },
      status: { in: config.segments.qualifyingStatuses },
    },
    _count: { _all: true },
    _sum: { total: true },
    _min: { dateCreated: true },
    _max: { dateCreated: true },
  });
  const now = new Date();
  const map = new Map();
  for (const r of rows) {
    const stats = {
      orderCount: r._count._all,
      totalValue: Number(r._sum.total || 0),
      firstOrderAt: r._min.dateCreated,
      lastOrderAt: r._max.dateCreated,
    };
    map.set(r.customerId, { ...stats, segment: segmentFor(stats, now) });
  }
  return map;
}

export const emptyStats = { orderCount: 0, totalValue: 0, firstOrderAt: null, lastOrderAt: null, segment: 'none' };
