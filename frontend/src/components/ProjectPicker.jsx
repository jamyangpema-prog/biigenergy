import React from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '@/lib/projects';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderKanban } from 'lucide-react';
import { confirmLeave } from '@/lib/unsaved';

export function ProjectPicker({ onChange }) {
  const { projects, currentId, selectProject } = useProjects();
  return (
    <div className="flex items-center gap-2" data-testid="project-picker">
      <Select value={currentId || ''} onValueChange={(id) => { if (!confirmLeave()) return; selectProject(id); onChange?.(id); }}>
        <SelectTrigger className="w-72 bg-white border-slate-200" data-testid="project-selector">
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Link to="/app/projects" onClick={(e) => { if (!confirmLeave()) e.preventDefault(); }} className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1" data-testid="manage-projects-link">
        <FolderKanban className="h-3.5 w-3.5" /> Manage
      </Link>
    </div>
  );
}
