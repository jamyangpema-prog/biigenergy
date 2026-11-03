import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '@/lib/projects';
import { ArrowRight } from 'lucide-react';
import { api, fmtAUD, fmtNum } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Package, DollarSign, Truck, TrendingUp, Clock, Wrench, Receipt, FolderKanban, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

function KPI({ icon: Icon, label, value, hint, testid, to }) {
  const nav = useNavigate();
  return (
    <Card onClick={() => nav(to)} className="p-5 border-slate-200 bg-white cursor-pointer hover:border-slate-400 hover:shadow-md transition-all group" data-testid={testid}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</div>
        <div className="h-8 w-8 rounded-md bg-slate-900 text-white flex items-center justify-center group-hover:bg-red-600 transition-colors">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 fin text-2xl font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-400 mt-1 inline-flex items-center gap-1 group-hover:text-slate-700">{hint || 'View details'} <ArrowRight className="h-3 w-3" /></div>
    </Card>
  );
}

const COLORS = ['#0F172A', '#334155', '#64748B', '#94A3B8', '#DC2626', '#2563EB'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const nav = useNavigate();
  const { selectProject } = useProjects();
  const openProject = (id) => { if (id) { selectProject(id); nav('/app/costing'); } };

  useEffect(() => {
    api.get('/dashboard').then((r) => setData(r.data));
  }, []);

  if (!data) {
    return <div className="space-y-4">
      {[0,1,2,3].map((i) => <div key={i} className="animate-pulse bg-slate-200 h-24 rounded-lg" />)}
    </div>;
  }

  const t = data.totals;
  const chartData = data.per_project.map((p) => ({ id: p.id, name: p.name.slice(0, 20), 'Selling Price': p.selling_price, 'Component Cost': p.component_cost, 'Labour': p.labour_cost }));
  const pieData = [
    { name: 'Component Cost', value: t.component_cost, to: '/app/reports?tab=component' },
    { name: 'Labour Cost', value: t.labour_cost, to: '/app/reports?tab=labour' },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500">Portfolio-level costing overview across every project.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPI icon={FolderKanban} label="Projects" value={t.projects} testid="kpi-projects" to="/app/projects" hint="Open projects" />
        <KPI icon={Package} label="Equipment Items" value={t.items} testid="kpi-items" to="/app/library" hint="Open Component Library" />
        <KPI icon={Layers} label="Total Quantity" value={fmtNum(t.quantity, 0)} testid="kpi-qty" to="/app/library" hint="Open Component Library" />
        <KPI icon={Clock} label="Install Hours" value={fmtNum(t.install_hrs, 1)} testid="kpi-hours" to="/app/reports?tab=labour" hint="Install & labour report" />
        <KPI icon={Receipt} label="Selling Price (ex GST)" value={fmtAUD(t.selling_price)} testid="kpi-sp" to="/app/reports?tab=compare" hint="Project comparison" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={DollarSign} label="Component Cost" value={fmtAUD(t.component_cost)} testid="kpi-cc" to="/app/reports?tab=component" hint="Component cost report" />
        <KPI icon={Truck} label="Freight (total)" value={fmtAUD(t.freight)} testid="kpi-freight" to="/app/reports?tab=component" hint="Freight by component" />
        <KPI icon={TrendingUp} label="Margin (total)" value={fmtAUD(t.margin)} testid="kpi-margin" to="/app/reports?tab=component" hint="Margin by component" />
        <KPI icon={Wrench} label="Labour Cost" value={fmtAUD(t.labour_cost)} testid="kpi-labour" to="/app/reports?tab=labour" hint="Install & labour report" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Project comparison</h3>
            <span className="text-xs text-slate-500">Click a bar to open the project</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} onClick={(e) => openProject(e?.activePayload?.[0]?.payload?.id)} style={{ cursor: 'pointer' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmtAUD(v)} contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Component Cost" fill="#334155" radius={[4,4,0,0]} />
              <Bar dataKey="Labour" fill="#DC2626" radius={[4,4,0,0]} />
              <Bar dataKey="Selling Price" fill="#0F172A" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Cost breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} onClick={(d) => nav(d.to || d.payload?.to)} style={{ cursor: 'pointer' }}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v) => fmtAUD(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="border-slate-200 overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Projects</h3>
          <button onClick={() => nav('/app/projects')} className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1" data-testid="dash-all-projects">All projects <ArrowRight className="h-3 w-3" /></button>
        </div>
        <div className="table-scroll"><table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="px-5 py-2 text-left">Project</th><th className="px-5 py-2 text-right">Items</th><th className="px-5 py-2 text-right">Component Cost</th><th className="px-5 py-2 text-right">Labour</th><th className="px-5 py-2 text-right">Selling Price</th><th className="w-10" /></tr>
          </thead>
          <tbody>
            {data.per_project.map((p) => (
              <tr key={p.id} onClick={() => openProject(p.id)} className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer" data-testid={`dash-project-${p.id}`}>
                <td className="px-5 py-3 font-medium text-slate-900">{p.name}</td>
                <td className="px-5 py-3 fin text-right">{p.items}</td>
                <td className="px-5 py-3 fin text-right">{fmtAUD(p.component_cost)}</td>
                <td className="px-5 py-3 fin text-right">{fmtAUD(p.labour_cost)}</td>
                <td className="px-5 py-3 fin text-right font-semibold">{fmtAUD(p.selling_price)}</td>
                <td className="px-3 text-slate-400"><ArrowRight className="h-4 w-4" /></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </Card>
    </div>
  );
}
