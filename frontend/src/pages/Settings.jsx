import { useEffect, useState } from 'react';
import { api, getToken } from '../lib/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { Badge, Button, Card, ErrorBox, PageHeader, Spinner, Table } from '../components/ui.jsx';
import { fmtDateTime } from '../lib/format.js';

const Row = ({ label, ok, hint }) => (
  <div className="flex justify-between border-t border-slate-100 py-2 text-sm"><span>{label}</span><span className={ok ? 'text-emerald-700' : 'text-amber-700'}>{ok ? 'Configured' : hint}</span></div>
);

export default function Settings() {
  const { data, error, loading, reload } = useFetch('/integrations/status');
  const events = useFetch('/integrations/webhook-events');
  const [msg, setMsg] = useState(null);
  const [token, setToken] = useState(getToken());
  const syncing = data?.sync.status === 'SYNCING';
  useEffect(() => { if (!syncing) return; const t = setInterval(reload, 3000); return () => clearInterval(t); }, [syncing, reload]);

  const sync = async () => {
    setMsg(null);
    try { await api.post('/integrations/sync'); reload(); } catch (e) { setMsg(e.message); }
  };
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  const s = data.sync;
  return (
    <>
      <PageHeader title="Settings & integrations" description="Connection status, synchronization and access." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">WooCommerce</h2>
          <Row label="REST API credentials" ok={data.woocommerce.configured} hint="Set WOOCOMMERCE_* in backend/.env" />
          <Row label="Webhook secret" ok={data.woocommerce.webhookSecretConfigured} hint="Set WOOCOMMERCE_WEBHOOK_SECRET" />
          <Row label="Email provider (Resend)" ok={data.email.configured} hint="Set RESEND_API_KEY and EMAIL_FROM" />
          <div className="mt-3 text-sm">
            <p>Status: <Badge value={s.status === 'COMPLETED' ? 'completed' : s.status === 'FAILED' ? 'failed' : s.status === 'SYNCING' ? 'processing' : 'none'} label={s.status.toLowerCase()} /></p>
            <p>Last successful sync: {fmtDateTime(s.lastSuccessAt)}</p>
            {s.status !== 'IDLE' && <p>Customers {s.customersSynced} · Orders {s.ordersSynced} · Failed records {s.failedRecords}</p>}
            {s.lastError && <ErrorBox message={s.lastError} />}
          </div>
          <ErrorBox message={msg} />
          <Button className="mt-3" busy={syncing} disabled={!data.woocommerce.configured} onClick={sync}>{syncing ? 'Synchronizing…' : 'Sync now'}</Button>
          <p className="mt-3 text-xs text-indigo">Webhook delivery URL: <code>{`${window.location.origin.replace(':5173', ':4000')}/api/webhooks/woocommerce`}</code> (topics: order.created, order.updated, order.deleted, customer.created, customer.updated)</p>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">Access token</h2>
          <p className="mb-2 text-sm">Only needed when the backend sets ADMIN_TOKEN.</p>
          <input aria-label="Access token" type="password" value={token} onChange={(e) => setToken(e.target.value)} />
          <Button className="mt-2" variant="secondary" onClick={() => { localStorage.setItem('crm_token', token); window.location.reload(); }}>Save token</Button>
          <h2 className="mb-2 mt-6 font-semibold">Recent webhook events</h2>
          {events.data?.data.length ? (
            <Table head={['Topic', 'Status', 'Received']}>{events.data.data.map((e) => <tr key={e.id}><td>{e.topic}</td><td><Badge value={e.status === 'FAILED' ? 'failed' : 'completed'} label={e.status.toLowerCase()} /></td><td>{fmtDateTime(e.createdAt)}</td></tr>)}</Table>
          ) : <p className="text-sm">No webhook events received yet.</p>}
        </Card>
      </div>
    </>
  );
}
