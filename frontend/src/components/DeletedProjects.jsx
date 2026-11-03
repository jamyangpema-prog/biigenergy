import React, { useEffect, useState } from 'react';
import { api, fmtNum } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RotateCcw, Trash2, ArchiveRestore } from 'lucide-react';

export function DeletedProjects({ rev, onRestored }) {
  const [rows, setRows] = useState([]);
  const load = () => api.get('/trash/projects').then((r) => setRows(r.data)).catch(() => setRows([]));
  useEffect(() => { load(); }, [rev]);

  const restore = async (p) => {
    try { await api.post(`/trash/projects/${p.id}/restore`); toast.success(`Restored "${p.name}"`); load(); onRestored?.(); }
    catch { toast.error('Could not restore project'); }
  };
  const purge = async (p) => {
    if (!window.confirm(`Permanently delete "${p.name}"? This cannot be undone.`)) return;
    await api.delete(`/trash/projects/${p.id}`); toast.success('Permanently deleted'); load();
  };

  return (
    <Card className="border-slate-200 overflow-hidden" data-testid="deleted-projects">
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
        <ArchiveRestore className="h-4 w-4 text-red-600" />
        <h2 className="text-sm font-semibold text-slate-900">Recently deleted</h2>
        <span className="text-xs text-slate-500">({rows.length})</span>
      </div>
      {rows.length === 0 ? <div className="px-5 py-6 text-sm text-slate-500" data-testid="deleted-empty">No deleted projects.</div> : rows.map((p) => (
        <div key={p.id} className="px-5 py-3 border-t border-slate-100 first:border-0 flex flex-wrap items-center gap-3" data-testid={`deleted-row-${p.id}`}>
          <div className="flex-1 min-w-[200px]">
            <div className="font-medium text-slate-900">{p.name}</div>
            <div className="text-xs text-slate-500">{p.client || 'No client'} · {fmtNum(p.item_count || 0, 0)} items · deleted {new Date(p.deleted_at).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}{p.deleted_by ? ` by ${p.deleted_by}` : ''}</div>
          </div>
          <Button size="sm" onClick={() => restore(p)} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid={`restore-${p.id}`}><RotateCcw className="h-3.5 w-3.5 mr-1" />Restore</Button>
          <Button size="sm" variant="outline" onClick={() => purge(p)} className="text-red-600" data-testid={`purge-${p.id}`}><Trash2 className="h-3.5 w-3.5 mr-1" />Delete forever</Button>
        </div>
      ))}
    </Card>
  );
}
