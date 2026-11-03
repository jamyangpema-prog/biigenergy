import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, fmtAUD, fmtNum } from '@/lib/api';
import { useProjects } from '@/lib/projects';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Copy, Trash2, ChevronDown, ChevronRight, Search, Upload, ArrowUpDown, Hash, Eye, ArrowLeft, Check, Undo2 } from 'lucide-react';
import { DownloadMenu } from '@/components/DownloadMenu';
import { confirmLeave, setUnsaved } from '@/lib/unsaved';
import { LineDetails } from '@/components/LineDetails';
import { AddFromLibrary } from '@/components/AddFromLibrary';
import { ProjectPicker } from '@/components/ProjectPicker';

const NUM_KEYS = ['quantity', 'rate', 'install_hrs', 'wiring_hrs'];
const OVR_KEYS = ['freight_pct_override', 'margin_pct_override', 'labour_rate_override'];
const parseDraft = (d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k,
  OVR_KEYS.includes(k) ? (v === '' ? null : parseFloat(v)) : NUM_KEYS.includes(k) ? (parseFloat(v) || 0) : v]));

const BLANK = { description: '', brand: '', part_no: '', supplier: '', quantity: 1, rate: 0, install_hrs: 0, wiring_hrs: 0 };

export default function EquipmentCosting() {
  const { pid } = useParams();
  const nav = useNavigate();
  const { projects, currentId, selectProject, loading } = useProjects();
  const current = projects.find((p) => p.id === pid) || null;
  useEffect(() => { if (current && pid !== currentId) selectProject(pid); }, [pid, current, currentId]); // eslint-disable-line
  const auth = useAuth();
  const { can } = auth;
  const canEdit = auth.user?.role !== 'viewer';
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [showLib, setShowLib] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: 'item_no', dir: 'asc' });
  const [showNew, setShowNew] = useState(false);
  const [newItem, setNewItem] = useState(BLANK);
  const fileRef = useRef(null);
  const [drafts, setDrafts] = useState({});
  const dirtyCount = Object.keys(drafts).length;
  useEffect(() => { setUnsaved(dirtyCount > 0); }, [dirtyCount]);
  useEffect(() => () => setUnsaved(false), []);
  useEffect(() => { setDrafts({}); }, [pid]);

  const val = (it, k) => drafts[it.id]?.[k] ?? (it[k] ?? '');
  const edit = (it, k, v) => setDrafts((d) => {
    const row = { ...(d[it.id] || {}) };
    if (String(it[k] ?? '') === String(v)) delete row[k]; else row[k] = v;
    const n = { ...d };
    if (Object.keys(row).length) n[it.id] = row; else delete n[it.id];
    return n;
  });
  const discard = (id) => setDrafts((d) => { const n = { ...d }; delete n[id]; return n; });

  const loadItems = async () => {
    if (!current) return;
    const { data } = await api.get(`/projects/${current.id}/items`);
    setItems(data);
    setLoaded(true);
  };
  useEffect(() => { loadItems(); }, [current?.id]); // eslint-disable-line

  const filtered = useMemo(() => {
    let arr = items.filter((i) => {
      if (!q) return true;
      const s = q.toLowerCase();
      return [i.description, i.brand, i.part_no, i.supplier].some((v) => (v || '').toLowerCase().includes(s));
    });
    arr = [...arr].sort((a, b) => {
      const v1 = a[sort.key], v2 = b[sort.key];
      if (typeof v1 === 'number') return sort.dir === 'asc' ? v1 - v2 : v2 - v1;
      return sort.dir === 'asc' ? String(v1 || '').localeCompare(String(v2 || '')) : String(v2 || '').localeCompare(String(v1 || ''));
    });
    return arr;
  }, [items, q, sort]);

  const toggle = (id) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSort = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });

  const updateItem = async (id, patch) => {
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const merged = { ...items[idx], ...patch };
    setItems((arr) => arr.map((i) => i.id === id ? merged : i)); // optimistic
    try {
      const { data } = await api.put(`/items/${id}`, merged);
      setItems((arr) => arr.map((i) => i.id === id ? data : i));
      return true;
    } catch (e) {
      toast.error('Update failed'); loadItems(); return false;
    }
  };
  const saveRow = async (id) => {
    if (!drafts[id]) return;
    if (await updateItem(id, parseDraft(drafts[id]))) { discard(id); toast.success('Line saved'); }
  };
  const addItem = async () => {
    try {
      await api.post(`/projects/${current.id}/items`, { ...newItem, project_id: current.id });
      toast.success('Item added');
      setShowNew(false); setNewItem(BLANK); loadItems();
    } catch { toast.error('Add failed'); }
  };
  const dup = async (id) => { try { await api.post(`/items/${id}/duplicate`); loadItems(); toast.success('Duplicated'); } catch { toast.error('Failed'); } };
  const del = async (id) => { if (!window.confirm('Delete item?')) return; await api.delete(`/items/${id}`); discard(id); loadItems(); toast.success('Deleted'); };
  const renumber = async () => { await api.post(`/projects/${current.id}/renumber`); loadItems(); toast.success('Renumbered'); };

  const importXL = async (file) => {
    const fd = new FormData(); fd.append('file', file);
    try {
      const { data } = await api.post(`/projects/${current.id}/import/excel`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Imported ${data.imported} items`); loadItems();
    } catch { toast.error('Import failed'); }
  };

  if (!current) return <div className="text-slate-500" data-testid="costing-not-found">{loading ? 'Loading…' : <>Project not found. <Link to="/app/costing" className="text-blue-600 hover:underline">Back to projects</Link></>}</div>;

  const totals = items.reduce((a, i) => ({
    qty: a.qty + i.quantity, tcc: a.tcc + i.total_component_cost,
    lc: a.lc + i.labour_cost, sp: a.sp + i.selling_price, hrs: a.hrs + i.total_install_hrs,
  }), { qty: 0, tcc: 0, lc: 0, sp: 0, hrs: 0 });

  const SortH = ({ k, children, cls = '' }) => (
    <button className={`inline-flex items-center gap-1 hover:text-slate-900 ${cls}`} onClick={() => toggleSort(k)} data-testid={`sort-${k}`}>
      {children} <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="space-y-4" data-testid="equipment-costing">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/app/costing" onClick={(e) => { if (!confirmLeave()) e.preventDefault(); }} className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 mb-2" data-testid="costing-back"><ArrowLeft className="h-3.5 w-3.5" /> All projects</Link>
          <ProjectPicker onChange={(id) => nav(`/app/costing/${id}`)} />
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-3">Costing</h1>
          <p className="text-sm text-slate-500">{current.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && importXL(e.target.files[0])} />
          {canEdit && <Button onClick={() => setShowNew(true)} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="btn-add-item"><Plus className="h-4 w-4 mr-1" /> Add item</Button>}
          {canEdit && <Button variant="outline" onClick={() => setShowLib(true)} data-testid="btn-add-from-library"><Search className="h-4 w-4 mr-1" /> Add from library</Button>}
          {canEdit && <Button variant="outline" onClick={() => fileRef.current?.click()} data-testid="btn-import"><Upload className="h-4 w-4 mr-1" /> Import</Button>}
          <DownloadMenu url={`/projects/${current.id}/export/costing`} filename={`${current.name}_costing`} testid="costing-download" />
          {canEdit && <Button variant="outline" onClick={renumber} data-testid="btn-renumber"><Hash className="h-4 w-4 mr-1" /> Renumber</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3 border-slate-200"><div className="text-xs uppercase tracking-wider text-slate-500">Items</div><div className="fin text-xl font-semibold">{items.length}</div></Card>
        <Card className="p-3 border-slate-200"><div className="text-xs uppercase tracking-wider text-slate-500">Qty</div><div className="fin text-xl font-semibold">{fmtNum(totals.qty, 0)}</div></Card>
        <Card className="p-3 border-slate-200"><div className="text-xs uppercase tracking-wider text-slate-500">Install Hrs</div><div className="fin text-xl font-semibold">{fmtNum(totals.hrs, 1)}</div></Card>
        <Card className="p-3 border-slate-200"><div className="text-xs uppercase tracking-wider text-slate-500">Total CC</div><div className="fin text-xl font-semibold">{fmtAUD(totals.tcc)}</div></Card>
        <Card className="p-3 border-slate-200 border-l-4 border-l-red-600"><div className="text-xs uppercase tracking-wider text-slate-500">Selling Price</div><div className="fin text-xl font-semibold">{fmtAUD(totals.sp)}</div></Card>
      </div>

      <Card className="border-slate-200 overflow-hidden">
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search description, brand, supplier…"
                   className="pl-8" data-testid="search-input" />
          </div>
          <div className="flex items-center gap-3">
            {dirtyCount > 0 && <span className="text-xs font-medium text-amber-700" data-testid="unsaved-count">{dirtyCount} line{dirtyCount === 1 ? '' : 's'} with unsaved changes</span>}
            <div className="text-xs text-slate-500">{filtered.length} of {items.length} shown</div>
          </div>
        </div>
        <div className="table-scroll">
          <table className="w-full text-sm" data-testid="items-table">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="w-8 px-2 py-3"></th>
                <th className="px-3 py-3 w-16 text-left"><SortH k="item_no">#</SortH></th>
                <th className="px-3 py-3 text-left"><SortH k="description">Description</SortH></th>
                <th className="px-3 py-3 text-left"><SortH k="brand">Brand</SortH></th>
                <th className="px-3 py-3 text-left">Part No</th>
                <th className="px-3 py-3 text-left"><SortH k="supplier">Supplier</SortH></th>
                <th className="px-3 py-3 text-right w-20">Qty</th>
                <th className="px-3 py-3 text-right w-28"><SortH k="rate" cls="justify-end">Rate</SortH></th>
                <th className="px-3 py-3 text-right w-32"><SortH k="selling_price" cls="justify-end">Selling Price</SortH></th>
                <th className="w-24 px-2 py-3 whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody>
              {!loaded && (
                <tr><td colSpan={10} className="p-12 text-center text-slate-500" data-testid="items-loading">Loading items…</td></tr>
              )}
              {loaded && filtered.length === 0 && (
                <tr><td colSpan={10} className="p-12 text-center text-slate-500">
                  No items. {canEdit && <><button onClick={() => setShowNew(true)} className="text-blue-600 hover:underline">Add one</button> or <button onClick={() => setShowLib(true)} className="text-blue-600 hover:underline" data-testid="empty-add-from-library">pick from the library</button></>}
                </td></tr>
              )}
              {filtered.map((it) => { const dirty = !!drafts[it.id]; const cell = (k, type, align) => (
                <CellInput disabled={!canEdit} type={type} align={align} value={val(it, k)} onChange={(v) => edit(it, k, v)} onEnter={() => saveRow(it.id)} testid={`cell-${k}-${it.item_no}`} />
              ); return (
                <React.Fragment key={it.id}>
                  <tr className={`border-t border-slate-200 ${dirty ? 'bg-amber-50' : 'hover:bg-slate-50'}`} data-testid={`row-${it.item_no}`}>
                    <td className="px-2 py-2 text-slate-400">
                      <button onClick={() => toggle(it.id)} data-testid={`expand-${it.item_no}`}>
                        {expanded.has(it.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-3 py-2 fin text-slate-500">{it.item_no}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => setDetailId(it.id)} className="text-left text-sm text-slate-900 hover:text-red-700 hover:underline" title="Open details" data-testid={`desc-${it.item_no}`}>{it.description || 'Untitled component'}</button>
                    </td>
                    <td className="px-3 py-2">{cell('brand')}</td>
                    <td className="px-3 py-2">{cell('part_no')}</td>
                    <td className="px-3 py-2">{cell('supplier')}</td>
                    <td className="px-3 py-2">{cell('quantity', 'number', 'right')}</td>
                    <td className="px-3 py-2">{cell('rate', 'number', 'right')}</td>
                    <td className="px-3 py-2 fin text-right font-semibold text-slate-900">{fmtAUD(it.selling_price)}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        {dirty && (
                          <>
                            <button onClick={() => saveRow(it.id)} className="px-2 py-1 rounded bg-slate-900 text-white text-xs inline-flex items-center gap-1 hover:bg-slate-800" title="Save changes" data-testid={`save-row-${it.item_no}`}><Check className="h-3.5 w-3.5" />Save</button>
                            <button onClick={() => discard(it.id)} className="px-2 py-1 rounded border border-slate-300 bg-white text-xs inline-flex items-center gap-1 hover:bg-slate-50" title="Discard changes" data-testid={`discard-row-${it.item_no}`}><Undo2 className="h-3.5 w-3.5" />Discard</button>
                          </>
                        )}
                        <button onClick={() => setDetailId(it.id)} className="text-slate-400 hover:text-slate-900 p-1" title="View details" data-testid={`view-${it.item_no}`}><Eye className="h-4 w-4" /></button>
                        {canEdit && (
                          <>
                            <button onClick={() => dup(it.id)} className="text-slate-400 hover:text-slate-900 p-1" title="Duplicate" data-testid={`dup-${it.item_no}`}><Copy className="h-4 w-4" /></button>
                            <button onClick={() => del(it.id)} className="text-slate-400 hover:text-red-600 p-1" title="Delete" data-testid={`del-${it.item_no}`}><Trash2 className="h-4 w-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded.has(it.id) && (
                    <tr className="bg-slate-50/70 border-t border-slate-200">
                      <td colSpan={10} className="px-6 py-5">
                        <CostingDetail item={it} canEdit={canEdit} cell={cell} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ); })}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300">
                  <td /><td /><td className="px-3 py-3 text-xs uppercase tracking-wider text-slate-600 font-semibold">Totals</td>
                  <td /><td /><td />
                  <td className="px-3 py-3 fin text-right">{fmtNum(totals.qty, 0)}</td>
                  <td />
                  <td className="px-3 py-3 fin text-right font-bold text-slate-900">{fmtAUD(totals.sp)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <LineDetails itemId={detailId} onClose={() => setDetailId(null)} onSaved={loadItems} />
      <AddFromLibrary open={showLib} onOpenChange={setShowLib} projectId={current.id} onAdded={loadItems} />

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add equipment item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[['description', 'Description'], ['brand', 'Brand'], ['part_no', 'Part number'], ['supplier', 'Supplier']].map(([k, l]) => (
              <div key={k}>
                <Label>{l}</Label>
                <Input value={newItem[k]} onChange={(e) => setNewItem({ ...newItem, [k]: e.target.value })} data-testid={`new-${k}`} />
              </div>
            ))}
            <div className="grid grid-cols-4 gap-3">
              <div><Label>Qty</Label><Input type="number" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })} data-testid="new-qty" /></div>
              <div><Label>Rate</Label><Input type="number" value={newItem.rate} onChange={(e) => setNewItem({ ...newItem, rate: parseFloat(e.target.value) || 0 })} data-testid="new-rate" /></div>
              <div><Label>Install hr</Label><Input type="number" value={newItem.install_hrs} onChange={(e) => setNewItem({ ...newItem, install_hrs: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Wiring hr</Label><Input type="number" value={newItem.wiring_hrs} onChange={(e) => setNewItem({ ...newItem, wiring_hrs: parseFloat(e.target.value) || 0 })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={addItem} className="bg-slate-900 text-white" data-testid="btn-save-item">Add item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CellInput({ value, onChange, onEnter, testid, type = 'text', align = 'left', disabled = false }) {
  if (disabled) return <div className={`fin text-sm text-slate-700 ${align === 'right' ? 'text-right' : ''}`}>{type === 'number' ? fmtNum(value, 2) : (value || '—')}</div>;
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} type={type} step="any" data-testid={testid}
           onKeyDown={(e) => { if (e.key === 'Enter') onEnter?.(); }}
           className={`editable-cell ${align === 'right' ? 'text-right' : ''}`} />
  );
}

function CostingDetail({ item, canEdit, cell }) {
  const F = item.freight, M = item.margin, CC = item.component_cost, TCC = item.total_component_cost;
  const TI = item.total_install_hrs, LC = item.labour_cost, SP = item.selling_price;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3" data-testid={`detail-${item.item_no}`}>
      <Field label="Rate (R)" editable={canEdit}>{cell('rate', 'number', 'right')}</Field>
      <Field label={`Freight % (${((item.effective_freight_pct)*100).toFixed(0)}%)`}><div className="calc-cell text-right">{fmtAUD(F)}</div></Field>
      <Field label={`Margin % (${((item.effective_margin_pct)*100).toFixed(0)}%)`}><div className="calc-cell text-right">{fmtAUD(M)}</div></Field>
      <Field label="Comp Cost (CC = R+F+M)"><div className="calc-cell text-right">{fmtAUD(CC)}</div></Field>
      <Field label="Qty (Q)" editable={canEdit}>{cell('quantity', 'number', 'right')}</Field>
      <Field label="Total CC (TCC = CC × Q)"><div className="calc-cell text-right font-semibold">{fmtAUD(TCC)}</div></Field>

      <Field label="Install hrs (Ins)" editable={canEdit}>{cell('install_hrs', 'number', 'right')}</Field>
      <Field label="Wiring hrs (Wr)" editable={canEdit}>{cell('wiring_hrs', 'number', 'right')}</Field>
      <Field label="Total Install (TI = Ins+Wr)"><div className="calc-cell text-right">{fmtNum(TI, 2)} hr</div></Field>
      <Field label={`Labour Cost (LC = TI × $${item.effective_labour_rate}/hr)`}><div className="calc-cell text-right">{fmtAUD(LC)}</div></Field>
      <Field label="Selling Price (SP = TCC+LC)"><div className="calc-cell text-right font-bold text-slate-900">{fmtAUD(SP)}</div></Field>
      <div className="col-span-full border-t border-slate-200 pt-3 mt-1 grid grid-cols-3 gap-3">
        <Field label="Override Freight %" editable={canEdit}>
          {cell('freight_pct_override', 'number', 'right')}
        </Field>
        <Field label="Override Margin %" editable={canEdit}>
          {cell('margin_pct_override', 'number', 'right')}
        </Field>
        <Field label="Override Labour $/hr" editable={canEdit}>
          {cell('labour_rate_override', 'number', 'right')}
        </Field>
      </div>
    </div>
  );
}

function Field({ label, editable, children }) {
  return (
    <div>
      <div className={`text-[10px] uppercase tracking-wider mb-1 ${editable ? 'text-slate-700 font-semibold' : 'text-slate-500'}`}>{label}</div>
      {children}
    </div>
  );
}
