import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmtAUD, fmtNum } from '@/lib/api';
import { useProjects } from '@/lib/projects';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Copy, Trash2, Table2, FileText, Settings2, FolderKanban } from 'lucide-react';

const BLANK = { name: '', client: '', description: '' };

function ProjectForm({ open, onOpenChange, initial, onSave, title }) {
  const [f, setF] = useState(BLANK);
  useEffect(() => { if (open) setF({ ...BLANK, ...(initial || {}) }); }, [open]); // eslint-disable-line
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="project-form">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Project name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="project-form-name" /></div>
          <div><Label>Client</Label><Input value={f.client || ''} onChange={(e) => setF({ ...f, client: e.target.value })} data-testid="project-form-client" /></div>
          <div><Label>Description</Label><Textarea value={f.description || ''} onChange={(e) => setF({ ...f, description: e.target.value })} data-testid="project-form-description" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => (f.name.trim() ? onSave(f) : toast.error('Project name is required'))} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="project-form-save">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Projects() {
  const { projects, selectProject, refresh } = useProjects();
  const { user } = useAuth();
  const nav = useNavigate();
  const canEdit = user?.role === 'admin' || user?.role === 'estimator';
  const isAdmin = user?.role === 'admin';
  const [stats, setStats] = useState({});
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null); // {mode:'new'|'edit', project}

  const loadStats = () => api.get('/dashboard').then((r) => setStats(Object.fromEntries(r.data.per_project.map((p) => [p.id, p]))));
  useEffect(() => { loadStats(); }, [projects]);

  const view = useMemo(() => {
    const s = q.toLowerCase();
    return projects.filter((p) => !s || [p.name, p.client, p.description].some((v) => (v || '').toLowerCase().includes(s)));
  }, [projects, q]);

  const open = (p, path) => { selectProject(p.id); nav(path); };
  const save = async (f) => {
    try {
      if (form.mode === 'new') {
        const { data } = await api.post('/projects', f);
        await refresh(); selectProject(data.id); toast.success('Project created');
      } else {
        await api.put(`/projects/${form.project.id}`, { ...form.project, ...f });
        await refresh(); toast.success('Project updated');
      }
      setForm(null);
    } catch { toast.error('Could not save project'); }
  };
  const duplicate = async (p) => { await api.post(`/projects/${p.id}/duplicate`); await refresh(); toast.success('Project duplicated'); };
  const remove = async (p) => {
    if (projects.length <= 1) return toast.error('At least one project is required');
    if (!window.confirm(`Delete project "${p.name}" and all its items? This cannot be undone.`)) return;
    await api.delete(`/projects/${p.id}`); await refresh(); toast.success('Project deleted');
  };

  return (
    <div className="space-y-5" data-testid="projects-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Projects</h1>
          <p className="text-sm text-slate-500">All costing projects. Open one to edit its components, quotation or settings.</p>
        </div>
        {canEdit && <Button onClick={() => setForm({ mode: 'new' })} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="btn-new-project"><Plus className="h-4 w-4 mr-1" />New project</Button>}
      </div>

      <div className="relative w-80">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search project, client…" className="pl-8 bg-white" data-testid="projects-search" />
      </div>

      {view.length === 0 && <Card className="p-12 text-center text-slate-500 border-slate-200"><FolderKanban className="h-8 w-8 mx-auto mb-2 text-slate-300" />No projects found.</Card>}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {view.map((p) => {
          const s = stats[p.id] || {};
          return (
            <Card key={p.id} className="p-5 border-slate-200 hover:border-slate-400 hover:shadow-md transition-all flex flex-col" data-testid={`project-card-${p.id}`}>
              <button onClick={() => open(p, '/app/costing')} className="text-left" data-testid={`project-open-${p.id}`}>
                <div className="font-semibold text-slate-900 text-lg leading-snug hover:underline">{p.name}</div>
                <div className="text-sm text-slate-500 mt-0.5">{p.client || 'No client'}</div>
                {p.description && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{p.description}</p>}
              </button>
              <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
                <div><div className="text-[10px] uppercase tracking-wider text-slate-500">Items</div><div className="fin font-semibold">{fmtNum(s.items || 0, 0)}</div></div>
                <div><div className="text-[10px] uppercase tracking-wider text-slate-500">Component</div><div className="fin font-semibold">{fmtAUD(s.component_cost || 0)}</div></div>
                <div><div className="text-[10px] uppercase tracking-wider text-slate-500">Selling</div><div className="fin font-semibold">{fmtAUD(s.selling_price || 0)}</div></div>
              </div>
              <div className="text-xs text-slate-400 mt-3">Updated {new Date(p.updated_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => open(p, '/app/costing')} data-testid={`project-rates-${p.id}`}><Table2 className="h-3.5 w-3.5 mr-1" />Costing</Button>
                <Button size="sm" variant="outline" onClick={() => open(p, '/app/quotation')} data-testid={`project-quote-${p.id}`}><FileText className="h-3.5 w-3.5 mr-1" />Quote</Button>
                <Button size="sm" variant="outline" onClick={() => open(p, '/app/settings')} data-testid={`project-settings-${p.id}`}><Settings2 className="h-3.5 w-3.5 mr-1" />Settings</Button>
                <div className="flex-1" />
                {canEdit && <button onClick={() => setForm({ mode: 'edit', project: p })} className="p-1.5 text-slate-400 hover:text-slate-900" title="Edit" data-testid={`project-edit-${p.id}`}><Pencil className="h-4 w-4" /></button>}
                {canEdit && <button onClick={() => duplicate(p)} className="p-1.5 text-slate-400 hover:text-slate-900" title="Duplicate" data-testid={`project-dup-${p.id}`}><Copy className="h-4 w-4" /></button>}
                {isAdmin && <button onClick={() => remove(p)} className="p-1.5 text-slate-400 hover:text-red-600" title="Delete" data-testid={`project-del-${p.id}`}><Trash2 className="h-4 w-4" /></button>}
              </div>
            </Card>
          );
        })}
      </div>

      <ProjectForm open={!!form} onOpenChange={(o) => !o && setForm(null)} initial={form?.project}
                   title={form?.mode === 'edit' ? 'Edit project' : 'New project'} onSave={save} />
    </div>
  );
}
