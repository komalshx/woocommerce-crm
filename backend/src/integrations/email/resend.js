import { config } from '../../config.js';

/** Sends through Resend. Returns { id } when the provider ACCEPTS the message (not proof of delivery). */
export async function sendViaResend({ to, subject, text, html, idempotencyKey }) {
  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.email.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ from: config.email.from, to: [to], subject, text, html }),
    });
  } catch {
    throw new Error('Could not reach the email provider');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Email provider rejected the message (HTTP ${res.status})`);
  if (!data.id) throw new Error('Email provider returned no message id');
  return { id: data.id };
}
