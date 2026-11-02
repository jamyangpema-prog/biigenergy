import React, { useEffect, useState } from 'react';
import { api, fmtAUD, fmtNum } from '@/lib/api';
import { useProjects } from '@/lib/projects';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Package, Wrench, Receipt, FolderKanban } from 'lucide-react';

function Row({ label, value, strong, testid }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`fin text-sm ${strong ? 'font-semibold text-slate-900' : 'text-slate-800'}`} data-testid={testid}>{value}</span>
    </div>
  );
}

function Block({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-red-600" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">{title}</h4>
      </div>
      {children}
    </div>
  );
}

export function ComponentDetails({ itemId, onClose }) {
  const { selectProject } = useProjects();
  const [d, setD] = useState(null);

  useEffect(() => {
    if (!itemId) { setD(null); return; }
    api.get(`/items/${itemId}/details`).then((r) => setD(r.data));
  }, [itemId]);

  const it = d?.item;
  const groups = Object.values((d?.usage || []).reduce((acc, u) => {
    const g = acc[u.project_id] || (acc[u.project_id] = { project_id: u.project_id, project_name: u.project_name, items: [], qty: 0, sp: 0 });
    g.items.push(u.item_no); g.qty += u.quantity; g.sp += u.selling_price;
    return acc;
  }, {}));
  return (
    <Sheet open={!!itemId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-slate-50" data-testid="component-details">
        {!it ? <div className="p-6 text-slate-500">Loading…</div> : (
          <div className="space-y-4">
            <SheetHeader>
              <div className="text-xs uppercase tracking-wider text-red-600 font-semibold">Item #{it.item_no}</div>
              <SheetTitle className="text-left text-lg leading-snug" data-testid="details-description">{it.description || 'Untitled component'}</SheetTitle>
              <SheetDescription className="text-left">
                Project: <span className="font-medium text-slate-900" data-testid="details-project">{d.project_name}</span>
              </SheetDescription>
            </SheetHeader>

            <Block icon={Package} title="Component">
              <Row label="Brand" value={it.brand || '—'} testid="details-brand" />
              <Row label="Part number" value={it.part_no || '—'} testid="details-part-no" />
              <Row label="Supplier" value={it.supplier || '—'} testid="details-supplier" />
              <Row label="Rate (1 component)" value={fmtAUD(it.rate)} strong testid="details-rate" />
              <Row label={`Freight (${(it.effective_freight_pct * 100).toFixed(1)}%)`} value={fmtAUD(it.freight)} />
              <Row label={`Margin (${(it.effective_margin_pct * 100).toFixed(1)}%)`} value={fmtAUD(it.margin)} />
              <Row label="Component cost (1 component)" value={fmtAUD(it.component_cost)} strong testid="details-cc" />
              <Row label="Quantity" value={fmtNum(it.quantity, 0)} />
              <Row label="Total component cost" value={fmtAUD(it.total_component_cost)} strong testid="details-tcc" />
            </Block>

            <Block icon={Wrench} title="Installation">
              <Row label="Install hours" value={`${fmtNum(it.install_hrs, 2)} hr`} />
              <Row label="Wiring hours" value={`${fmtNum(it.wiring_hrs, 2)} hr`} />
              <Row label="Total hours" value={`${fmtNum(it.total_install_hrs, 2)} hr`} />
              <Row label="Labour rate" value={`${fmtAUD(it.effective_labour_rate)}/hr`} />
              <Row label="Installation cost" value={fmtAUD(it.labour_cost)} strong testid="details-install-cost" />
            </Block>

            <div className="rounded-lg bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><Receipt className="h-4 w-4 text-red-400" /><span className="text-sm">Selling price (ex GST)</span></div>
              <span className="fin text-lg font-semibold" data-testid="details-sp">{fmtAUD(it.selling_price)}</span>
            </div>

            <Block icon={FolderKanban} title={`Used in projects (matched by ${d.matched_by === 'part_no' ? 'part number' : 'description'})`}>
              {groups.map((g) => (
                <button key={g.project_id} onClick={() => { selectProject(g.project_id); onClose(); }}
                        className="w-full flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-left hover:bg-slate-50 px-1 rounded"
                        data-testid={`details-usage-${g.project_id}`}>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{g.project_name}</div>
                    <div className="text-xs text-slate-500">Total qty {fmtNum(g.qty, 0)} · Item #{g.items.join(', #')}</div>
                  </div>
                  <span className="fin text-sm text-slate-800">{fmtAUD(g.sp)}</span>
                </button>
              ))}
            </Block>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
