import React, { useEffect, useMemo, useState } from 'react';
import { api, fmtAUD } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, Plus, Check, ImageOff } from 'lucide-react';
import { imageUrl } from '@/components/ComponentImage';

function PartRow({ r, projectId, onAdded }) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const inProject = r.projects.some((p) => p.id === projectId);
  const add = async () => {
    setBusy(true);
    try {
      await api.post(`/projects/${projectId}/items`, {
        project_id: projectId, description: r.description, brand: r.brand, part_no: r.part_no, supplier: r.supplier,
        quantity: parseFloat(qty) || 1, rate: r.rate, install_hrs: r.install_hrs, wiring_hrs: r.wiring_hrs, uom: r.uom, image_path: r.image_path,
      });
      toast.success(`Added ${r.description}`);
      onAdded();
    } catch { toast.error('Could not add component'); } finally { setBusy(false); }
  };
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0" data-testid={`lib-add-row-${r.key}`}>
      <div className="h-11 w-11 rounded bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
        {r.image_path ? <img src={imageUrl(r.image_path)} alt="" className="h-full w-full object-cover" /> : <ImageOff className="h-4 w-4 text-slate-300" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-900 truncate">{r.description}</div>
        <div className="text-xs text-slate-500 truncate">{[r.brand, r.part_no, r.supplier].filter(Boolean).join(' · ') || '—'} · {fmtAUD(r.rate)}</div>
        {inProject && <div className="text-[11px] text-emerald-700 inline-flex items-center gap-1"><Check className="h-3 w-3" />Already in this project</div>}
      </div>
      <input type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} className="editable-cell !w-16 shrink-0 text-right" data-testid={`lib-add-qty-${r.key}`} />
      <button onClick={add} disabled={busy} className="px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-1 disabled:opacity-60" data-testid={`lib-add-btn-${r.key}`}>
        <Plus className="h-4 w-4" />Add
      </button>
    </div>
  );
}

export function AddFromLibrary({ open, onOpenChange, projectId, onAdded }) {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const load = () => api.get('/library').then((r) => setRows(r.data));
  useEffect(() => { if (open) { setQ(''); load(); } }, [open]);

  const view = useMemo(() => {
    const s = q.toLowerCase();
    return (rows || []).filter((r) => !s || [r.description, r.brand, r.part_no, r.supplier].some((v) => (v || '').toLowerCase().includes(s)))
      .sort((a, b) => a.description.localeCompare(b.description));
  }, [rows, q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid="add-from-library">
        <DialogHeader>
          <DialogTitle>Add from Component Library</DialogTitle>
          <DialogDescription>Search parts used in any project and add them here with their brand, part number, supplier, rate, hours and picture.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search description, brand, part number, supplier…" className="pl-8" data-testid="lib-add-search" />
        </div>
        <div className="max-h-[55vh] overflow-y-auto pr-1">
          {!rows && <div className="p-8 text-center text-slate-500 text-sm">Loading parts…</div>}
          {rows && view.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No parts match "{q}".</div>}
          {view.map((r) => <PartRow key={r.key} r={r} projectId={projectId} onAdded={() => { load(); onAdded(); }} />)}
        </div>
      </DialogContent>
    </Dialog>
  );
}
