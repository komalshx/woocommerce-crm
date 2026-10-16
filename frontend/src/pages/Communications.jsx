import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch } from '../hooks/useFetch.js';
import CustomerPicker from '../components/CustomerPicker.jsx';
import { Badge, Button, Card, CustomerLink, Empty, ErrorBox, Field, PageHeader, Pager, Spinner, Table } from '../components/ui.jsx';
import { customerName, fmtDate, fmtDateTime } from '../lib/format.js';

function Compose({ initialCustomerId, initialTemplateName, onSent }) {
  const templates = useFetch('/communications/templates');
  const [customer, setCustomer] = useState(null);
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState(null);
  const [approved, setApproved] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { if (initialCustomerId) api.get(`/customers/${initialCustomerId}`).then(setCustomer, (e) => setMsg({ error: e.message })); }, [initialCustomerId]);
  const list = templates.data?.data;
  const applyTemplate = (id) => {
    setTemplateId(id); setPreview(null); setApproved(false);
    const t = list?.find((x) => String(x.id) === String(id));
    if (t) { setSubject(t.subject); setBody(t.body); }
  };
  useEffect(() => {
    if (list && initialTemplateName) { const t = list.find((x) => x.name === initialTemplateName); if (t) applyTemplate(t.id); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  const payload = () => ({ customerId: customer.id, subject, body });
  const doPreview = async () => {
    setBusy(true); setMsg(null); setApproved(false);
    try { setPreview(await api.post('/communications/preview', payload())); } catch (e) { setMsg({ error: e.message }); } finally { setBusy(false); }
  };
  const doSend = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api.post('/communications/send', { ...payload(), approved: true, idempotencyKey: key });
      setMsg({ ok: r.duplicate ? 'This message was already sent.' : 'The email provider accepted the message. Delivery is not confirmed.' });
      setPreview(null); setApproved(false); setKey(crypto.randomUUID()); onSent();
    } catch (e) {
      setMsg({ error: `${e.message}${e.data?.communication?.error ? `: ${e.data.communication.error}` : ''}` });
      if (e.data?.communication) { setKey(crypto.randomUUID()); onSent(); }
    } finally { setBusy(false); }
  };
  return (
    <Card className="max-w-2xl space-y-3">
      <ErrorBox message={msg?.error} />
      {msg?.ok && <div role="status" className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm">{msg.ok}</div>}
      <Field label="Customer"><CustomerPicker selected={customer} onSelect={(c) => { setCustomer(c); setPreview(null); }} /></Field>
      {customer && !customer.email && <ErrorBox message="This customer has no email address." />}
      <Field label="Template">
        <select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
          <option value="">Write my own</option>
          {(list || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Subject"><input value={subject} onChange={(e) => { setSubject(e.target.value); setPreview(null); }} /></Field>
      <Field label="Message (placeholders: {{firstName}}, {{lastName}}, {{fullName}}, {{email}})">
        <textarea rows={7} value={body} onChange={(e) => { setBody(e.target.value); setPreview(null); }} />
      </Field>
      <Button variant="secondary" busy={busy} disabled={!customer || !subject || !body} onClick={doPreview}>Preview</Button>
      {preview && (
        <div className="space-y-2 rounded-md border border-slate-200 p-3 text-sm">
          <p><b>To:</b> {preview.to || 'no email'}</p><p><b>Subject:</b> {preview.subject}</p>
          <p className="whitespace-pre-wrap">{preview.body}</p>
          <label className="flex items-center gap-2"><input className="!w-auto" type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} /> I reviewed this message and approve sending it</label>
          <Button busy={busy} disabled={!approved || !preview.canSend} onClick={doSend}>Send email</Button>
        </div>
      )}
    </Card>
  );
}

function History({ customerId }) {
  const [page, setPage] = useState(1);
  const { data, error, loading } = useFetch('/communications', { page, customerId });
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  return (
    <Card>
      {!data.data.length ? <Empty title="No communications recorded" /> : (
        <Table head={['Date', 'Customer', 'Subject', 'Status', 'Detail']}>
          {data.data.map((m) => <tr key={m.id}><td>{fmtDateTime(m.createdAt)}</td><td><CustomerLink customer={m.customer} /></td><td>{m.subject}</td><td><Badge value={m.status} /></td><td>{m.error || (m.providerMessageId ? `Provider ID ${m.providerMessageId}` : '')}</td></tr>)}
        </Table>
      )}
      <Pager meta={data.meta} onPage={setPage} />
    </Card>
  );
}

function Tasks({ initialStatus }) {
  const [status, setStatus] = useState(initialStatus || 'pending');
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useFetch('/tasks', { status, page });
  const [err, setErr] = useState(null);
  const complete = (id) => api.patch(`/tasks/${id}`, { status: 'COMPLETED' }).then(reload, (e) => setErr(e.message));
  return (
    <Card>
      <div className="mb-3 max-w-xs"><select aria-label="Task status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="pending">Pending</option><option value="overdue">Overdue</option><option value="completed">Completed</option><option value="">All</option></select></div>
      <ErrorBox message={err || error} />
      {loading ? <Spinner /> : !data?.data.length ? <Empty title="No tasks here" hint="Create tasks from a customer profile or the CRM Action Agent." /> : (
        <Table head={['Task', 'Customer', 'Due', 'Status', '']}>
          {data.data.map((t) => (
            <tr key={t.id}><td>{t.title}</td><td><CustomerLink customer={t.customer} /></td><td>{fmtDate(t.dueDate)}</td><td><Badge value={t.status} /></td>
              <td>{t.status === 'PENDING' && <Button variant="secondary" onClick={() => complete(t.id)}>Complete</Button>}</td></tr>
          ))}
        </Table>
      )}
      <Pager meta={data?.meta} onPage={setPage} />
    </Card>
  );
}

export default function Communications() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'compose';
  const [refresh, setRefresh] = useState(0);
  const tabs = [['compose', 'Compose'], ['history', 'History'], ['tasks', 'Tasks']];
  return (
    <>
      <PageHeader title="Communications" description="Send approved emails, review history and manage follow-up tasks." />
      <div className="mb-4 flex gap-2" role="tablist">
        {tabs.map(([k, l]) => <Button key={k} role="tab" aria-selected={tab === k} variant={tab === k ? 'primary' : 'secondary'} onClick={() => setSp({ tab: k })}>{l}</Button>)}
      </div>
      {tab === 'compose' && <Compose initialCustomerId={sp.get('customerId')} initialTemplateName={sp.get('template')} onSent={() => setRefresh((n) => n + 1)} />}
      {tab === 'history' && <History key={refresh} customerId={sp.get('customerId')} />}
      {tab === 'tasks' && <Tasks initialStatus={sp.get('status')} />}
    </>
  );
}
