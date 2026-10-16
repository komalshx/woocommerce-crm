import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { Badge, Card, CustomerLink, Empty, ErrorBox, PageHeader, Spinner, Table } from '../components/ui.jsx';
import { fmtDate, fmtMoney } from '../lib/format.js';

const Stat = ({ to, label, value }) => (
  <Link to={to}><Card className="hover:border-indigo"><p className="text-sm text-indigo">{label}</p><p className="text-3xl font-semibold">{value}</p></Card></Link>
);

export default function Dashboard() {
  const { data, error, loading } = useFetch('/insights/dashboard');
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  const { integration: i, totals, segments: s, tasks, recentOrders, recentCommunications } = data;
  return (
    <>
      <PageHeader title="Dashboard" description="Live overview of synchronized customers, orders and follow-ups." />
      {!i.wooConfigured && (
        <Card className="mb-4 border-amber-300 bg-amber-50 text-sm">WooCommerce is not configured, so no store data is available. Set the WOOCOMMERCE_* variables, then use <Link className="underline" to="/settings">Settings → Sync now</Link>.</Card>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat to="/customers" label="Customers" value={totals.customers} />
        <Stat to="/orders" label="Synchronized orders" value={totals.orders} />
        <Stat to="/customers?segment=new" label="New customers" value={s.new} />
        <Stat to="/customers?segment=repeat" label="Repeat customers" value={s.repeat + s.loyal} />
        <Stat to="/customers?segment=inactive" label="Inactive customers" value={s.inactive} />
        <Stat to="/communications?tab=tasks&status=pending" label="Pending tasks" value={tasks.pending} />
        <Stat to="/communications?tab=tasks&status=overdue" label="Overdue tasks" value={tasks.overdue} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">Recent orders</h2>
          {recentOrders.length ? (
            <Table head={['Order', 'Customer', 'Date', 'Status', 'Total']}>
              {recentOrders.map((o) => (
                <tr key={o.id}><td>#{o.number}</td><td><CustomerLink customer={o.customer} /></td><td>{fmtDate(o.dateCreated)}</td><td><Badge value={o.status} /></td><td>{fmtMoney(o.total, o.currency)}</td></tr>
              ))}
            </Table>
          ) : <Empty title="No orders yet" hint="Run a synchronization to import WooCommerce orders." />}
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">Recent communications</h2>
          {recentCommunications.length ? (
            <Table head={['Customer', 'Subject', 'Status', 'Date']}>
              {recentCommunications.map((c) => (
                <tr key={c.id}><td><CustomerLink customer={c.customer} /></td><td>{c.subject}</td><td><Badge value={c.status} /></td><td>{fmtDate(c.createdAt)}</td></tr>
              ))}
            </Table>
          ) : <Empty title="No communications recorded" />}
        </Card>
      </div>
    </>
  );
}
