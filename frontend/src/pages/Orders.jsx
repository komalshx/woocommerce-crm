import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { Badge, Card, CustomerLink, Empty, ErrorBox, Modal, PageHeader, Pager, Spinner, Table } from '../components/ui.jsx';
import { fmtDate, fmtDateTime, fmtMoney } from '../lib/format.js';

function OrderDetail({ id, onClose }) {
  const { data: o, error, loading } = useFetch(`/orders/${id}`);
  return (
    <Modal title={o ? `Order #${o.number}` : 'Order'} onClose={onClose}>
      {loading ? <Spinner /> : error ? <ErrorBox message={error} /> : (
        <div className="space-y-2 text-sm">
          <p><Badge value={o.status} /> · {fmtMoney(o.total, o.currency)}</p>
          <p>Customer: <CustomerLink customer={o.customer} /></p>
          <p>Created {fmtDateTime(o.dateCreated)} · Modified {fmtDateTime(o.dateModified)}</p>
          <p>Billing: {o.billingName || '—'} · {o.billingEmail || 'no email'}</p>
          <Table head={['Item', 'SKU', 'Qty', 'Total']}>
            {o.items.map((i) => <tr key={i.id}><td>{i.name}</td><td>{i.sku || '—'}</td><td>{i.quantity}</td><td>{fmtMoney(i.total, o.currency)}</td></tr>)}
          </Table>
          <p className="text-xs text-indigo">Read-only copy of the WooCommerce order. Last synced {fmtDateTime(o.syncedAt)}.</p>
        </div>
      )}
    </Modal>
  );
}

export default function Orders() {
  const [sp, setSp] = useSearchParams();
  const [open, setOpen] = useState(null);
  const p = { q: sp.get('q') || '', status: sp.get('status') || '', from: sp.get('from') || '', to: sp.get('to') || '', page: Number(sp.get('page') || 1) };
  const { data, error, loading } = useFetch('/orders', p);
  const statuses = useFetch('/orders/statuses');
  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setSp(n); };
  return (
    <>
      <PageHeader title="Orders" description="Read-only orders synchronized from WooCommerce." />
      <Card>
        <div className="mb-3 grid gap-3 md:grid-cols-4">
          <input aria-label="Search" placeholder="Order no., name or email" defaultValue={p.q} onKeyDown={(e) => e.key === 'Enter' && set('q', e.target.value)} />
          <select aria-label="Status" value={p.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">All statuses</option>
            {(statuses.data?.data || []).map((s) => <option key={s.status} value={s.status}>{s.status} ({s.count})</option>)}
          </select>
          <input aria-label="From date" type="date" value={p.from} onChange={(e) => set('from', e.target.value)} />
          <input aria-label="To date" type="date" value={p.to} onChange={(e) => set('to', e.target.value)} />
        </div>
        {loading ? <Spinner /> : error ? <ErrorBox message={error} /> : !data.data.length ? (
          <Empty title="No orders found" hint="Run a WooCommerce sync from Settings, or change the filters." />
        ) : (
          <Table head={['Order', 'Customer', 'Date', 'Status', 'Items', 'Total']}>
            {data.data.map((o) => (
              <tr key={o.id}>
                <td><button className="text-indigo underline" onClick={() => setOpen(o.id)}>#{o.number}</button></td>
                <td><CustomerLink customer={o.customer} /></td><td>{fmtDate(o.dateCreated)}</td><td><Badge value={o.status} /></td>
                <td>{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ') || '—'}</td><td>{fmtMoney(o.total, o.currency)}</td>
              </tr>
            ))}
          </Table>
        )}
        <Pager meta={data?.meta} onPage={(n) => set('page', n)} />
      </Card>
      {open && <OrderDetail id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
