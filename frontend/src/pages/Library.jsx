import React, { useEffect, useMemo, useState } from 'react';
import { api, fmtAUD, fmtNum } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ComponentDetails } from '@/components/ComponentDetails';
import { Search, ArrowUpDown, Boxes } from 'lucide-react';

const COLS = [
  ['description', 'Component', false],
  ['brand', 'Brand', false],
  ['part_no', 'Part No', false],
  ['supplier', 'Supplier', false],
  ['min_rate', 'Rate (1 unit)', true],
  ['quantity', 'Total Qty', true],
  ['total_component_cost', 'Component Spend', true],
  ['labour_cost', 'Install Cost', true],
  ['selling_price', 'Total Selling Price', true],
];

export default function Library() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: 'selling_price', dir: 'desc' });
  const [detailId, setDetailId] = useState(null);

  const loadRows = () => api.get('/library').then((r) => setRows(r.data));
  useEffect(() => { loadRows(); }, []);

  const view = useMemo(() => {
    const s = q.toLowerCase();
    const arr = (rows || []).filter((r) => !s || [r.description, r.brand, r.part_no, r.supplier, ...r.projects.map((p) => p.name)]
      .some((v) => (v || '').toLowerCase().includes(s)));
    return [...arr].sort((a, b) => {
      const v1 = a[sort.key], v2 = b[sort.key];
      const cmp = typeof v1 === 'number' ? v1 - v2 : String(v1 || '').localeCompare(String(v2 || ''));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, q, sort]);

  const tot = view.reduce((a, r) => ({ qty: a.qty + r.quantity, cc: a.cc + r.total_component_cost, lc: a.lc + r.labour_cost, sp: a.sp + r.selling_price }), { qty: 0, cc: 0, lc: 0, sp: 0 });
  const toggle = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });

  return (
    <div className="space-y-5" data-testid="library-page">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Component Library</h1>
        <p className="text-sm text-slate-500">Every unique part across all projects (grouped by part number, or description when there's no part number). Click a part for full details.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['Unique parts', view.length, false, 'lib-unique'], ['Total quantity', fmtNum(tot.qty, 0), false, 'lib-qty'],
          ['Component spend', fmtAUD(tot.cc), false, 'lib-cc'], ['Total selling price', fmtAUD(tot.sp), true, 'lib-sp']].map(([l, v, accent, tid]) => (
          <Card key={l} className={`p-3 border-slate-200 ${accent ? 'border-l-4 border-l-red-600' : ''}`}>
            <div className="text-xs uppercase tracking-wider text-slate-500">{l}</div>
            <div className="fin text-xl font-semibold" data-testid={tid}>{v}</div>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 overflow-hidden">
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="relative w-80">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search part, brand, supplier, project…" className="pl-8" data-testid="library-search" />
          </div>
          <div className="text-xs text-slate-500">{view.length} parts</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="library-table">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {COLS.map(([k, l, num]) => (
                  <th key={k} className={`px-3 py-3 ${num ? 'text-right' : 'text-left'}`}>
                    <button onClick={() => toggle(k)} className="inline-flex items-center gap-1 hover:text-slate-900" data-testid={`lib-sort-${k}`}>{l}<ArrowUpDown className="h-3 w-3" /></button>
                  </th>
                ))}
                <th className="px-3 py-3 text-left">Used in</th>
              </tr>
            </thead>
            <tbody>
              {!rows && <tr><td colSpan={10} className="p-12 text-center text-slate-500">Loading parts…</td></tr>}
              {rows && view.length === 0 && (
                <tr><td colSpan={10} className="p-12 text-center text-slate-500"><Boxes className="h-8 w-8 mx-auto mb-2 text-slate-300" />No parts match your search.</td></tr>
              )}
              {view.map((r) => (
                <tr key={r.key} onClick={() => setDetailId(r.item_id)} className="border-t border-slate-200 even:bg-slate-50/50 hover:bg-slate-100 cursor-pointer" data-testid={`lib-row-${r.key}`}>
                  <td className="px-3 py-2 font-medium text-slate-900">{r.description}</td>
                  <td className="px-3 py-2 text-slate-700">{r.brand || '—'}</td>
                  <td className="px-3 py-2 fin text-slate-700">{r.part_no || '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{r.supplier || '—'}</td>
                  <td className="px-3 py-2 fin text-right">{r.min_rate === r.max_rate ? fmtAUD(r.min_rate) : `${fmtAUD(r.min_rate)} – ${fmtAUD(r.max_rate)}`}</td>
                  <td className="px-3 py-2 fin text-right">{fmtNum(r.quantity, 0)}</td>
                  <td className="px-3 py-2 fin text-right">{fmtAUD(r.total_component_cost)}</td>
                  <td className="px-3 py-2 fin text-right">{fmtAUD(r.labour_cost)}</td>
                  <td className="px-3 py-2 fin text-right font-semibold text-slate-900">{fmtAUD(r.selling_price)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {r.projects.map((p) => <span key={p.id} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">{p.name}</span>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {view.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold">
                  <td className="px-3 py-3" colSpan={5}>Total</td>
                  <td className="px-3 py-3 fin text-right">{fmtNum(tot.qty, 0)}</td>
                  <td className="px-3 py-3 fin text-right">{fmtAUD(tot.cc)}</td>
                  <td className="px-3 py-3 fin text-right">{fmtAUD(tot.lc)}</td>
                  <td className="px-3 py-3 fin text-right">{fmtAUD(tot.sp)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <ComponentDetails itemId={detailId} onClose={() => setDetailId(null)} onSaved={loadRows} />
    </div>
  );
}
