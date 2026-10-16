import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { Badge, Button, Card, Empty, ErrorBox, Field, PageHeader, Spinner, Table } from '../components/ui.jsx';
import { customerName, fmtDate, fmtDateTime, fmtMoney } from '../lib/format.js';

export default function CustomerDetail() {
  const { id } = useParams();
  const { data: c, error, loading, reload } = useFetch(`/customers/${id}`);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(null);
  const [task, setTask] = useState({ title: '', dueDate: '' });
  const [tags, setTags] = useState(null);

  const run = async (fn) => {
    setBusy(true); setErr(null);
    try { await fn(); await reload(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  if (loading && !c) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  const woo = c.source === 'woocommerce';
  const b = c.billing || {};

  return (
    <>
      <PageHeader title={customerName(c)} description={c.email || 'No email on file'}>
        <Link to={`/communications?customerId=${c.id}`}><Button variant="secondary">Send email</Button></Link>
        <Link to={`/agent?customerId=${c.id}`}><Button>Ask the agent</Button></Link>
      </PageHeader>
      <ErrorBox message={err} />
      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-2 font-semibold">Summary</h2>
          <p className="text-sm"><Badge value={c.stats.segment} /></p>
          <dl className="mt-2 space-y-1 text-sm">
            <div>Orders: <b>{c.stats.orderCount}</b></div>
            <div>Total order value: <b>{fmtMoney(c.stats.totalValue)}</b></div>
            <div>Last order: <b>{fmtDate(c.stats.lastOrderAt)}</b></div>
          </dl>
          <h3 className="mt-4 text-sm font-semibold text-indigo">From WooCommerce</h3>
          <dl className="space-y-1 text-sm">
            <div>WooCommerce ID: {c.wooId ?? (c.isGuest ? 'Guest (from orders)' : 'Not linked')}</div>
            <div>Phone: {c.phone || '—'}</div>
            <div>Billing: {[b.address_1, b.city, b.postcode, b.country].filter(Boolean).join(', ') || '—'}</div>
          </dl>
          <h3 className="mt-4 text-sm font-semibold text-indigo">CRM-managed</h3>
          <div className="mt-1 flex flex-wrap gap-1">{c.tags.length ? c.tags.map((t) => <Badge key={t} value="none" label={t} />) : <span className="text-sm text-slate-500">No tags</span>}</div>
          <div className="mt-2 flex gap-2">
            <input aria-label="Tags (comma separated)" placeholder="Tags, comma separated" value={tags ?? c.tags.join(', ')} onChange={(e) => setTags(e.target.value)} />
            <Button variant="secondary" busy={busy} onClick={() => run(async () => { await api.patch(`/customers/${id}`, { tags: (tags ?? '').split(',').map((t) => t.trim()).filter(Boolean) }); setTags(null); })}>Save</Button>
          </div>
          {!woo && <p className="mt-2 text-xs text-indigo">Created in the CRM; contact fields can be edited via the API.</p>}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-2 font-semibold">Notes</h2>
          <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (note.trim()) run(async () => { await api.post(`/customers/${id}/notes`, { body: note }); setNote(''); }); }}>
            <input aria-label="New note" placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button type="submit" busy={busy}>Add note</Button>
          </form>
          {!c.notes.length ? <Empty title="No notes yet" /> : c.notes.map((n) => (
            <div key={n.id} className="border-t border-slate-100 py-2 text-sm">
              {editing?.id === n.id ? (
                <div className="flex gap-2">
                  <input aria-label="Edit note" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
                  <Button onClick={() => run(async () => { await api.patch(`/customers/notes/${n.id}`, { body: editing.body }); setEditing(null); })}>Save</Button>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <p className="text-xs text-indigo">{fmtDateTime(n.createdAt)}
                    {' · '}<button className="underline" onClick={() => setEditing({ id: n.id, body: n.body })}>Edit</button>
                    {' · '}<button className="underline" onClick={() => window.confirm('Delete this note?') && run(() => api.del(`/customers/notes/${n.id}`))}>Delete</button></p>
                </>
              )}
            </div>
          ))}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-2 font-semibold">Orders</h2>
          {!c.orders.length ? <Empty title="No linked orders" /> : (
            <Table head={['Order', 'Date', 'Status', 'Items', 'Total']}>
              {c.orders.map((o) => (
                <tr key={o.id}><td>#{o.number}</td><td>{fmtDate(o.dateCreated)}</td><td><Badge value={o.status} /></td>
                  <td>{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ') || '—'}</td><td>{fmtMoney(o.total, o.currency)}</td></tr>
              ))}
            </Table>
          )}
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold">Follow-up tasks</h2>
          <form className="mb-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (task.title.trim()) run(async () => { await api.post('/tasks', { customerId: c.id, title: task.title, ...(task.dueDate ? { dueDate: task.dueDate } : {}) }); setTask({ title: '', dueDate: '' }); }); }}>
            <input aria-label="Task title" placeholder="Task title" value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} />
            <input aria-label="Due date" type="date" value={task.dueDate} onChange={(e) => setTask({ ...task, dueDate: e.target.value })} />
            <Button type="submit" busy={busy}>Add task</Button>
          </form>
          {!c.tasks.length ? <Empty title="No tasks" /> : c.tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between border-t border-slate-100 py-2 text-sm">
              <div><p className={t.status === 'COMPLETED' ? 'line-through' : ''}>{t.title}</p><p className="text-xs text-indigo">Due {fmtDate(t.dueDate)}</p></div>
              {t.status === 'PENDING' ? <Button variant="secondary" onClick={() => run(() => api.patch(`/tasks/${t.id}`, { status: 'COMPLETED' }))}>Complete</Button> : <Badge value="COMPLETED" />}
            </div>
          ))}
        </Card>

        <Card className="lg:col-span-3">
          <h2 className="mb-2 font-semibold">Communication history</h2>
          {!c.communications.length ? <Empty title="No communications recorded" /> : (
            <Table head={['Date', 'Subject', 'Status', 'Detail']}>
              {c.communications.map((m) => <tr key={m.id}><td>{fmtDateTime(m.createdAt)}</td><td>{m.subject}</td><td><Badge value={m.status} /></td><td>{m.error || (m.providerMessageId ? `Provider ID ${m.providerMessageId}` : '')}</td></tr>)}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
