import React, { useEffect, useState } from 'react';
import { api, fmtAUD } from '@/lib/api';
import { useProjects } from '@/lib/projects';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { ProjectPicker } from '@/components/ProjectPicker';

export default function Settings() {
  const { current, refresh } = useProjects();
  const auth = useAuth();
  const [p, setP] = useState(current);
  const canEdit = auth.user?.role === 'admin' || auth.user?.role === 'estimator';

  useEffect(() => setP(current), [current]);

  if (!p) return null;
  const s = p.settings;
  const update = (patch) => setP({ ...p, settings: { ...s, ...patch } });

  const save = async () => {
    try {
      await api.put(`/projects/${p.id}`, p);
      await refresh();
      toast.success('Settings saved');
    } catch { toast.error('Save failed'); }
  };

  return (
    <div className="space-y-6 max-w-4xl" data-testid="settings-page">
      <div>
        <ProjectPicker />
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-3">Costing Settings</h1>
        <p className="text-sm text-slate-500">Global cost assumptions for <strong>{p.name}</strong>. Individual items can override any value.</p>
      </div>

      <Card className="p-6 border-slate-200 space-y-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Rates & percentages</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <Label>Freight % <span className="text-slate-400">(default 15%)</span></Label>
            <Input type="number" step="0.01" disabled={!canEdit} value={s.freight_pct}
                   onChange={(e) => update({ freight_pct: parseFloat(e.target.value) || 0 })} data-testid="freight-pct" />
            <p className="text-xs text-slate-500 mt-1">F = R × {(s.freight_pct*100).toFixed(1)}%</p>
          </div>
          <div>
            <Label>Margin % <span className="text-slate-400">(default 20%)</span></Label>
            <Input type="number" step="0.01" disabled={!canEdit} value={s.margin_pct}
                   onChange={(e) => update({ margin_pct: parseFloat(e.target.value) || 0 })} data-testid="margin-pct" />
            <p className="text-xs text-slate-500 mt-1">M = R × {(s.margin_pct*100).toFixed(1)}%</p>
          </div>
          <div>
            <Label>Labour rate / hour <span className="text-slate-400">(default AUD 85)</span></Label>
            <Input type="number" step="1" disabled={!canEdit} value={s.labour_rate}
                   onChange={(e) => update({ labour_rate: parseFloat(e.target.value) || 0 })} data-testid="labour-rate" />
            <p className="text-xs text-slate-500 mt-1">LC = TI × {fmtAUD(s.labour_rate)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-slate-200 space-y-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Currency & GST</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <Label>Currency</Label>
            <Input disabled={!canEdit} value={s.currency} onChange={(e) => update({ currency: e.target.value })} data-testid="currency" />
          </div>
          <div>
            <Label>GST rate</Label>
            <Input type="number" step="0.01" disabled={!canEdit} value={s.gst_rate}
                   onChange={(e) => update({ gst_rate: parseFloat(e.target.value) || 0 })} data-testid="gst-rate" />
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label>GST included in selling price</Label>
              <p className="text-xs text-slate-500 mt-1">{s.gst_included ? 'Yes — SP figures include GST.' : 'No — GST added at quote stage (default).'}</p>
            </div>
            <Switch checked={s.gst_included} disabled={!canEdit} onCheckedChange={(v) => update({ gst_included: v })} data-testid="gst-included" />
          </div>
        </div>
      </Card>

      <Card className="p-6 border-slate-200 space-y-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Project details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><Label>Project name</Label><Input disabled={!canEdit} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
          <div><Label>Client</Label><Input disabled={!canEdit} value={p.client || ''} onChange={(e) => setP({ ...p, client: e.target.value })} /></div>
        </div>
        <div><Label>Description</Label><Textarea disabled={!canEdit} value={p.description || ''} onChange={(e) => setP({ ...p, description: e.target.value })} /></div>
        <div><Label>Quotation notes</Label><Textarea disabled={!canEdit} value={p.notes || ''} onChange={(e) => setP({ ...p, notes: e.target.value })} /></div>
        <div><Label>Exclusions</Label><Textarea disabled={!canEdit} value={p.exclusions || ''} onChange={(e) => setP({ ...p, exclusions: e.target.value })} /></div>
        <div><Label>Commercial terms</Label><Textarea disabled={!canEdit} value={p.terms || ''} onChange={(e) => setP({ ...p, terms: e.target.value })} /></div>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={save} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="btn-save-settings"><Save className="h-4 w-4 mr-2" />Save settings</Button>
        </div>
      )}
    </div>
  );
}
