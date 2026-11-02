import React, { useEffect, useState } from 'react';
import { api, fmtAUD, fmtNum } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Package, DollarSign, Truck, TrendingUp, Clock, Wrench, Receipt, FolderKanban, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

function KPI({ icon: Icon, label, value, hint, testid }) {
  return (
    <Card className="p-5 border-slate-200 bg-white" data-testid={testid}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</div>
        <div className="h-8 w-8 rounded-md bg-slate-900 text-white flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 fin text-2xl font-semibold text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </Card>
  );
}

const COLORS = ['#0F172A', '#334155', '#64748B', '#94A3B8', '#DC2626', '#2563EB'];

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then((r) => setData(r.data));
  }, []);

  if (!data) {
    return <div className="space-y-4">
      {[0,1,2,3].map((i) => <div key={i} className="animate-pulse bg-slate-200 h-24 rounded-lg" />)}
    </div>;
  }

  const t = data.totals;
  const chartData = data.per_project.map((p) => ({ name: p.name.slice(0, 20), 'Selling Price': p.selling_price, 'Component Cost': p.component_cost, 'Labour': p.labour_cost }));
  const pieData = [
    { name: 'Component Cost', value: t.component_cost },
    { name: 'Labour Cost', value: t.labour_cost },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500">Portfolio-level costing overview across every project.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPI icon={FolderKanban} label="Projects" value={t.projects} testid="kpi-projects" />
        <KPI icon={Package} label="Equipment Items" value={t.items} testid="kpi-items" />
        <KPI icon={Layers} label="Total Quantity" value={fmtNum(t.quantity, 0)} testid="kpi-qty" />
        <KPI icon={Clock} label="Install Hours" value={fmtNum(t.install_hrs, 1)} testid="kpi-hours" />
        <KPI icon={Receipt} label="Selling Price (ex GST)" value={fmtAUD(t.selling_price)} testid="kpi-sp" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={DollarSign} label="Component Cost" value={fmtAUD(t.component_cost)} testid="kpi-cc" />
        <KPI icon={Truck} label="Freight (total)" value={fmtAUD(t.freight)} testid="kpi-freight" />
        <KPI icon={TrendingUp} label="Margin (total)" value={fmtAUD(t.margin)} testid="kpi-margin" />
        <KPI icon={Wrench} label="Labour Cost" value={fmtAUD(t.labour_cost)} testid="kpi-labour" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Project comparison</h3>
            <span className="text-xs text-slate-500">AUD</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
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
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v) => fmtAUD(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
