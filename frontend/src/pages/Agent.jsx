import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../hooks/useFetch.js';
import CustomerPicker from '../components/CustomerPicker.jsx';
import { Badge, Button, Card, Empty, ErrorBox, PageHeader, Spinner } from '../components/ui.jsx';
import { fmtDate } from '../lib/format.js';

function Recommendations({ customerId }) {
  const { data, error, loading, reload } = useFetch(`/agent/customers/${customerId}/recommendations`);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(null);
  const createTask = async (payload, key) => {
    if (!window.confirm(`Create task "${payload.title}"?`)) return;
    setBusy(key); setMsg(null);
    try { await api.post('/agent/actions/create-task', payload); setMsg({ ok: 'Task created.' }); reload(); } catch (e) { setMsg({ error: e.message }); } finally { setBusy(null); }
  };
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  return (
    <div className="space-y-3">
      <Card>
        <h2 className="font-semibold"><Link className="underline" to={`/customers/${data.customer.id}`}>{data.customer.name}</Link> <Badge value={data.segment} /></h2>
        <p className="text-sm">{data.stats.orderCount} qualifying orders · last order {fmtDate(data.stats.lastOrderAt)} · {data.pendingTasks} pending task(s)</p>
      </Card>
      <ErrorBox message={msg?.error} />
      {msg?.ok && <div role="status" className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm">{msg.ok}</div>}
      {!data.recommendations.length && <Card><Empty title="No recommendation" hint={data.note} /></Card>}
      {data.recommendations.map((r) => (
        <Card key={r.key}>
          <h3 className="font-semibold">{r.title}</h3>
          <p className="mt-2 text-xs font-semibold text-indigo">Facts from your data</p>
          <ul className="list-disc pl-5 text-sm">{r.facts.map((f) => <li key={f}>{f}</li>)}</ul>
          {r.inference && <><p className="mt-2 text-xs font-semibold text-indigo">Inference (not a fact)</p><p className="text-sm">{r.inference}</p></>}
          {r.actions.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
            {r.actions.map((a) => a.type === 'draft_email'
              ? <Link key={a.label} to={`/communications?customerId=${data.customer.id}&template=${encodeURIComponent(a.templateName)}`}><Button variant="secondary">{a.label}</Button></Link>
              : <Button key={a.label} busy={busy === a.label} onClick={() => createTask(a.payload, a.label)}>{a.label}</Button>)}
          </div>}
          <p className="mt-2 text-xs text-indigo">Suggestions only. Nothing is executed until you approve it.</p>
        </Card>
      ))}
    </div>
  );
}

export default function Agent() {
  const [sp, setSp] = useSearchParams();
  const customerId = sp.get('customerId');
  const attention = useFetch('/agent/attention');
  const [picked, setPicked] = useState(null);
  useEffect(() => { if (picked) setSp({ customerId: picked.id }); }, [picked, setSp]);
  return (
    <>
      <PageHeader title="CRM Action Agent" description="Rule-based recommendations grounded in synchronized data. No AI model is used." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3">
          <Card><h2 className="mb-2 font-semibold">Find a customer</h2><CustomerPicker onSelect={setPicked} /></Card>
          <Card>
            <h2 className="mb-2 font-semibold">Needs attention</h2>
            {attention.loading ? <Spinner /> : attention.error ? <ErrorBox message={attention.error} /> : !attention.data.data.length ? <Empty title="Nobody flagged" hint="Customers appear here when they are inactive or have overdue tasks." /> : (
              <ul className="space-y-2">{attention.data.data.map((c) => (
                <li key={c.id}><button className="w-full rounded-md p-2 text-left text-sm hover:bg-page" onClick={() => setSp({ customerId: c.id })}><b>{c.name}</b><br /><span className="text-indigo">{c.reasons.join(' · ')}</span></button></li>
              ))}</ul>
            )}
          </Card>
        </div>
        <div className="lg:col-span-2">{customerId ? <Recommendations key={customerId} customerId={customerId} /> : <Card><Empty title="Select a customer" hint="Pick someone from the list to see evidence-based next steps." /></Card>}</div>
      </div>
    </>
  );
}
