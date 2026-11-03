import React, { useEffect, useState } from 'react';
import { api, fmtAUD, fmtNum } from '@/lib/api';
import { useProjects } from '@/lib/projects';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { LineDetails } from '@/components/LineDetails';
import { ProjectPicker } from '@/components/ProjectPicker';
import { useSearchParams } from 'react-router-dom';
import { DownloadMenu } from '@/components/DownloadMenu';

export default function Reports() {
  const { current, projects } = useProjects();
  const [items, setItems] = useState([]);
  const [all, setAll] = useState({}); // per-project items
  const [detailId, setDetailId] = useState(null);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'costing';
  const [rev, setRev] = useState(0);

  useEffect(() => {
    if (!current) return;
    api.get(`/projects/${current.id}/items`).then((r) => setItems(r.data));
  }, [current?.id, rev]);

  useEffect(() => {
    Promise.all(projects.map((p) => api.get(`/projects/${p.id}/items`).then((r) => [p.id, r.data])))
      .then((xs) => setAll(Object.fromEntries(xs)));
  }, [projects, rev]);

  if (!current) return null;

  const sumBy = (arr, key) => arr.reduce((a, i) => a + (i[key] || 0), 0);

  const compareData = projects.map((p) => {
    const list = all[p.id] || [];
    return {
      name: p.name.slice(0, 24),
      'Component Cost': sumBy(list, 'total_component_cost'),
      'Labour Cost': sumBy(list, 'labour_cost'),
      'Selling Price': sumBy(list, 'selling_price'),
    };
  });

  return (
    <div className="space-y-5" data-testid="reports-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <ProjectPicker />
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-3">Reports</h1>
          <p className="text-sm text-slate-500">Analytical breakdowns for {current.name}, with project comparison. Click any component for full details.</p>
        </div>
        <DownloadMenu url={`/projects/${current.id}/export/report?tab=${tab}`} filename={tab === 'compare' ? 'Project_Comparison_report' : `${current.name}_${tab}_report`} testid="reports-download" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })} className="w-full">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="costing" data-testid="tab-costing">Equipment Costing</TabsTrigger>
          <TabsTrigger value="component" data-testid="tab-component">Component Cost</TabsTrigger>
          <TabsTrigger value="labour" data-testid="tab-labour">Install & Labour</TabsTrigger>
          <TabsTrigger value="sp" data-testid="tab-sp">Selling Price</TabsTrigger>
          <TabsTrigger value="compare" data-testid="tab-compare">Project Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="costing">
          <ReportTable onRowClick={setDetailId} items={items} columns={[
            ['item_no', '#', 'int'], ['description', 'Description'], ['brand', 'Brand'], ['quantity', 'Qty', 'num'],
            ['rate', 'Rate', 'aud'], ['freight', 'Freight', 'aud'], ['margin', 'Margin', 'aud'],
            ['component_cost', 'CC', 'aud'], ['total_component_cost', 'TCC', 'aud'],
            ['labour_cost', 'Labour', 'aud'], ['selling_price', 'SP', 'aud'],
          ]} />
        </TabsContent>

        <TabsContent value="component">
          <ReportTable onRowClick={setDetailId} items={items} columns={[
            ['item_no', '#', 'int'], ['description', 'Description'], ['quantity', 'Qty', 'num'],
            ['rate', 'Rate', 'aud'], ['freight', 'Freight', 'aud'], ['margin', 'Margin', 'aud'],
            ['component_cost', 'Comp Cost', 'aud'], ['total_component_cost', 'Total CC', 'aud'],
          ]} />
        </TabsContent>

        <TabsContent value="labour">
          <ReportTable onRowClick={setDetailId} items={items} columns={[
            ['item_no', '#', 'int'], ['description', 'Description'],
            ['install_hrs', 'Install hr', 'num'], ['wiring_hrs', 'Wiring hr', 'num'],
            ['total_install_hrs', 'Total hr', 'num'], ['effective_labour_rate', '$/hr', 'aud'],
            ['labour_cost', 'Labour Cost', 'aud'],
          ]} />
        </TabsContent>

        <TabsContent value="sp">
          <ReportTable onRowClick={setDetailId} items={items} columns={[
            ['item_no', '#', 'int'], ['description', 'Description'], ['quantity', 'Qty', 'num'],
            ['total_component_cost', 'TCC', 'aud'], ['labour_cost', 'Labour', 'aud'],
            ['selling_price', 'Selling Price', 'aud'],
          ]} />
        </TabsContent>

        <TabsContent value="compare">
          <Card className="p-5 border-slate-200">
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={compareData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmtAUD(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Component Cost" fill="#334155" radius={[4,4,0,0]} />
                <Bar dataKey="Labour Cost" fill="#DC2626" radius={[4,4,0,0]} />
                <Bar dataKey="Selling Price" fill="#0F172A" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="mt-4 border-slate-200 overflow-hidden">
            <div className="table-scroll"><table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left">Project</th>
                  <th className="px-4 py-2 text-right">Items</th>
                  <th className="px-4 py-2 text-right">Component Cost</th>
                  <th className="px-4 py-2 text-right">Labour Cost</th>
                  <th className="px-4 py-2 text-right">Selling Price</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const list = all[p.id] || [];
                  return (
                    <tr key={p.id} className="border-t border-slate-200">
                      <td className="px-4 py-2 font-medium text-slate-900">{p.name}</td>
                      <td className="px-4 py-2 fin text-right">{list.length}</td>
                      <td className="px-4 py-2 fin text-right">{fmtAUD(sumBy(list, 'total_component_cost'))}</td>
                      <td className="px-4 py-2 fin text-right">{fmtAUD(sumBy(list, 'labour_cost'))}</td>
                      <td className="px-4 py-2 fin text-right font-semibold">{fmtAUD(sumBy(list, 'selling_price'))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </Card>
        </TabsContent>
      </Tabs>
      <LineDetails itemId={detailId} onClose={() => setDetailId(null)} onSaved={() => setRev((v) => v + 1)} />
    </div>
  );
}

function ReportTable({ items, columns, onRowClick }) {
  const totals = {};
  columns.forEach(([k, _, type]) => { if (type === 'aud' || type === 'num') totals[k] = items.reduce((a, i) => a + (i[k] || 0), 0); });
  const fmt = (v, type) => type === 'aud' ? fmtAUD(v) : type === 'num' ? fmtNum(v, 2) : type === 'int' ? v : (v ?? '');
  return (
    <Card className="border-slate-200 overflow-hidden">
      <div className="table-scroll">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>{columns.map(([k, label, type]) => <th key={k} className={`px-3 py-2 ${type ? 'text-right' : 'text-left'}`}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} onClick={() => onRowClick(it.id)} className="border-t border-slate-200 even:bg-slate-50/50 hover:bg-slate-100 cursor-pointer" data-testid={`report-row-${it.item_no}`}>
                {columns.map(([k, _, type]) => (
                  <td key={k} className={`px-3 py-2 ${type ? 'fin text-right' : 'text-slate-800'}`}>{fmt(it[k], type)}</td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold">
              {columns.map(([k, _, type], i) => (
                <td key={k} className={`px-3 py-2 ${type ? 'fin text-right' : ''}`}>
                  {i === 0 ? 'Total' : type ? fmt(totals[k], type) : ''}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
