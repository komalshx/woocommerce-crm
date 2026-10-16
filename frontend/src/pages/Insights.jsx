import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { Card, Empty, ErrorBox, PageHeader, Spinner, Table } from '../components/ui.jsx';
import { fmtMoney } from '../lib/format.js';

const SEGMENTS = [
  ['new', 'New', (d) => 'Exactly 1 qualifying order'],
  ['repeat', 'Repeat', (d) => `2 to ${d.loyalMinOrders - 1} qualifying orders`],
  ['loyal', 'Loyal', (d) => `${d.loyalMinOrders}+ qualifying orders`],
  ['inactive', 'Inactive', (d) => `No qualifying order in ${d.inactiveAfterDays}+ days`],
];

export default function Insights() {
  const { data, error, loading } = useFetch('/insights/summary');
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  const { totals: t, segments, definitions: d, monthly } = data;
  const max = Math.max(1, ...monthly.map((m) => m.firstOrders + m.repeatOrders));
  const multi = t.byCurrency.length > 1;
  return (
    <>
      <PageHeader title="Retention & Insights" description={`Based on synchronized orders with status: ${d.qualifyingStatuses.join(', ')}. Order value is the sum of order totals, not revenue or profit.`} />
      {!t.orders ? <Card><Empty title="Not enough data yet" hint="Synchronize WooCommerce orders to see segments and trends." /></Card> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {SEGMENTS.map(([k, label, rule]) => (
              <Link key={k} to={`/customers?segment=${k}`}><Card className="hover:border-indigo"><p className="text-sm text-indigo">{label}</p><p className="text-3xl font-semibold">{segments[k]}</p><p className="text-xs">{rule(d)}</p></Card></Link>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[['Qualifying orders', t.orders], ['Purchasing customers', t.purchasingCustomers],
              ['Repeat-purchase rate', `${(t.repeatRate * 100).toFixed(1)}%`],
              ['Average order value', multi ? 'Mixed currencies' : fmtMoney(t.averageOrderValue, t.byCurrency[0]?.currency)]].map(([l, v]) => (
              <Card key={l}><p className="text-sm text-indigo">{l}</p><p className="text-2xl font-semibold">{v}</p></Card>
            ))}
          </div>
          {t.unmatchedOrders > 0 && <p className="mt-3 text-sm text-indigo">{t.unmatchedOrders} qualifying guest order(s) have no email and are not matched to a customer.</p>}
          <Card className="mt-4">
            <h2 className="mb-2 font-semibold">First-time vs repeat orders, last 12 months (UTC)</h2>
            <Table head={['Month', 'First orders', 'Repeat orders', 'Order value', '']}>
              {monthly.map((m) => (
                <tr key={m.month}><td>{m.month}</td><td>{m.firstOrders}</td><td>{m.repeatOrders}</td><td>{fmtMoney(m.value, multi ? '' : t.byCurrency[0]?.currency)}</td>
                  <td className="w-1/3"><div className="flex h-3 overflow-hidden rounded bg-slate-100" title="first (navy) / repeat (blue)">
                    <div className="bg-navy" style={{ width: `${(m.firstOrders / max) * 100}%` }} /><div className="bg-indigo" style={{ width: `${(m.repeatOrders / max) * 100}%` }} /></div></td></tr>
              ))}
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
