import React, { useEffect, useState } from 'react';
import { api, fmtAUD, fmtNum } from '@/lib/api';
import { useProjects } from '@/lib/projects';
import { Card } from '@/components/ui/card';
import { DownloadMenu } from '@/components/DownloadMenu';
import { ProjectPicker } from '@/components/ProjectPicker';

export default function Quotation() {
  const { current, projects, selectProject } = useProjects();
  const [q, setQ] = useState(null);

  useEffect(() => {
    if (!current) return;
    api.get(`/projects/${current.id}/quote`).then((r) => setQ(r.data));
  }, [current?.id]);

  if (!current || !q) return null;
  const p = q.project;


  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start" data-testid="quotation-layout">
    <div className="space-y-5 flex-1 min-w-0" data-testid="quotation-page">
      <div className="flex items-center justify-between">
        <div>
          <ProjectPicker />
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-3">Quotation Summary</h1>
          <p className="text-sm text-slate-500">{p.name} · {p.client}</p>
        </div>
        <DownloadMenu url={`/projects/${p.id}/export/quote`} filename={`${p.name}_quotation`} testid="quote-download" />
      </div>

      <Card className="p-8 border-slate-200 bg-white">
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 mb-6">
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">BIIG ENERGY</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Equipment Quotation</div>
          </div>
          <div className="text-right text-sm">
            <div className="text-xs uppercase tracking-wider text-slate-500">Quote date</div>
            <div className="font-medium">{new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div className="text-xs uppercase tracking-wider text-slate-500 mt-2">Currency</div>
            <div className="font-medium">{p.settings.currency}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Project</div>
            <div className="font-semibold text-slate-900">{p.name}</div>
            <div className="text-slate-600 mt-1">{p.description}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Client</div>
            <div className="font-semibold text-slate-900">{p.client || '—'}</div>
          </div>
        </div>

        <div className="table-scroll table-dark"><table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
              <th className="px-3 py-2 text-left w-12">#</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-right w-16">Qty</th>
              <th className="px-3 py-2 text-left w-14">UoM</th>
              <th className="px-3 py-2 text-right w-28">Unit (ex GST)</th>
              <th className="px-3 py-2 text-right w-32">Total (ex GST)</th>
            </tr>
          </thead>
          <tbody>
            {q.lines.map((l, i) => (
              <tr key={l.item_no} className={i % 2 ? 'bg-slate-50' : ''}>
                <td className="px-3 py-2 fin text-slate-500">{l.item_no}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900">{l.description}</div>
                  {(l.brand || l.part_no) && <div className="text-xs text-slate-500">{l.brand} {l.part_no && `· ${l.part_no}`}</div>}
                </td>
                <td className="px-3 py-2 fin text-right">{fmtNum(l.quantity, 0)}</td>
                <td className="px-3 py-2">{l.uom}</td>
                <td className="px-3 py-2 fin text-right">{fmtAUD(l.unit_cost)}</td>
                <td className="px-3 py-2 fin text-right font-semibold">{fmtAUD(l.total_ex_gst)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-900">
              <td colSpan={4} />
              <td className="px-3 py-2 text-right font-semibold">Subtotal (ex GST)</td>
              <td className="px-3 py-2 fin text-right font-semibold">{fmtAUD(q.subtotal_ex_gst)}</td>
            </tr>
            <tr className="bg-slate-50">
              <td colSpan={4} />
              <td className="px-3 py-2 text-right">GST ({(p.settings.gst_rate*100).toFixed(0)}%)</td>
              <td className="px-3 py-2 fin text-right">{fmtAUD(q.gst)}</td>
            </tr>
            <tr className="bg-slate-900 text-white">
              <td colSpan={4} />
              <td className="px-3 py-3 text-right font-bold uppercase tracking-wider text-xs">Total (inc GST)</td>
              <td className="px-3 py-3 fin text-right font-bold text-base" data-testid="total-inc-gst">{fmtAUD(q.total_inc_gst)}</td>
            </tr>
          </tfoot>
        </table></div>

        {p.notes && <Section title="Notes" text={p.notes} />}
        {p.exclusions && <Section title="Exclusions" text={p.exclusions} />}
        {p.terms && <Section title="Terms & Conditions" text={p.terms} />}
      </Card>
    </div>
    <ProjectPane projects={projects} currentId={current.id} onPick={selectProject} />
    </div>
  );
}

function ProjectPane({ projects, currentId, onPick }) {
  return (
    <aside className="w-full xl:w-72 shrink-0 xl:sticky xl:top-20" data-testid="quote-projects-pane">
      <Card className="border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">All projects ({projects.length})</div>
        <div className="max-h-[70vh] overflow-y-auto">
          {projects.map((p) => (
            <button key={p.id} onClick={() => onPick(p.id)} data-testid={`quote-project-${p.id}`}
                    className={`w-full text-left px-4 py-3 border-t border-slate-100 first:border-0 transition-colors ${p.id === currentId ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>
              <div className="text-sm font-medium leading-snug">{p.name}</div>
              <div className={`text-xs mt-0.5 ${p.id === currentId ? 'text-white/60' : 'text-slate-500'}`}>{p.client || 'No client'}</div>
            </button>
          ))}
        </div>
      </Card>
    </aside>
  );
}

function Section({ title, text }) {
  return (
    <div className="mt-6 pt-5 border-t border-slate-200">
      <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">{title}</div>
      <p className="text-sm text-slate-700 whitespace-pre-line">{text}</p>
    </div>
  );
}
