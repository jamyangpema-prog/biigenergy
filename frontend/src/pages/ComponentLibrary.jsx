import React, { useEffect, useMemo, useState } from 'react';
import { api, fmtAUD, fmtNum } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LibraryComponentPanel, ComponentForm } from '@/components/LibraryComponentPanel';
import { imageUrl } from '@/components/ComponentImage';
import { toast } from 'sonner';
import { Search, ArrowUpDown, Boxes, ImageOff, Plus } from 'lucide-react';

const COLS = [['category', 'Category', false], ['description', 'Component', false], ['brand', 'Brand', false], ['part_no', 'Part No', false],
  ['supplier', 'Supplier', false], ['uom', 'Unit', false], ['rate', 'Rate / Unit', true], ['install_hrs', 'Install hrs', true],
  ['wiring_hrs', 'Wiring hrs', true], ['lines', 'Used on', true]];

export default function ComponentLibrary() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'estimator';
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState({ key: 'category', dir: 'asc' });
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/library').then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

  const cats = useMemo(() => {
    const n = {};
    (rows || []).forEach((r) => { n[r.category] = (n[r.category] || 0) + 1; });
    return [['All', (rows || []).length], ...Object.entries(n).sort((a, b) => (a[0] === 'Other') - (b[0] === 'Other') || a[0].localeCompare(b[0]))];
  }, [rows]);

  const view = useMemo(() => {
    const s = q.toLowerCase();
    const arr = (rows || []).filter((r) => (cat === 'All' || r.category === cat)
      && (!s || [r.description, r.brand, r.part_no, r.supplier, r.category].some((v) => (v || '').toLowerCase().includes(s))));
    return [...arr].sort((a, b) => {
      const v1 = a[sort.key], v2 = b[sort.key];
      const c = typeof v1 === 'number' ? v1 - v2 : String(v1 || '').localeCompare(String(v2 || ''));
      return (sort.dir === 'asc' ? c : -c) || a.description.localeCompare(b.description);
    });
  }, [rows, q, cat, sort]);

  const toggle = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  const create = async (body) => {
    setSaving(true);
    try { await api.post('/components', body); toast.success('Component added to library'); setCreating(false); load(); }
    catch { toast.error('Could not add component'); } finally { setSaving(false); }
  };
  const missing = (rows || []).filter((r) => !r.rate).length;

  return (
    <div className="space-y-5" data-testid="library-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Component Library</h1>
          <p className="text-sm text-slate-500">Master list of components, priced per unit. Editing here updates every project line linked to the component; editing a line in a project's Costing doesn't change the library.</p>
        </div>
        {canEdit && <Button onClick={() => setCreating(true)} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="lib-new-btn"><Plus className="h-4 w-4 mr-1" />New component</Button>}
      </div>

      <div className="flex flex-wrap gap-2" data-testid="lib-categories">
        {cats.map(([name, n]) => (
          <button key={name} onClick={() => setCat(name)} data-testid={`lib-cat-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${cat === name ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-slate-500'}`}>
            {name} <span className={cat === name ? 'text-white/70' : 'text-slate-400'}>({n})</span>
          </button>
        ))}
      </div>

      <Card className="border-slate-200 overflow-hidden">
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="relative w-80">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search component, brand, part, supplier…" className="pl-8" data-testid="library-search" />
          </div>
          <div className="text-xs text-slate-500">{view.length} components{missing > 0 && <span className="text-amber-700"> · {missing} need a rate</span>}</div>
        </div>
        <div className="table-scroll">
          <table className="w-full text-sm" data-testid="library-table">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {COLS.map(([k, l, num]) => (
                  <th key={k} className={`px-3 py-3 ${num ? 'text-right' : 'text-left'}`}>
                    <button onClick={() => toggle(k)} className="inline-flex items-center gap-1 hover:text-slate-900" data-testid={`lib-sort-${k}`}>{l}<ArrowUpDown className="h-3 w-3" /></button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!rows && <tr><td colSpan={10} className="p-12 text-center text-slate-500">Loading components…</td></tr>}
              {rows && view.length === 0 && <tr><td colSpan={10} className="p-12 text-center text-slate-500"><Boxes className="h-8 w-8 mx-auto mb-2 text-slate-300" />No components match.</td></tr>}
              {view.map((r) => (
                <tr key={r.id} onClick={() => setOpenId(r.id)} className="border-t border-slate-200 even:bg-slate-50/50 hover:bg-slate-100 cursor-pointer" data-testid={`lib-row-${r.id}`}>
                  <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">{r.category}</span></td>
                  <td className="px-3 py-2 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                        {r.image_path ? <img src={imageUrl(r.image_path)} alt="" className="h-full w-full object-cover" /> : <ImageOff className="h-3.5 w-3.5 text-slate-300" />}
                      </div>
                      {r.description}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{r.brand || '—'}</td>
                  <td className="px-3 py-2 fin text-slate-700">{r.part_no || '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{r.supplier || '—'}</td>
                  <td className="px-3 py-2 text-slate-700" data-testid={`lib-unit-${r.id}`}>{r.uom || 'ea'}</td>
                  <td className="px-3 py-2 fin text-right font-semibold text-slate-900">{r.rate ? fmtAUD(r.rate) : <span className="text-amber-700 font-normal">Rate needed</span>}</td>
                  <td className="px-3 py-2 fin text-right">{fmtNum(r.install_hrs, 2)}</td>
                  <td className="px-3 py-2 fin text-right">{fmtNum(r.wiring_hrs, 2)}</td>
                  <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap">{r.lines ? `${r.lines} line${r.lines === 1 ? '' : 's'} · ${r.projects.length} project${r.projects.length === 1 ? '' : 's'}` : 'Not used'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <LibraryComponentPanel componentId={openId} onClose={() => setOpenId(null)} onChanged={load} />
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="lib-new-dialog">
          <DialogHeader><DialogTitle>New library component</DialogTitle></DialogHeader>
          {creating && <ComponentForm initial={{ uom: 'ea' }} saving={saving} onCancel={() => setCreating(false)} onSave={create} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
