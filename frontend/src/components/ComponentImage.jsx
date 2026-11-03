import React, { useRef, useState } from 'react';
import { api, API } from '@/lib/api';
import { toast } from 'sonner';
import { ImagePlus, Trash2, Loader2, ImageOff } from 'lucide-react';

export const imageUrl = (path) => (path ? `${API}/images/${path}` : null);

export function ComponentImage({ itemId, path, canEdit, onChanged }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be 5 MB or smaller');
    const fd = new FormData(); fd.append('file', file);
    setBusy(true);
    try {
      const { data } = await api.post(`/items/${itemId}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Picture added to ${data.updated} line${data.updated === 1 ? '' : 's'}`);
      onChanged?.();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
    finally { setBusy(false); if (ref.current) ref.current.value = ''; }
  };
  const remove = async () => {
    if (!window.confirm('Remove this picture from the component everywhere?')) return;
    setBusy(true);
    try { await api.delete(`/items/${itemId}/image`); toast.success('Picture removed'); onChanged?.(); }
    catch { toast.error('Could not remove picture'); } finally { setBusy(false); }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden" data-testid="component-image">
      <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center">
        {path ? <img src={imageUrl(path)} alt="Component" className="h-full w-full object-contain" data-testid="component-image-img" />
              : <div className="text-slate-400 text-sm flex flex-col items-center gap-1"><ImageOff className="h-8 w-8" />No picture yet</div>}
      </div>
      {canEdit && (
        <div className="p-2 flex gap-2 border-t border-slate-200">
          <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                 onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} data-testid="component-image-input" />
          <button onClick={() => ref.current?.click()} disabled={busy}
                  className="flex-1 px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50 inline-flex items-center justify-center gap-1 disabled:opacity-60" data-testid="component-image-upload">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} {path ? 'Change picture' : 'Add picture'}
          </button>
          {path && (
            <button onClick={remove} disabled={busy} className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-red-600 hover:bg-red-50" data-testid="component-image-remove">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
