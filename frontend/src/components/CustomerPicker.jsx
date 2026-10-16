import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { customerName } from '../lib/format.js';

/** Search-as-you-type customer selector. Calls onSelect(customer). */
export default function CustomerPicker({ onSelect, selected }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  useEffect(() => {
    if (q.trim().length < 2) return setResults([]);
    const t = setTimeout(() => api.get('/customers', { q, pageSize: 8 }).then((r) => setResults(r.data), () => setResults([])), 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div>
      <input aria-label="Find customer" placeholder={selected ? `Selected: ${customerName(selected)}` : 'Search customer by name or email'} value={q} onChange={(e) => setQ(e.target.value)} />
      {results.length > 0 && (
        <ul className="mt-1 rounded-md border border-slate-200 bg-white">
          {results.map((c) => (
            <li key={c.id}><button className="w-full px-3 py-2 text-left text-sm hover:bg-page" onClick={() => { onSelect(c); setQ(''); setResults([]); }}>{customerName(c)} · {c.email || 'no email'}</button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
