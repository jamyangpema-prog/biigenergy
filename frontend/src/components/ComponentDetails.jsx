import React, { useEffect, useState } from 'react';
import { api, fmtAUD, fmtNum } from '@/lib/api';
import { useProjects } from '@/lib/projects';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Package, Wrench, Receipt, FolderKanban, Pencil, Save, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

const FIELDS = [['description', 'Equipment description', 'text'], ['brand', 'Brand', 'text'], ['part_no', 'Part number', 'text'],
  ['supplier', 'Supplier', 'text'], ['rate', 'Rate (1 component, AUD)', 'number'], ['install_hrs', 'Install hours', 'number'], ['wiring_hrs', 'Wiring hours', 'number']];

function EditForm({ d, onCancel, onSaved }) {
  const [f, setF] = useState(() => Object.fromEntries(FIELDS.map(([k]) => [k, d.item[k] ?? ''])));
  const [qty, setQty] = useState(() => Object.fromEntries(d.usage.map((u) => [u.item_id, u.quantity])));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!String(f.description).trim()) return toast.error('Description is required');
    setSaving(true);
    try {
      const body = { ...f, rate: parseFloat(f.rate) || 0, install_hrs: parseFloat(f.install_hrs) || 0, wiring_hrs: parseFloat(f.wiring_hrs) || 0,
        quantities: Object.fromEntries(Object.entries(qty).map(([k, v]) => [k, parseFloat(v) || 0])) };
      const { data } = await api.put(`/items/${d.item.id}/apply-all`, body);
      toast.success(`Updated ${data.updated} line${data.updated === 1 ? '' : 's'} across all projects`);
      onSaved();
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-4" data-testid="details-edit-form">
      <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3">
        Changes apply to all {d.usage.length} matching line{d.usage.length === 1 ? '' : 's'} in every project. Quantities are set per line below.
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        {FIELDS.map(([k, l, t]) => (
          <div key={k}>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">{l}</label>
            <input type={t} step="any" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}
                   className={`editable-cell mt-1 ${t === 'number' ? 'text-right' : ''}`} data-testid={`edit-${k}`} />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Quantity per line</div>
        {d.usage.map((u) => (
          <div key={u.item_id} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
            <div className="text-sm"><span className="font-medium text-slate-900">{u.project_name}</span> <span className="text-slate-500">· Item #{u.item_no}</span></div>
            <input type="number" step="any" value={qty[u.item_id]} onChange={(e) => setQty({ ...qty, [u.item_id]: e.target.value })}
                   className="editable-cell w-24 text-right" data-testid={`edit-qty-${u.item_id}`} />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50 inline-flex items-center gap-1" data-testid="edit-cancel"><X className="h-4 w-4" />Cancel</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-1 disabled:opacity-60" data-testid="edit-save"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  );
}

function Row({ label, value, strong, testid }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`fin text-sm ${strong ? 'font-semibold text-slate-900' : 'text-slate-800'}`} data-testid={testid}>{value}</span>
    </div>
  );
}

function Block({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-red-600" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">{title}</h4>
      </div>
      {children}
    </div>
  );
}

export function ComponentDetails({ itemId, onClose, onSaved }) {
  const { selectProject } = useProjects();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'estimator';
  const [d, setD] = useState(null);
  const [editing, setEditing] = useState(false);

  const load = () => api.get(`/items/${itemId}/details`).then((r) => setD(r.data));
  useEffect(() => {
    setEditing(false);
    if (!itemId) { setD(null); return; }
    load();
  }, [itemId]); // eslint-disable-line

  const it = d?.item;
  const groups = Object.values((d?.usage || []).reduce((acc, u) => {
    const g = acc[u.project_id] || (acc[u.project_id] = { project_id: u.project_id, project_name: u.project_name, items: [], qty: 0, sp: 0 });
    g.items.push(u.item_no); g.qty += u.quantity; g.sp += u.selling_price;
    return acc;
  }, {}));
  return (
    <Sheet open={!!itemId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-slate-50" data-testid="component-details">
        {!it ? <div className="p-6 text-slate-500">Loading…</div> : (
          <div className="space-y-4">
            <SheetHeader>
              <div className="text-xs uppercase tracking-wider text-red-600 font-semibold">Item #{it.item_no}</div>
              <SheetTitle className="text-left text-lg leading-snug" data-testid="details-description">{it.description || 'Untitled component'}</SheetTitle>
              <SheetDescription className="text-left">
                Project: <span className="font-medium text-slate-900" data-testid="details-project">{d.project_name}</span>
              </SheetDescription>
              {canEdit && !editing && (
                <button onClick={() => setEditing(true)} className="self-start mt-2 px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-1" data-testid="details-edit-btn">
                  <Pencil className="h-3.5 w-3.5" /> Edit component
                </button>
              )}
            </SheetHeader>

            {editing ? (
              <EditForm d={d} onCancel={() => setEditing(false)} onSaved={async () => { await load(); setEditing(false); onSaved?.(); }} />
            ) : (<>

            <Block icon={Package} title="Component">
              <Row label="Brand" value={it.brand || '—'} testid="details-brand" />
              <Row label="Part number" value={it.part_no || '—'} testid="details-part-no" />
              <Row label="Supplier" value={it.supplier || '—'} testid="details-supplier" />
              <Row label="Rate (1 component)" value={fmtAUD(it.rate)} strong testid="details-rate" />
              <Row label={`Freight (${(it.effective_freight_pct * 100).toFixed(1)}%)`} value={fmtAUD(it.freight)} />
              <Row label={`Margin (${(it.effective_margin_pct * 100).toFixed(1)}%)`} value={fmtAUD(it.margin)} />
              <Row label="Component cost (1 component)" value={fmtAUD(it.component_cost)} strong testid="details-cc" />
              <Row label="Quantity" value={fmtNum(it.quantity, 0)} />
              <Row label="Total component cost" value={fmtAUD(it.total_component_cost)} strong testid="details-tcc" />
            </Block>

            <Block icon={Wrench} title="Installation">
              <Row label="Install hours" value={`${fmtNum(it.install_hrs, 2)} hr`} />
              <Row label="Wiring hours" value={`${fmtNum(it.wiring_hrs, 2)} hr`} />
              <Row label="Total hours" value={`${fmtNum(it.total_install_hrs, 2)} hr`} />
              <Row label="Labour rate" value={`${fmtAUD(it.effective_labour_rate)}/hr`} />
              <Row label="Installation cost" value={fmtAUD(it.labour_cost)} strong testid="details-install-cost" />
            </Block>

            <div className="rounded-lg bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><Receipt className="h-4 w-4 text-red-400" /><span className="text-sm">Selling price (ex GST)</span></div>
              <span className="fin text-lg font-semibold" data-testid="details-sp">{fmtAUD(it.selling_price)}</span>
            </div>

            <Block icon={FolderKanban} title={`Used in projects (matched by ${d.matched_by === 'part_no' ? 'part number' : 'description'})`}>
              {groups.map((g) => (
                <button key={g.project_id} onClick={() => { selectProject(g.project_id); onClose(); }}
                        className="w-full flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-left hover:bg-slate-50 px-1 rounded"
                        data-testid={`details-usage-${g.project_id}`}>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{g.project_name}</div>
                    <div className="text-xs text-slate-500">Total qty {fmtNum(g.qty, 0)} · Item #{g.items.join(', #')}</div>
                  </div>
                  <span className="fin text-sm text-slate-800">{fmtAUD(g.sp)}</span>
                </button>
              ))}
            </Block>
            </>)}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
