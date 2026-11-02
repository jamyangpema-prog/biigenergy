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
import { Plus, Copy, Trash2, ChevronDown, ChevronRight, Search, Download, Upload, FilePlus2, FileSpreadsheet, ArrowUpDown, Hash, Eye } from 'lucide-react';
import { ComponentDetails } from '@/components/ComponentDetails';

const BLANK = { description: '', brand: '', part_no: '', supplier: '', quantity: 1, rate: 0, install_hrs: 0, wiring_hrs: 0 };

export default function EquipmentCosting() {
  const { current, projects, refresh: refreshProjects } = useProjects();
  const auth = useAuth();
  const { can } = auth;
  const canEdit = auth.user?.role !== 'viewer';
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: 'item_no', dir: 'asc' });
  const [showNew, setShowNew] = useState(false);
  const [showProj, setShowProj] = useState(false);
  const [newItem, setNewItem] = useState(BLANK);
  const [newProj, setNewProj] = useState({ name: '', client: '', description: '' });
  const fileRef = useRef(null);

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
    } catch (e) {
      toast.error('Update failed'); loadItems();
    }
  };
  const addItem = async () => {
    try {
      await api.post(`/projects/${current.id}/items`, { ...newItem, project_id: current.id });
      toast.success('Item added');
      setShowNew(false); setNewItem(BLANK); loadItems();
    } catch { toast.error('Add failed'); }
  };
  const dup = async (id) => { try { await api.post(`/items/${id}/duplicate`); loadItems(); toast.success('Duplicated'); } catch { toast.error('Failed'); } };
  const del = async (id) => { if (!window.confirm('Delete item?')) return; await api.delete(`/items/${id}`); loadItems(); toast.success('Deleted'); };
  const renumber = async () => { await api.post(`/projects/${current.id}/renumber`); loadItems(); toast.success('Renumbered'); };

  const createProject = async () => {
    try {
      await api.post('/projects', { name: newProj.name || 'New Project', client: newProj.client, description: newProj.description });
      setShowProj(false); setNewProj({ name: '', client: '', description: '' });
      await refreshProjects(); toast.success('Project created');
    } catch { toast.error('Failed'); }
  };
  const dupProject = async () => { await api.post(`/projects/${current.id}/duplicate`); await refreshProjects(); toast.success('Project duplicated'); };
  const delProject = async () => {
    if (projects.length <= 1) return toast.error('At least one project required');
    if (!window.confirm(`Delete project "${current.name}"? This cannot be undone.`)) return;
    await api.delete(`/projects/${current.id}`); await refreshProjects(); toast.success('Deleted');
  };
  const exportXL = async () => {
    const res = await api.get(`/projects/${current.id}/export/excel`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data); const a = document.createElement('a');
    a.href = url; a.download = `${current.name}.xlsx`; a.click(); URL.revokeObjectURL(url);
  };
  const exportPDF = async () => {
    const res = await api.get(`/projects/${current.id}/export/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data); const a = document.createElement('a');
    a.href = url; a.download = `${current.name}_quote.pdf`; a.click(); URL.revokeObjectURL(url);
  };
  const importXL = async (file) => {
    const fd = new FormData(); fd.append('file', file);
    try {
      const { data } = await api.post(`/projects/${current.id}/import/excel`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Imported ${data.imported} items`); loadItems();
    } catch { toast.error('Import failed'); }
  };

  if (!current) return <div className="text-slate-500">No project selected.</div>;

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
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{current.name}</h1>
          <p className="text-sm text-slate-500">{current.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && importXL(e.target.files[0])} />
          {canEdit && <Button onClick={() => setShowNew(true)} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="btn-add-item"><Plus className="h-4 w-4 mr-1" /> Add item</Button>}
          {canEdit && <Button variant="outline" onClick={() => fileRef.current?.click()} data-testid="btn-import"><Upload className="h-4 w-4 mr-1" /> Import</Button>}
          <Button variant="outline" onClick={exportXL} data-testid="btn-export-xl"><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
          <Button variant="outline" onClick={exportPDF} data-testid="btn-export-pdf"><Download className="h-4 w-4 mr-1" /> PDF</Button>
          {canEdit && <Button variant="outline" onClick={renumber} data-testid="btn-renumber"><Hash className="h-4 w-4 mr-1" /> Renumber</Button>}
          {canEdit && <Button variant="outline" onClick={() => setShowProj(true)} data-testid="btn-new-project"><FilePlus2 className="h-4 w-4 mr-1" /> New project</Button>}
          {canEdit && <Button variant="outline" onClick={dupProject} data-testid="btn-dup-project"><Copy className="h-4 w-4 mr-1" /> Duplicate</Button>}
          {can('manage_users') && <Button variant="outline" onClick={delProject} className="text-red-600 hover:text-red-700" data-testid="btn-del-project"><Trash2 className="h-4 w-4" /></Button>}
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
          <div className="text-xs text-slate-500">{filtered.length} of {items.length} shown</div>
        </div>
        <div className="overflow-x-auto">
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
                <th className="w-24 px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {!loaded && (
                <tr><td colSpan={10} className="p-12 text-center text-slate-500" data-testid="items-loading">Loading items…</td></tr>
              )}
              {loaded && filtered.length === 0 && (
                <tr><td colSpan={10} className="p-12 text-center text-slate-500">
                  No items. {canEdit && <button onClick={() => setShowNew(true)} className="text-blue-600 hover:underline">Add one</button>}
                </td></tr>
              )}
              {filtered.map((it) => (
                <React.Fragment key={it.id}>
                  <tr className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer" data-testid={`row-${it.item_no}`}
                      onClick={(e) => { if (!e.target.closest('input,button')) setDetailId(it.id); }}>
                    <td className="px-2 py-2 text-slate-400">
                      <button onClick={() => toggle(it.id)} data-testid={`expand-${it.item_no}`}>
                        {expanded.has(it.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-3 py-2 fin text-slate-500">{it.item_no}</td>
                    <td className="px-3 py-2"><CellInput disabled={!canEdit} value={it.description} onCommit={(v) => updateItem(it.id, { description: v })} /></td>
                    <td className="px-3 py-2"><CellInput disabled={!canEdit} value={it.brand} onCommit={(v) => updateItem(it.id, { brand: v })} /></td>
                    <td className="px-3 py-2"><CellInput disabled={!canEdit} value={it.part_no} onCommit={(v) => updateItem(it.id, { part_no: v })} /></td>
                    <td className="px-3 py-2"><CellInput disabled={!canEdit} value={it.supplier} onCommit={(v) => updateItem(it.id, { supplier: v })} /></td>
                    <td className="px-3 py-2"><CellInput disabled={!canEdit} type="number" value={it.quantity} onCommit={(v) => updateItem(it.id, { quantity: parseFloat(v) || 0 })} align="right" /></td>
                    <td className="px-3 py-2"><CellInput disabled={!canEdit} type="number" value={it.rate} onCommit={(v) => updateItem(it.id, { rate: parseFloat(v) || 0 })} align="right" /></td>
                    <td className="px-3 py-2 fin text-right font-semibold text-slate-900">{fmtAUD(it.selling_price)}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
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
                        <CostingDetail item={it} settings={current.settings} canEdit={canEdit} onCommit={(patch) => updateItem(it.id, patch)} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300">
                  <td /> <td /> <td className="px-3 py-3 text-xs uppercase tracking-wider text-slate-600 font-semibold">Totals</td>
                  <td /> <td /> <td />
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

      <ComponentDetails itemId={detailId} onClose={() => setDetailId(null)} />

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

      <Dialog open={showProj} onOpenChange={setShowProj}>
        <DialogContent>
          <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={newProj.name} onChange={(e) => setNewProj({ ...newProj, name: e.target.value })} data-testid="new-project-name" /></div>
            <div><Label>Client</Label><Input value={newProj.client} onChange={(e) => setNewProj({ ...newProj, client: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={newProj.description} onChange={(e) => setNewProj({ ...newProj, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProj(false)}>Cancel</Button>
            <Button onClick={createProject} className="bg-slate-900 text-white" data-testid="btn-save-project">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CellInput({ value, onCommit, type = 'text', align = 'left', disabled = false }) {
  const [v, setV] = useState(value ?? '');
  useEffect(() => setV(value ?? ''), [value]);
  if (disabled) return <div className={`fin text-sm text-slate-700 ${align === 'right' ? 'text-right' : ''}`}>{type === 'number' ? fmtNum(value, 2) : (value || '—')}</div>;
  return (
    <input value={v} onChange={(e) => setV(e.target.value)} type={type}
           onBlur={() => v !== value && onCommit(v)}
           onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
           className={`editable-cell ${align === 'right' ? 'text-right' : ''}`} />
  );
}

function CostingDetail({ item, settings, onCommit, canEdit }) {
  const F = item.freight, M = item.margin, CC = item.component_cost, TCC = item.total_component_cost;
  const TI = item.total_install_hrs, LC = item.labour_cost, SP = item.selling_price;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3" data-testid={`detail-${item.item_no}`}>
      <Field label="Rate (R)" editable={canEdit}><CellInput disabled={!canEdit} type="number" value={item.rate} onCommit={(v) => onCommit({ rate: parseFloat(v) || 0 })} align="right" /></Field>
      <Field label={`Freight % (${((item.effective_freight_pct)*100).toFixed(0)}%)`}><div className="calc-cell text-right">{fmtAUD(F)}</div></Field>
      <Field label={`Margin % (${((item.effective_margin_pct)*100).toFixed(0)}%)`}><div className="calc-cell text-right">{fmtAUD(M)}</div></Field>
      <Field label="Comp Cost (CC = R+F+M)"><div className="calc-cell text-right">{fmtAUD(CC)}</div></Field>
      <Field label="Qty (Q)" editable={canEdit}><CellInput disabled={!canEdit} type="number" value={item.quantity} onCommit={(v) => onCommit({ quantity: parseFloat(v) || 0 })} align="right" /></Field>
      <Field label="Total CC (TCC = CC × Q)"><div className="calc-cell text-right font-semibold">{fmtAUD(TCC)}</div></Field>

      <Field label="Install hrs (Ins)" editable={canEdit}><CellInput disabled={!canEdit} type="number" value={item.install_hrs} onCommit={(v) => onCommit({ install_hrs: parseFloat(v) || 0 })} align="right" /></Field>
      <Field label="Wiring hrs (Wr)" editable={canEdit}><CellInput disabled={!canEdit} type="number" value={item.wiring_hrs} onCommit={(v) => onCommit({ wiring_hrs: parseFloat(v) || 0 })} align="right" /></Field>
      <Field label="Total Install (TI = Ins+Wr)"><div className="calc-cell text-right">{fmtNum(TI, 2)} hr</div></Field>
      <Field label={`Labour Cost (LC = TI × $${item.effective_labour_rate}/hr)`}><div className="calc-cell text-right">{fmtAUD(LC)}</div></Field>
      <Field label="Selling Price (SP = TCC+LC)"><div className="calc-cell text-right font-bold text-slate-900">{fmtAUD(SP)}</div></Field>
      <div className="col-span-full border-t border-slate-200 pt-3 mt-1 grid grid-cols-3 gap-3">
        <Field label="Override Freight %" editable={canEdit}>
          <CellInput disabled={!canEdit} type="number" value={item.freight_pct_override ?? ''} onCommit={(v) => onCommit({ freight_pct_override: v === '' ? null : parseFloat(v) })} align="right" />
        </Field>
        <Field label="Override Margin %" editable={canEdit}>
          <CellInput disabled={!canEdit} type="number" value={item.margin_pct_override ?? ''} onCommit={(v) => onCommit({ margin_pct_override: v === '' ? null : parseFloat(v) })} align="right" />
        </Field>
        <Field label="Override Labour $/hr" editable={canEdit}>
          <CellInput disabled={!canEdit} type="number" value={item.labour_rate_override ?? ''} onCommit={(v) => onCommit({ labour_rate_override: v === '' ? null : parseFloat(v) })} align="right" />
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
