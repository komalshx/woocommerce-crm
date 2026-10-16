import { prisma } from '../db.js';
import { emailConfigured } from '../config.js';
import { HttpError } from '../utils/http.js';
import { sendViaResend } from '../integrations/email/resend.js';

const ALLOWED = ['firstName', 'lastName', 'fullName', 'email'];

export const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Only whitelisted placeholders are allowed; values are plain text and escaped when converted to HTML. */
export function fill(template, customer) {
  const values = {
    firstName: customer.firstName || 'there',
    lastName: customer.lastName || '',
    fullName: [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'there',
    email: customer.email || '',
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    if (!ALLOWED.includes(key)) throw new HttpError(400, `Unknown placeholder {{${key}}}. Allowed: ${ALLOWED.join(', ')}`);
    return values[key];
  });
}

export const toHtml = (text) => `<div>${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;

async function compose({ customerId, templateId, subject, body }) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new HttpError(404, 'Customer not found');
  let tpl = { subject, body };
  if (templateId) {
    const t = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
    if (!t) throw new HttpError(404, 'Template not found');
    tpl = { subject: subject ?? t.subject, body: body ?? t.body };
  }
  if (!tpl.subject || !tpl.body) throw new HttpError(400, 'A subject and body (or a template) are required');
  return { customer, subject: fill(tpl.subject, customer), body: fill(tpl.body, customer) };
}

export async function previewEmail(input) {
  const { customer, subject, body } = await compose(input);
  return { to: customer.email, subject, body, html: toHtml(body), canSend: Boolean(customer.email) };
}

/** Send flow: record ATTEMPTED -> call provider -> record ACCEPTED/FAILED. Idempotent per idempotencyKey. */
export async function sendEmail(input) {
  const prior = await prisma.communication.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (prior) return { communication: prior, duplicate: true };

  const { customer, subject, body } = await compose(input);
  if (!customer.email) throw new HttpError(422, 'This customer has no email address');

  const communication = await prisma.communication.create({
    data: {
      customerId: customer.id,
      subject,
      body,
      status: 'ATTEMPTED',
      workflow: input.workflow || null,
      idempotencyKey: input.idempotencyKey,
    },
  });
  if (!emailConfigured()) {
    const failed = await prisma.communication.update({
      where: { id: communication.id },
      data: { status: 'FAILED', error: 'Email provider is not configured' },
    });
    return { communication: failed, duplicate: false };
  }
  try {
    const { id } = await sendViaResend({ to: customer.email, subject, text: body, html: toHtml(body), idempotencyKey: input.idempotencyKey });
    const done = await prisma.communication.update({ where: { id: communication.id }, data: { status: 'ACCEPTED', providerMessageId: id } });
    return { communication: done, duplicate: false };
  } catch (e) {
    const failed = await prisma.communication.update({ where: { id: communication.id }, data: { status: 'FAILED', error: e.message } });
    return { communication: failed, duplicate: false };
  }
}

const defaults = [
  { name: 'Customer follow-up', subject: 'Following up, {{firstName}}', body: 'Hi {{firstName}},\n\nI wanted to follow up and check that everything is going well. Let me know if there is anything we can help with.\n\nBest regards' },
  { name: 'Inactive customer re-engagement', subject: 'We would love to hear from you', body: 'Hi {{firstName}},\n\nIt has been a while since your last order and we wanted to check in. If there is anything we can do to help, just reply to this email.\n\nBest regards' },
  { name: 'Post-purchase follow-up', subject: 'How is your recent order, {{firstName}}?', body: 'Hi {{firstName}},\n\nThank you for your recent order. We would like to hear how it is going and whether you need any help.\n\nBest regards' },
  { name: 'General communication', subject: 'A message for {{fullName}}', body: 'Hi {{firstName}},\n\n\n\nBest regards' },
];

export const ensureDefaultTemplates = () => prisma.emailTemplate.createMany({ data: defaults, skipDuplicates: true });
