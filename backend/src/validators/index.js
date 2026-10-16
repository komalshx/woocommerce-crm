import { z } from 'zod';

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParams = z.object({ id: z.coerce.number().int().positive() });
export const noteIdParams = z.object({ noteId: z.coerce.number().int().positive() });

const text = (max) => z.string().trim().max(max);

export const customerBody = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    firstName: text(100),
    lastName: text(100),
    phone: text(40),
    tags: z.array(text(40).min(1)).max(20),
  })
  .partial();

export const customerCreateBody = customerBody.refine((v) => v.email || v.firstName || v.lastName, {
  message: 'Provide an email or a name',
});

export const customerListQuery = pageQuery.extend({
  q: z.string().trim().max(100).optional(),
  segment: z.enum(['new', 'repeat', 'loyal', 'inactive', 'none']).optional(),
  sort: z.enum(['name', 'createdAt', 'email']).default('createdAt'),
  dir: z.enum(['asc', 'desc']).default('desc'),
});

export const noteBody = z.object({ body: text(5000).min(1) });

export const orderListQuery = pageQuery.extend({
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(40).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  customerId: z.coerce.number().int().positive().optional(),
});

export const taskListQuery = pageQuery.extend({
  status: z.enum(['pending', 'completed', 'overdue']).optional(),
  customerId: z.coerce.number().int().positive().optional(),
});

export const taskCreateBody = z.object({
  customerId: z.number().int().positive(),
  title: text(200).min(1),
  description: text(2000).optional(),
  dueDate: z.coerce.date().optional(),
});

export const taskUpdateBody = z
  .object({
    title: text(200).min(1),
    description: text(2000),
    dueDate: z.coerce.date().nullable(),
    status: z.enum(['PENDING', 'COMPLETED']),
  })
  .partial();

export const templateBody = z.object({ name: text(100).min(1), subject: text(200).min(1), body: text(10000).min(1) });

export const emailPreviewBody = z.object({
  customerId: z.number().int().positive(),
  templateId: z.number().int().positive().optional(),
  subject: text(200).optional(),
  body: text(10000).optional(),
});

export const emailSendBody = emailPreviewBody.extend({
  approved: z.literal(true, { errorMap: () => ({ message: 'Explicit approval is required before sending' }) }),
  idempotencyKey: z.string().min(8).max(100),
  workflow: text(60).optional(),
});
