export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : '—');
export const fmtMoney = (n, currency) => {
  const v = Number(n || 0);
  try {
    return currency ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(v) : v.toFixed(2);
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
};
export const customerName = (c) => (c ? [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || `Customer #${c.id}` : '—');
