import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmtAUD, fmtNum } from '@/lib/api';
import { useProjects } from '@/lib/projects';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Search, Eye, Pencil } from 'lucide-react';
import { ProjectForm } from '@/pages/Projects';

export default function CostingStart() {
  const { projects, selectProject, refresh } = useProjects();
  const { user } = useAuth();
  const nav = useNavigate();
  const canEdit = user?.role === 'admin' || user?.role === 'estimator';
  const [stats, setStats] = useState({});
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then((r) => setStats(Object.fromEntries(r.data.per_project.map((p) => [p.id, p]))));
  }, [projects]);

  const view = useMemo(() => {
    const s = q.toLowerCase();
    return [...projects]
      .filter((p) => !s || [p.name, p.client, p.description].some((v) => (v || '').toLowerCase().includes(s)))
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  }, [projects, q]);

  const open = (id) => { selectProject(id); nav(`/app/costing/${id}`); };
  const save = async (f) => {
    try {
      let id = form.project?.id;
      if (form.mode === 'new') id = (await api.post('/projects', f)).data.id;
      else await api.put(`/projects/${id}`, { ...form.project, ...f });
      await refresh();
      toast.success(form.mode === 'new' ? 'Project created' : 'Project updated');
      setForm(null); open(id);
    } catch { toast.error('Could not save project'); }
  };

  return (
    <div className="space-y-5" data-testid="costing-start">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Costing</h1>
        <p className="text-sm text-slate-500">Start a new project or open an earlier one to view or edit its costing.</p>
      </div>
      <div className="relative w-80">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search project, client…" className="pl-8 bg-white" data-testid="costing-start-search" />
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {canEdit && (
          <button onClick={() => setForm({ mode: 'new' })} data-testid="costing-start-new"
                  className="rounded-lg border-2 border-dashed border-slate-300 hover:border-red-600 hover:bg-white transition-colors p-5 flex flex-col items-center justify-center text-slate-600 hover:text-slate-900 min-h-[200px]">
            <Plus className="h-8 w-8 mb-2" />
            <div className="font-semibold">Create new project</div>
            <div className="text-xs text-slate-500 mt-1">Start a fresh costing</div>
          </button>
        )}
        {view.map((p) => <StartCard key={p.id} p={p} s={stats[p.id] || {}} canEdit={canEdit}
                                    onView={() => open(p.id)} onEdit={() => setForm({ mode: 'edit', project: p })} />)}
      </div>
      {view.length === 0 && <div className="text-sm text-slate-500" data-testid="costing-start-empty">No projects found.</div>}
      <ProjectForm open={!!form} onOpenChange={(o) => !o && setForm(null)} initial={form?.project}
                   title={form?.mode === 'edit' ? 'Edit project' : 'New project'} onSave={save} />
    </div>
  );
}

function StartCard({ p, s, canEdit, onView, onEdit }) {
  return (
    <Card className="p-5 border-slate-200 hover:border-slate-400 hover:shadow-md transition-shadow flex flex-col" data-testid={`costing-start-card-${p.id}`}>
      <div className="font-semibold text-slate-900 text-lg leading-snug">{p.name}</div>
      <div className="text-sm text-slate-500 mt-0.5">{p.client || 'No client'}</div>
      {p.description && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{p.description}</p>}
      <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
        <div><div className="text-[10px] uppercase tracking-wider text-slate-500">Items</div><div className="fin font-semibold">{fmtNum(s.items || 0, 0)}</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-slate-500">Selling</div><div className="fin font-semibold">{fmtAUD(s.selling_price || 0)}</div></div>
      </div>
      <div className="mt-auto pt-4 flex gap-2">
        <Button size="sm" onClick={onView} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid={`costing-start-view-${p.id}`}><Eye className="h-3.5 w-3.5 mr-1" />View</Button>
        {canEdit && <Button size="sm" variant="outline" onClick={onEdit} data-testid={`costing-start-edit-${p.id}`}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>}
      </div>
    </Card>
  );
}
