import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { LOGO } from '@/pages/Login';
import { Calculator, FileStack, UserCheck, ArrowUpRight, LogOut } from 'lucide-react';

const SYSTEMS = [
  { id: 'costing', name: 'Costing System', desc: 'Projects, component library, costing, quotations and reports.', icon: Calculator, to: '/app' },
  { id: 'documents', name: 'Document Control', desc: 'Controlled documents, revisions and approvals.', icon: FileStack },
  { id: 'employees', name: 'Employee Tracking System', desc: 'Staff records, attendance and site allocation.', icon: UserCheck },
];

export default function SystemHub() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="portal-bg min-h-screen text-white flex flex-col" data-testid="system-hub">
      <div className="portal-glow" />
      <header className="relative z-10 px-6 sm:px-10 py-6 flex items-center justify-between">
        <img src={LOGO} alt="BIIG ENERGY" className="h-12 w-auto rounded-md" />
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium" data-testid="hub-user-name">{user?.name}</div>
            <div className="text-xs text-white/50">{user?.email}</div>
          </div>
          <button onClick={() => { logout(); nav('/'); }} className="h-10 w-10 rounded-full border border-white/15 hover:bg-white/10 inline-flex items-center justify-center transition-colors" title="Log out" data-testid="hub-logout"><LogOut className="h-4 w-4" /></button>
        </div>
      </header>
      <main className="relative z-10 flex-1 px-6 sm:px-10 lg:px-20 py-10">
        <div className="portal-rise">
          <div className="text-xs uppercase tracking-[0.2em] text-red-400 font-semibold mb-4">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Choose a system</h1>
        </div>
        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {SYSTEMS.map((s, i) => <SystemTile key={s.id} s={s} i={i} onOpen={() => nav(s.to)} />)}
        </div>
      </main>
    </div>
  );
}

function SystemTile({ s, i, onOpen }) {
  const live = !!s.to;
  return (
    <button disabled={!live} onClick={onOpen} data-testid={`system-${s.id}`} style={{ animationDelay: `${150 + i * 90}ms` }}
            className={`portal-card portal-rise group text-left p-7 min-h-[260px] flex flex-col ${live ? 'hover:border-red-500/60 hover:-translate-y-1 cursor-pointer' : 'opacity-60 cursor-not-allowed'} transition-transform`}>
      <div className="flex items-start justify-between">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${live ? 'bg-red-600' : 'bg-white/10'}`}><s.icon className="h-6 w-6" /></div>
        {live ? <ArrowUpRight className="h-5 w-5 text-white/40 group-hover:text-white transition-colors" />
              : <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/20 text-white/60" data-testid={`system-${s.id}-soon`}>Coming soon</span>}
      </div>
      <div className="mt-auto">
        <div className="text-xl font-semibold tracking-tight">{s.name}</div>
        <p className="text-sm text-white/50 mt-2">{s.desc}</p>
      </div>
    </button>
  );
}
