import React, { useEffect, useState } from 'react';
import { api, fmtAUD, fmtNum } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { imageUrl } from '@/components/ComponentImage';
import { fmtDims, fmtThk } from '@/components/LibraryComponentPanel';
import { toast } from 'sonner';
import { Package, Wrench, Receipt, FolderKanban, Pencil, Save, X, ImageOff, Library } from 'lucide-react';

const FIELDS = [['description', 'Equipment description', 'text'], ['brand', 'Brand', 'text'], ['part_no', 'Part number', 'text'],
  ['supplier', 'Supplier', 'text'], ['uom', 'Unit', 'text'], ['quantity', 'Quantity', 'number'], ['rate', 'Rate per unit (AUD)', 'number'],
  ['install_hrs', 'Install hours (this line)', 'number'], ['wiring_hrs', 'Wiring hours (this line)', 'number']];
const NUMS = ['quantity', 'rate', 'install_hrs', 'wiring_hrs'];

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`fin text-sm ${strong ? 'font-semibold text-slate-900' : 'text-slate-800'}`}>{value}</span>
    </div>
  );
}

function Block({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2"><Icon className="h-4 w-4 text-red-600" /><h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">{title}</h4></div>
      {children}
    </div>
  );
}

function LineForm({ item, onCancel, onSaved }) {
  const [f, setF] = useState(() => Object.fromEntries(FIELDS.map(([k]) => [k, item[k] ?? (k === 'uom' ? 'ea' : '')])));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!String(f.description).trim()) return toast.error('Description is required');
    setSaving(true);
    try {
      const body = { ...item, ...f };
      NUMS.forEach((k) => { body[k] = parseFloat(f[k]) || 0; });
      await api.put(`/items/${item.id}`, body);
      toast.success('Line updated (library unchanged)');
      onSaved();
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-4" data-testid="line-edit-form">
      <div className="rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs p-3">Changes apply to this project line only. The Component Library entry stays as it is.</div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        {FIELDS.map(([k, l, t]) => (
          <div key={k}>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">{l}</label>
            <input type={t} step="any" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}
                   className={`editable-cell mt-1 ${t === 'number' ? 'text-right' : ''}`} data-testid={`le-${k}`} />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50 inline-flex items-center gap-1" data-testid="le-cancel"><X className="h-4 w-4" />Cancel</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-1 disabled:opacity-60" data-testid="le-save"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  );
}

export function LineDetails({ itemId, onClose, onSaved }) {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'estimator';
  const [d, setD] = useState(null);
  const [editing, setEditing] = useState(false);
  const load = () => api.get(`/items/${itemId}/details`).then((r) => setD(r.data));
  useEffect(() => { setEditing(false); setD(null); if (itemId) load(); }, [itemId]); // eslint-disable-line
  const it = d?.item;
  const lib = d?.component;
  return (
    <Sheet open={!!itemId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-slate-50" data-testid="component-details">
        {!it ? <div className="p-6 text-slate-500">Loading…</div> : (
          <div className="space-y-4">
            <SheetHeader>
              <div className="text-xs uppercase tracking-wider text-red-600 font-semibold">Item #{it.item_no}</div>
              <SheetTitle className="text-left text-lg leading-snug" data-testid="details-description">{it.description || 'Untitled component'}</SheetTitle>
              <SheetDescription className="text-left">Project: <span className="font-medium text-slate-900" data-testid="details-project">{d.project_name}</span></SheetDescription>
              {canEdit && !editing && (
                <button onClick={() => setEditing(true)} className="self-start mt-2 px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-1" data-testid="details-edit-btn"><Pencil className="h-3.5 w-3.5" /> Edit this line</button>
              )}
            </SheetHeader>
            {editing ? <LineForm item={it} onCancel={() => setEditing(false)} onSaved={async () => { await load(); setEditing(false); onSaved?.(); }} /> : (<>
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center">
                  {it.image_path ? <img src={imageUrl(it.image_path)} alt="" className="h-full w-full object-contain" data-testid="component-image-img" />
                    : <div className="text-slate-400 text-sm flex flex-col items-center gap-1"><ImageOff className="h-8 w-8" />No picture (add one in the Component Library)</div>}
                </div>
              </div>
              <Block icon={Package} title="Component">
                <Row label="Brand" value={it.brand || '—'} />
                <Row label="Part number" value={it.part_no || '—'} />
                <Row label="Supplier" value={it.supplier || '—'} />
                <Row label="Unit" value={it.uom || 'ea'} />
                <Row label="Dimensions (L × W × H)" value={<span data-testid="details-dims">{fmtDims(lib)}</span>} />
                <Row label="Thickness" value={<span data-testid="details-thickness">{fmtThk(lib)}</span>} />
                <Row label="Rate (1 unit)" value={fmtAUD(it.rate)} strong />
                <Row label={`Freight (${(it.effective_freight_pct * 100).toFixed(1)}%)`} value={fmtAUD(it.freight)} />
                <Row label={`Margin (${(it.effective_margin_pct * 100).toFixed(1)}%)`} value={fmtAUD(it.margin)} />
                <Row label="Component cost (1 unit)" value={fmtAUD(it.component_cost)} strong />
                <Row label="Quantity" value={fmtNum(it.quantity, 0)} />
                <Row label="Total component cost" value={fmtAUD(it.total_component_cost)} strong />
              </Block>
              <Block icon={Wrench} title="Installation">
                <Row label="Install hours" value={`${fmtNum(it.install_hrs, 2)} hr`} />
                <Row label="Wiring hours" value={`${fmtNum(it.wiring_hrs, 2)} hr`} />
                <Row label="Labour rate" value={`${fmtAUD(it.effective_labour_rate)}/hr`} />
                <Row label="Installation cost" value={fmtAUD(it.labour_cost)} strong />
              </Block>
              <div className="rounded-lg bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2"><Receipt className="h-4 w-4 text-red-400" /><span className="text-sm">Selling price (ex GST)</span></div>
                <span className="fin text-lg font-semibold" data-testid="details-sp">{fmtAUD(it.selling_price)}</span>
              </div>
              <Block icon={Library} title="Component Library">
                {lib ? <><Row label="Library entry" value={lib.description} /><Row label="Library rate per unit" value={lib.rate ? fmtAUD(lib.rate) : 'Rate needed'} />
                  {Math.abs((lib.rate || 0) - it.rate) > 0.0001 && <div className="text-xs text-amber-700 pt-2">This line's rate differs from the library rate.</div>}</>
                  : <div className="text-sm text-slate-500">Not linked to a library entry.</div>}
              </Block>
              {d.usage.length > 0 && (
                <Block icon={FolderKanban} title="Same library component used in">
                  {d.usage.map((u) => (
                    <div key={u.item_id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                      <div><div className="font-medium text-slate-900">{u.project_name}</div><div className="text-xs text-slate-500">Item #{u.item_no} · Qty {fmtNum(u.quantity, 0)}</div></div>
                      <span className="fin">{fmtAUD(u.selling_price)}</span>
                    </div>
                  ))}
                </Block>
              )}
            </>)}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
