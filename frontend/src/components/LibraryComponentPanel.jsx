import React, { useEffect, useState } from 'react';
import { api, fmtAUD, fmtNum } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ComponentImage } from '@/components/ComponentImage';
import { toast } from 'sonner';
import { Pencil, Save, X, Trash2, FolderKanban } from 'lucide-react';

export const CATEGORIES = ['Busbars & Insulators', 'Cable Ducting', 'Chassis', 'Circuit Breakers', 'Current Transformers',
  'Enclosures & Panels', 'Fuse Carriers', 'Meters', 'Surge Protection', 'Trip Units', 'Other'];
export const UNITS = ['ea', 'm', 'set', 'pack', 'box', 'pair', 'roll', 'kg', 'lot'];
const FIELDS = [['description', 'Equipment description', 'text'], ['category', 'Category', 'text', 'cat-list'], ['brand', 'Brand', 'text'],
  ['part_no', 'Part number', 'text'], ['supplier', 'Supplier', 'text'], ['uom', 'Unit', 'text', 'unit-list'],
  ['rate', 'Rate per unit (AUD)', 'number'], ['install_hrs', 'Default install hours', 'number'], ['wiring_hrs', 'Default wiring hours', 'number'],
  ['length_mm', 'Length L (mm)', 'number'], ['width_mm', 'Width W (mm)', 'number'], ['height_mm', 'Height H (mm)', 'number'], ['thickness_mm', 'Thickness (mm)', 'number']];
const DIM_KEYS = ['length_mm', 'width_mm', 'height_mm', 'thickness_mm'];
export const fmtDims = (c) => ([c?.length_mm, c?.width_mm, c?.height_mm].some((v) => v != null)
  ? `${[c.length_mm, c.width_mm, c.height_mm].map((v) => (v != null ? fmtNum(v, 0) : '—')).join(' × ')} mm` : '—');
export const fmtThk = (c) => (c?.thickness_mm != null ? `${fmtNum(c.thickness_mm, 1)} mm` : '—');

export function ComponentForm({ initial, onCancel, onSave, saving, note }) {
  const [f, setF] = useState(() => Object.fromEntries(FIELDS.map(([k]) => [k, initial?.[k] ?? (k === 'uom' ? 'ea' : '')])));
  const submit = () => {
    if (!String(f.description).trim()) return toast.error('Description is required');
    const dims = Object.fromEntries(DIM_KEYS.map((k) => [k, f[k] === '' || f[k] == null ? null : parseFloat(f[k])]));
    onSave({ ...initial, ...f, ...dims, rate: parseFloat(f.rate) || 0, install_hrs: parseFloat(f.install_hrs) || 0, wiring_hrs: parseFloat(f.wiring_hrs) || 0 });
  };
  return (
    <div className="space-y-4" data-testid="component-form">
      {note && <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3">{note}</div>}
      <datalist id="cat-list">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="unit-list">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        {FIELDS.map(([k, l, t, list]) => (
          <div key={k}>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">{l}</label>
            <input type={t} step="any" list={list} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}
                   className={`editable-cell mt-1 ${t === 'number' ? 'text-right' : ''}`} data-testid={`cf-${k}`} />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50 inline-flex items-center gap-1" data-testid="cf-cancel"><X className="h-4 w-4" />Cancel</button>
        <button onClick={submit} disabled={saving} className="px-4 py-2 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-1 disabled:opacity-60" data-testid="cf-save"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`fin text-sm ${strong ? 'font-semibold text-slate-900' : 'text-slate-800'}`}>{value}</span>
    </div>
  );
}

export function LibraryComponentPanel({ componentId, onClose, onChanged }) {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'estimator';
  const [d, setD] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = () => api.get(`/components/${componentId}`).then((r) => setD(r.data));
  useEffect(() => { setEditing(false); setD(null); if (componentId) load(); }, [componentId]); // eslint-disable-line

  const save = async (body) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/components/${componentId}`, body);
      toast.success(`Library updated${data.updated ? ` and ${data.updated} project line${data.updated === 1 ? '' : 's'}` : ''}`);
      await load(); setEditing(false); onChanged?.();
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!window.confirm('Remove this component from the library? Project lines keep their current values.')) return;
    await api.delete(`/components/${componentId}`); toast.success('Removed from library'); onChanged?.(); onClose();
  };
  const c = d?.component;
  return (
    <Sheet open={!!componentId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-slate-50" data-testid="library-panel">
        {!c ? <div className="p-6 text-slate-500">Loading…</div> : (
          <div className="space-y-4">
            <SheetHeader>
              <div className="text-xs uppercase tracking-wider text-red-600 font-semibold" data-testid="lp-category">{c.category}</div>
              <SheetTitle className="text-left text-lg leading-snug" data-testid="lp-description">{c.description}</SheetTitle>
              <SheetDescription className="text-left">Component Library entry · used on {c.lines} project line{c.lines === 1 ? '' : 's'}</SheetDescription>
              {canEdit && !editing && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-1" data-testid="lp-edit-btn"><Pencil className="h-3.5 w-3.5" /> Edit component</button>
                  <button onClick={remove} className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-red-600 hover:bg-red-50 inline-flex items-center gap-1" data-testid="lp-delete-btn"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                </div>
              )}
            </SheetHeader>
            {editing ? (
              <ComponentForm initial={c} saving={saving} onCancel={() => setEditing(false)} onSave={save}
                note={`Saving updates the description, brand, part number, supplier, unit and rate on all ${c.lines} linked project line${c.lines === 1 ? '' : 's'}. Default hours apply to new lines only.`} />
            ) : (<>
              <ComponentImage componentId={c.id} path={c.image_path} canEdit={canEdit} onChanged={async () => { await load(); onChanged?.(); }} />
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <Row label="Brand" value={c.brand || '—'} />
                <Row label="Part number" value={c.part_no || '—'} />
                <Row label="Supplier" value={c.supplier || '—'} />
                <Row label="Unit" value={c.uom || 'ea'} />
                <Row label="Rate per unit" value={c.rate ? fmtAUD(c.rate) : 'Rate needed'} strong />
                <Row label="Default install hours" value={`${fmtNum(c.install_hrs, 2)} hr`} />
                <Row label="Default wiring hours" value={`${fmtNum(c.wiring_hrs, 2)} hr`} />
                <Row label="Dimensions (L × W × H)" value={fmtDims(c)} />
                <Row label="Thickness" value={fmtThk(c)} />
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2"><FolderKanban className="h-4 w-4 text-red-600" /><h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Used in projects</h4></div>
                {d.usage.length === 0 && <div className="text-sm text-slate-500">Not used in any project yet.</div>}
                {d.usage.map((u) => (
                  <div key={u.item_id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                    <div><div className="font-medium text-slate-900">{u.project_name}</div><div className="text-xs text-slate-500">Item #{u.item_no} · Qty {fmtNum(u.quantity, 0)} · line rate {fmtAUD(u.rate)}</div></div>
                    <span className="fin">{fmtAUD(u.selling_price)}</span>
                  </div>
                ))}
              </div>
            </>)}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
