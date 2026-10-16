import { prisma } from '../db.js';
import { config, wooConfigured } from '../config.js';
import { HttpError, normalizeEmail, parseWooDate } from '../utils/http.js';
import { fetchAll } from '../integrations/woocommerce/client.js';
import { resolveOrderCustomer, upsertWooCustomer } from './customers.js';

let running = false;

/**
 * Upsert one order (used by manual sync and webhooks). Idempotent: keyed by wooId, and an older
 * payload never overwrites a newer stored version (webhooks can arrive out of order).
 */
export async function upsertOrder(o) {
  if (!Number.isInteger(o?.id)) throw new Error('Order payload has no id');
  const dateModified = parseWooDate(o.date_modified_gmt, o.date_modified);
  const existing = await prisma.order.findUnique({ where: { wooId: o.id }, select: { dateModified: true } });
  if (existing && existing.dateModified > dateModified) return { skipped: true };

  const customerId = await resolveOrderCustomer(o);
  const billing = o.billing || {};
  const data = {
    number: String(o.number ?? o.id),
    status: String(o.status || 'unknown'),
    currency: o.currency || '',
    total: String(o.total ?? '0'),
    billingEmail: normalizeEmail(billing.email),
    billingName: [billing.first_name, billing.last_name].filter(Boolean).join(' ') || null,
    billing: o.billing || null,
    dateCreated: parseWooDate(o.date_created_gmt, o.date_created),
    dateModified,
    customerId,
    syncedAt: new Date(),
  };
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.upsert({ where: { wooId: o.id }, create: { wooId: o.id, ...data }, update: data });
    await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    const items = (o.line_items || []).map((i) => ({
      orderId: order.id,
      wooId: Number.isInteger(i.id) ? i.id : null,
      name: i.name || 'Item',
      sku: i.sku || null,
      quantity: Number(i.quantity) || 0,
      total: String(i.total ?? '0'),
    }));
    if (items.length) await tx.orderItem.createMany({ data: items });
  });
  return { skipped: false };
}

export const getSyncState = () => prisma.syncState.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });

/** After a crash/restart a SYNCING row would otherwise stay "synchronizing" forever. */
export async function markStaleSync() {
  await prisma.syncState.updateMany({
    where: { id: 1, status: 'SYNCING' },
    data: { status: 'FAILED', lastError: 'Interrupted by a server restart', lastFinishedAt: new Date() },
  });
}

export function startSync() {
  if (!wooConfigured()) throw new HttpError(503, 'WooCommerce is not configured. Set the WOOCOMMERCE_* variables.');
  if (running) throw new HttpError(409, 'A synchronization is already running');
  running = true;
  runFullSync().finally(() => {
    running = false;
  });
}

async function runFullSync() {
  await prisma.syncState.upsert({
    where: { id: 1 },
    create: { id: 1, status: 'SYNCING', lastStartedAt: new Date() },
    update: { status: 'SYNCING', lastStartedAt: new Date(), lastError: null, customersSynced: 0, ordersSynced: 0, failedRecords: 0 },
  });
  let customers = 0;
  let orders = 0;
  let failed = 0;
  let error = null;
  const note = (e) => {
    failed += 1;
    error ??= String(e.message).slice(0, 300);
  };
  try {
    for await (const batch of fetchAll('customers')) {
      for (const c of batch) await upsertWooCustomer(c).then(() => customers++, note);
    }
    for await (const batch of fetchAll('orders', { orderby: 'id', order: 'asc' })) {
      for (const o of batch) await upsertOrder(o).then(() => orders++, note);
    }
  } catch (e) {
    error = String(e.message).slice(0, 300);
    failed = failed || 1;
  }
  const ok = !error;
  await prisma.syncState.update({
    where: { id: 1 },
    data: {
      status: ok ? 'COMPLETED' : 'FAILED',
      lastFinishedAt: new Date(),
      ...(ok ? { lastSuccessAt: new Date() } : {}),
      lastError: error ? `${error}${failed > 1 ? ` (${failed} records failed)` : ''}` : null,
      customersSynced: customers,
      ordersSynced: orders,
      failedRecords: failed,
    },
  });
}
