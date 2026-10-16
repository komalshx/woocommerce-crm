import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';

export const Card = ({ className = '', children }) => (
  <section className={`rounded-lg border border-slate-200 bg-white p-4 ${className}`}>{children}</section>
);

const variants = {
  primary: 'bg-navy text-white hover:bg-indigo',
  secondary: 'border border-indigo text-indigo hover:bg-indigo/10',
  danger: 'border border-red-600 text-red-700 hover:bg-red-50',
};
export const Button = ({ variant = 'primary', className = '', busy, children, ...props }) => (
  <button
    {...props}
    disabled={props.disabled || busy}
    className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
  >
    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
    {children}
  </button>
);

const tone = {
  new: 'bg-sky-100 text-sky-900', repeat: 'bg-indigo/15 text-indigo', loyal: 'bg-emerald-100 text-emerald-900',
  inactive: 'bg-amber-100 text-amber-900', none: 'bg-slate-100 text-slate-700',
  completed: 'bg-emerald-100 text-emerald-900', processing: 'bg-sky-100 text-sky-900',
  cancelled: 'bg-slate-200 text-slate-700', failed: 'bg-red-100 text-red-800', FAILED: 'bg-red-100 text-red-800',
  ACCEPTED: 'bg-emerald-100 text-emerald-900', ATTEMPTED: 'bg-amber-100 text-amber-900',
  PENDING: 'bg-amber-100 text-amber-900', COMPLETED: 'bg-emerald-100 text-emerald-900',
};
export const Badge = ({ value, label }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone[value] || 'bg-slate-100 text-slate-700'}`}>
    {label || (value === 'none' ? 'no purchases' : value)}
  </span>
);

export const Spinner = () => (
  <div className="flex items-center gap-2 p-6 text-sm text-indigo"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
);
export const ErrorBox = ({ message }) => message ? (
  <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{message}</div>
) : null;
export const Empty = ({ title, hint, children }) => (
  <div className="p-8 text-center">
    <p className="font-medium">{title}</p>
    {hint && <p className="mx-auto mt-1 max-w-md text-sm text-indigo">{hint}</p>}
    {children}
  </div>
);

export const PageHeader = ({ title, description, children }) => (
  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-semibold">{title}</h1>{description && <p className="text-sm text-indigo">{description}</p>}</div>
    <div className="flex gap-2">{children}</div>
  </div>
);

export const Table = ({ head, children }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[640px] border-collapse">
      <thead className="border-b border-slate-200"><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);

export const Pager = ({ meta, onPage }) => meta && meta.totalPages > 1 ? (
  <div className="flex items-center justify-between pt-3 text-sm">
    <span>Page {meta.page} of {meta.totalPages} · {meta.total} records</span>
    <div className="flex gap-2">
      <Button variant="secondary" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Previous</Button>
      <Button variant="secondary" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>Next</Button>
    </div>
  </div>
) : null;

export const Field = ({ label, children }) => (
  <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>{children}</label>
);

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="mt-10 w-full max-w-lg rounded-lg bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button aria-label="Close" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const CustomerLink = ({ customer }) => customer ? (
  <Link className="text-indigo underline" to={`/customers/${customer.id}`}>
    {[customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || `Customer #${customer.id}`}
  </Link>
) : <span className="text-slate-500">Unmatched</span>;
