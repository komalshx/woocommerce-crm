import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Bot, LayoutDashboard, Mail, Menu, Search, Settings, ShoppingBag, Users } from 'lucide-react';
import { api } from '../lib/api.js';
import { fmtDateTime } from '../lib/format.js';

const nav = [
  ['/', 'Dashboard', LayoutDashboard], ['/customers', 'Customers', Users], ['/orders', 'Orders', ShoppingBag],
  ['/communications', 'Communications', Mail], ['/insights', 'Retention & Insights', BarChart3],
  ['/agent', 'CRM Action Agent', Bot], ['/settings', 'Settings', Settings],
];

function SyncStatus() {
  const [s, setS] = useState(null);
  useEffect(() => {
    const load = () => api.get('/integrations/status').then(setS, () => setS({ error: true }));
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);
  if (!s) return null;
  let label = 'API unreachable', dot = 'bg-red-600';
  if (!s.error) {
    if (!s.woocommerce.configured) [label, dot] = ['WooCommerce not configured', 'bg-slate-400'];
    else if (s.sync.status === 'SYNCING') [label, dot] = ['Synchronizing…', 'bg-amber-500'];
    else if (s.sync.status === 'FAILED') [label, dot] = ['Last sync failed', 'bg-red-600'];
    else if (s.sync.lastSuccessAt) [label, dot] = [`Synced ${fmtDateTime(s.sync.lastSuccessAt)}`, 'bg-emerald-600'];
    else [label, dot] = ['Connected · not synced yet', 'bg-amber-500'];
  }
  return <span className="flex items-center gap-2 text-xs"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</span>;
}

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const search = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/customers?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <div className="min-h-screen lg:flex">
      <aside className={`${open ? 'block' : 'hidden'} w-full shrink-0 bg-navy p-4 text-white lg:block lg:w-60`}>
        <div className="mb-6 text-xl font-semibold"><span className="text-white/60"> CRM</span></div>
        <nav className="space-y-1">
          {nav.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-sm ${isActive ? 'bg-indigo' : 'hover:bg-white/10'}`}>
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <button className="lg:hidden" aria-label="Menu" onClick={() => setOpen(!open)}><Menu className="h-5 w-5" /></button>
          <form onSubmit={search} className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-indigo" />
            <input aria-label="Search customers" className="pl-9" placeholder="Search customers" value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
          <div className="ml-auto"><SyncStatus /></div>
        </header>
        <main className="p-4 lg:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
