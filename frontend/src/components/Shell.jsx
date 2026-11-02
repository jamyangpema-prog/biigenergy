import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useProjects } from '@/lib/projects';
import { LayoutDashboard, Table2, Settings, FileText, BarChart3, LogOut, Users, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const LOGO = 'https://customer-assets-jt897jd0.emergentagent.net/job_equipquote--13ttmu53/artifacts/57e4a1b4741c1c06_LOGO%20BE.png';

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/costing', label: 'Equipment Costing', icon: Table2 },
  { to: '/app/quotation', label: 'Quotation', icon: FileText },
  { to: '/app/reports', label: 'Reports', icon: BarChart3 },
  { to: '/app/settings', label: 'Costing Settings', icon: Settings },
];

export default function Shell() {
  const { user, logout, can } = useAuth();
  const { projects, currentId, selectProject } = useProjects();
  const nav = useNavigate();

  const roleBadge = {
    admin: 'bg-slate-900 text-white',
    estimator: 'bg-blue-100 text-blue-800',
    viewer: 'bg-slate-200 text-slate-700',
  }[user?.role || 'viewer'];

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 shrink-0 bg-slate-900 text-slate-200 flex flex-col fixed inset-y-0 left-0" data-testid="sidebar">
        <div className="px-5 py-5 border-b border-slate-800 flex items-center gap-3">
          <img src={LOGO} alt="BIIG ENERGY" className="h-10 w-10 rounded object-cover ring-2 ring-red-600/40" />
          <div>
            <div className="text-white font-semibold leading-tight">BIIG ENERGY</div>
            <div className="text-xs text-slate-400">Costing & Quotations</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to} to={n.to} end={n.end}
              data-testid={`nav-${n.label.toLowerCase().replace(/ /g, '-')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ? 'bg-slate-800 text-white border-l-2 border-red-600 pl-[10px]'
                           : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
          {can('manage_users') && (
            <NavLink to="/app/users" data-testid="nav-users"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ? 'bg-slate-800 text-white border-l-2 border-red-600 pl-[10px]'
                           : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Users className="h-4 w-4" /> Users
            </NavLink>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">v1.0 · AUD</div>
      </aside>

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Project</span>
            <Select value={currentId || ''} onValueChange={selectProject}>
              <SelectTrigger className="w-80 bg-white border-slate-200" data-testid="project-selector">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900" data-testid="user-name">{user?.name}</div>
              <div className="text-xs text-slate-500">{user?.email}</div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleBadge}`} data-testid="role-badge">
              {user?.role?.toUpperCase()}
            </span>
            <button
              onClick={() => { logout(); nav('/login'); }}
              data-testid="logout-btn"
              className="text-slate-500 hover:text-slate-900 p-2 rounded hover:bg-slate-100"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
