import { ZodError } from 'zod';

export const notFound = (req, res) => res.status(404).json({ error: 'Not found' });

// Never returns stack traces or provider payloads to the client.
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err.code === 'P2002') return res.status(409).json({ error: 'A record with this unique value already exists' });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error('Unhandled error:', err.name, err.message);
  return res.status(500).json({ error: 'Internal server error' });
}
