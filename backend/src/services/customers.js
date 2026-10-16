import { prisma } from '../db.js';
import { normalizeEmail } from '../utils/http.js';

const woo = (c) => ({
  wooId: c.id,
  email: normalizeEmail(c.email),
  firstName: c.first_name || null,
  lastName: c.last_name || null,
  phone: c.billing?.phone || null,
  billing: c.billing || null,
});

/**
 * Upsert a registered WooCommerce customer by wooId.
 * A CRM/guest record with the same normalized email and no wooId is linked (same person, same email).
 * If the email already belongs to a different customer we never merge; the email is left off instead.
 */
export async function upsertWooCustomer(payload) {
  const d = woo(payload);
  const byWoo = await prisma.customer.findUnique({ where: { wooId: d.wooId } });
  const byEmail = d.email ? await prisma.customer.findUnique({ where: { email: d.email } }) : null;
  const mergeableGuest = byEmail && !byWoo && byEmail.wooId == null;
  const emailConflict = byEmail && !mergeableGuest && byEmail.id !== byWoo?.id;
  const target = byWoo || (mergeableGuest ? byEmail : null);
  const data = { ...d, isGuest: false, source: 'woocommerce' };
  if (emailConflict) delete data.email;
  if (target) return prisma.customer.update({ where: { id: target.id }, data });
  return prisma.customer.create({ data });
}

/** Resolve the CRM customer id for an order payload; null when it cannot be matched confidently. */
export async function resolveOrderCustomer(order) {
  const billing = order.billing || {};
  if (order.customer_id > 0) {
    const known = await prisma.customer.findUnique({ where: { wooId: order.customer_id } });
    if (known) return known.id;
    const created = await upsertWooCustomer({
      id: order.customer_id,
      email: billing.email,
      first_name: billing.first_name,
      last_name: billing.last_name,
      billing,
    });
    return created.id;
  }
  const email = normalizeEmail(billing.email);
  if (!email) return null; // guest without email: never guess an identity
  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) return existing.id;
  const guest = await prisma.customer.create({
    data: {
      email,
      firstName: billing.first_name || null,
      lastName: billing.last_name || null,
      phone: billing.phone || null,
      billing,
      isGuest: true,
      source: 'woocommerce',
    },
  });
  return guest.id;
}

const digits = (s) => (s || '').replace(/\D/g, '');

/** Potential duplicates for manual review: same phone number, or same full name with different emails. */
export async function findDuplicateGroups() {
  const all = await prisma.customer.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, phone: true },
    take: 10000,
  });
  const groups = [];
  const collect = (keyFn, reason) => {
    const buckets = new Map();
    for (const c of all) {
      const key = keyFn(c);
      if (key) buckets.set(key, [...(buckets.get(key) || []), c]);
    }
    for (const members of buckets.values()) if (members.length > 1) groups.push({ reason, members });
  };
  collect((c) => (digits(c.phone).length >= 7 ? digits(c.phone) : null), 'Same phone number');
  collect(
    (c) => (c.firstName && c.lastName ? `${c.firstName} ${c.lastName}`.toLowerCase() : null),
    'Same name (different records, not merged automatically)',
  );
  return groups;
}
