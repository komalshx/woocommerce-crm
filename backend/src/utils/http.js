export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Express 4 does not catch rejected promises, so every async handler is wrapped.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const pageArgs = ({ page, pageSize }) => ({ skip: (page - 1) * pageSize, take: pageSize });

export const pageMeta = (total, { page, pageSize }) => ({
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
});

export const normalizeEmail = (value) => {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return email.includes('@') ? email : null;
};

export const parseWooDate = (gmt, local) => {
  const raw = gmt ? `${gmt}Z` : local;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};
