import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { Badge, Button, Card, Empty, ErrorBox, Field, Modal, PageHeader, Pager, Spinner, Table } from '../components/ui.jsx';
import { customerName, fmtDate, fmtMoney } from '../lib/format.js';

function NewCustomer({ onClose, onSaved }) {
  const [f, setF] = useState({ email: '', firstName: '', lastName: '', phone: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim()));
      await api.post('/customers', body);
      onSaved();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <Modal title="New customer" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <ErrorBox message={err} />
        {['firstName', 'lastName', 'email', 'phone'].map((k) => (
          <Field key={k} label={{ firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Phone' }[k]}>
            <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </Field>
        ))}
        <Button busy={busy} type="submit">Save customer</Button>
      </form>
    </Modal>
  );
}

function Duplicates({ onClose }) {
  const { data, error, loading } = useFetch('/customers/duplicates');
  return (
    <Modal title="Potential duplicates" onClose={onClose}>
      {loading ? <Spinner /> : error ? <ErrorBox message={error} /> : !data.data.length ? <Empty title="No potential duplicates found" /> : (
        <div className="space-y-3">
          <p className="text-sm text-indigo">Nothing is merged automatically. Review each group and keep records separate unless you are sure.</p>
          {data.data.map((g, i) => (
            <Card key={i}><p className="text-xs font-semibold text-indigo">{g.reason}</p>
              {g.members.map((m) => <p key={m.id} className="text-sm"><Link className="underline" to={`/customers/${m.id}`}>{customerName(m)}</Link> · {m.email || 'no email'}</p>)}
            </Card>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default function Customers() {
  const [sp, setSp] = useSearchParams();
  const [modal, setModal] = useState(null);
  const q = sp.get('q') || '';
  const segment = sp.get('segment') || '';
  const page = Number(sp.get('page') || 1);
  const sort = sp.get('sort') || 'createdAt';
  const { data, error, loading, reload } = useFetch('/customers', { q, segment, page, sort, dir: sort === 'createdAt' ? 'desc' : 'asc' });
  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setSp(n); };
  return (
    <>
      <PageHeader title="Customers" description="WooCommerce customers plus customers you add in the CRM.">
        <Button variant="secondary" onClick={() => setModal('dups')}>Review duplicates</Button>
        <Button onClick={() => setModal('new')}>New customer</Button>
      </PageHeader>
      <Card>
        <div className="mb-3 grid gap-3 md:grid-cols-3">
          <input aria-label="Search" placeholder="Search name, email or phone" defaultValue={q} onKeyDown={(e) => e.key === 'Enter' && set('q', e.target.value)} />
          <select aria-label="Segment" value={segment} onChange={(e) => set('segment', e.target.value)}>
            <option value="">All segments</option>
            {['new', 'repeat', 'loyal', 'inactive', 'none'].map((s) => <option key={s} value={s}>{s === 'none' ? 'no purchases' : s}</option>)}
          </select>
          <select aria-label="Sort" value={sort} onChange={(e) => set('sort', e.target.value)}>
            <option value="createdAt">Newest first</option><option value="name">Name</option><option value="email">Email</option>
          </select>
        </div>
        {loading ? <Spinner /> : error ? <ErrorBox message={error} /> : !data.data.length ? (
          <Empty title="No customers found" hint="Adjust the filters, add a customer, or run a WooCommerce sync from Settings." />
        ) : (
          <Table head={['Name', 'Email', 'Segment', 'Orders', 'Total order value', 'Last order']}>
            {data.data.map((c) => (
              <tr key={c.id}>
                <td><Link className="font-medium text-indigo underline" to={`/customers/${c.id}`}>{customerName(c)}</Link></td>
                <td>{c.email || '—'}</td><td><Badge value={c.stats.segment} /></td><td>{c.stats.orderCount}</td>
                <td>{fmtMoney(c.stats.totalValue)}</td><td>{fmtDate(c.stats.lastOrderAt)}</td>
              </tr>
            ))}
          </Table>
        )}
        <Pager meta={data?.meta} onPage={(p) => set('page', p)} />
      </Card>
      {modal === 'new' && <NewCustomer onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />}
      {modal === 'dups' && <Duplicates onClose={() => setModal(null)} />}
    </>
  );
}
