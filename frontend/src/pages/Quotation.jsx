import React, { useEffect, useState } from 'react';
import { api, fmtAUD, fmtNum } from '@/lib/api';
import { useProjects } from '@/lib/projects';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import { ProjectPicker } from '@/components/ProjectPicker';

export default function Quotation() {
  const { current } = useProjects();
  const [q, setQ] = useState(null);

  useEffect(() => {
    if (!current) return;
    api.get(`/projects/${current.id}/quote`).then((r) => setQ(r.data));
  }, [current?.id]);

  if (!current || !q) return null;
  const p = q.project;

  const exportPDF = async () => {
    const r = await api.get(`/projects/${p.id}/export/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(r.data); const a = document.createElement('a');
    a.href = url; a.download = `${p.name}_quote.pdf`; a.click(); URL.revokeObjectURL(url);
  };
  const exportXL = async () => {
    const r = await api.get(`/projects/${p.id}/export/excel`, { responseType: 'blob' });
    const url = URL.createObjectURL(r.data); const a = document.createElement('a');
    a.href = url; a.download = `${p.name}.xlsx`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 max-w-5xl" data-testid="quotation-page">
      <div className="flex items-center justify-between">
        <div>
          <ProjectPicker />
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-3">Quotation Summary</h1>
          <p className="text-sm text-slate-500">{p.name} · {p.client}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportXL} data-testid="q-export-xl"><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
          <Button onClick={exportPDF} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="q-export-pdf"><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
        </div>
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

        <table className="w-full text-sm">
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
        </table>

        {p.notes && <Section title="Notes" text={p.notes} />}
        {p.exclusions && <Section title="Exclusions" text={p.exclusions} />}
        {p.terms && <Section title="Terms & Conditions" text={p.terms} />}
      </Card>
    </div>
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
