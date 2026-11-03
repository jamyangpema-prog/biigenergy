import React, { useEffect, useMemo, useState } from 'react';
import { api, fmtAUD, fmtNum } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { RefreshCw, PlugZap, Search, ChevronDown, ChevronRight, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';

const fmtTime = (s) => (s ? new Date(s).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

function StatusCard({ status, canEdit, onRefresh, refreshing }) {
  const last = status?.last_run;
  return (
    <Card className="p-5 border-slate-200 flex flex-wrap items-center justify-between gap-4" data-testid="feed-status">
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-md flex items-center justify-center ${status?.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {status?.configured ? <CheckCircle2 className="h-5 w-5" /> : <PlugZap className="h-5 w-5" />}
        </div>
        <div>
          <div className="font-semibold text-slate-900" data-testid="feed-connection">{status?.configured ? `Connected to ${status.source}` : `${status?.source || 'Supplier feed'} not connected yet`}</div>
          <div className="text-sm text-slate-500">
            {status?.configured ? 'Prices and stock are checked automatically every day at 6:00am Perth time.' : 'Add your Nexar keys to start pulling live distributor prices and stock.'}
          </div>
          {last && (
            <div className="text-xs text-slate-500 mt-1" data-testid="feed-last-run">
              Last check: {fmtTime(last.finished_at || last.started_at)} · {last.status}
              {last.status === 'done' && ` · ${last.matched}/${last.requested} parts found`}
              {last.status === 'failed' && <span className="text-red-600"> · {last.error}</span>}
            </div>
          )}
        </div>
      </div>
      {canEdit && status?.configured && (
        <Button onClick={onRefresh} disabled={refreshing} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="feed-refresh-btn">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />{refreshing ? 'Checking prices…' : 'Check prices now'}
        </Button>
      )}
    </Card>
  );
}

function PriceRow({ r, canEdit, onApplied }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const f = r.feed;
  const rate = r.max_rate;
  const live = f?.best_price;
  const diff = live && rate ? ((live - rate) / rate) * 100 : null;
  const key = (r.supplier || '').trim().split(/\s+/)[0]?.toLowerCase();
  const mine = key ? (f?.offers || []).find((o) => o.distributor.toLowerCase().startsWith(key)) : null;
  const apply = async (price) => {
    if (!window.confirm(`Set the rate for ${r.part_no} to ${fmtAUD(price)} on every line in every project?`)) return;
    setBusy(true);
    try { const { data } = await api.post('/feeds/apply', { item_id: r.item_id, price }); toast.success(`Rate updated on ${data.updated} line${data.updated === 1 ? '' : 's'}`); onApplied(); }
    catch (e) { toast.error(e?.response?.data?.detail || 'Could not apply price'); } finally { setBusy(false); }
  };
  return (
    <>
      <tr className="border-t border-slate-200 hover:bg-slate-50" data-testid={`feed-row-${r.part_no}`}>
        <td className="px-2 py-2 text-slate-400">
          {f?.offers?.length > 0 && <button onClick={() => setOpen(!open)} data-testid={`feed-expand-${r.part_no}`}>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>}
        </td>
        <td className="px-3 py-2"><div className="font-medium text-slate-900">{r.description}</div><div className="text-xs text-slate-500">{r.brand || '—'} · {r.supplier || '—'}</div></td>
        <td className="px-3 py-2 fin">{r.part_no}</td>
        <td className="px-3 py-2 fin text-right">{r.min_rate === r.max_rate ? fmtAUD(rate) : `${fmtAUD(r.min_rate)} – ${fmtAUD(r.max_rate)}`}</td>
        <td className="px-3 py-2 fin text-right" data-testid={`feed-mine-${r.part_no}`}>
          {mine ? <>{fmtAUD(mine.price)}<div className="text-xs text-slate-500">{mine.distributor} · stock {mine.stock == null ? '?' : fmtNum(mine.stock, 0)}</div></> : <span className="text-slate-400">—</span>}
        </td>
        <td className="px-3 py-2 fin text-right font-semibold text-slate-900">
          {!f ? <span className="text-slate-400 font-normal">Not checked</span> : !f.matched ? <span className="text-slate-400 font-normal">No match</span> : live == null ? <span className="text-slate-400 font-normal">No AUD price</span> : fmtAUD(live)}
          {f?.best_distributor && <div className="text-xs font-normal text-slate-500">{f.best_distributor}</div>}
        </td>
        <td className="px-3 py-2 fin text-right">{!f?.matched ? '—' : !f.offers?.length ? <span className="text-slate-400">No offers</span> : f.total_stock > 0 ? fmtNum(f.total_stock, 0) : <span className="text-red-600">Out of stock</span>}</td>
        <td className="px-3 py-2 fin text-right">
          {diff == null ? '—' : <span className={diff > 0.5 ? 'text-red-600' : diff < -0.5 ? 'text-emerald-700' : 'text-slate-600'}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}%</span>}
        </td>
        <td className="px-3 py-2 text-right">
          {canEdit && live != null && Math.abs(diff ?? 0) > 0.05 && (
            <Button size="sm" variant="outline" onClick={() => apply(live)} disabled={busy} data-testid={`feed-apply-${r.part_no}`}>Apply best</Button>
          )}
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50/70"><td colSpan={9} className="px-10 py-3">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Distributor offers · checked {fmtTime(f.fetched_at)}</div>
          <div className="grid md:grid-cols-3 gap-2">
            {f.offers.map((o, i) => (
              <div key={i} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-between"><span className="font-medium text-slate-900">{o.distributor}</span>
                  {o.url && <a href={o.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-900"><ExternalLink className="h-3.5 w-3.5" /></a>}</div>
                <div className="fin mt-1">{fmtAUD(o.price)} <span className="text-slate-500">· stock {o.stock == null ? 'unknown' : fmtNum(o.stock, 0)} · MOQ {o.moq ?? '—'}</span></div>
                {canEdit && Math.abs(o.price - rate) > 0.005 && (
                  <button onClick={() => apply(o.price)} disabled={busy} className="mt-2 text-xs font-medium text-slate-700 hover:text-slate-900 underline" data-testid={`feed-use-${r.part_no}-${i}`}>Use this price</button>
                )}
              </div>
            ))}
          </div>
        </td></tr>
      )}
    </>
  );
}

export default function SupplierPrices() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'estimator';
  const [status, setStatus] = useState(null);
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [s, p] = await Promise.all([api.get('/feeds/status'), api.get('/feeds/prices')]);
    setStatus(s.data); setRows(p.data);
    return s.data;
  };
  useEffect(() => { load(); }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await api.post('/feeds/refresh');
      for (let i = 0; i < 40; i++) {
        await new Promise((res) => setTimeout(res, 3000));
        const s = await load();
        if (!['queued', 'running'].includes(s.last_run?.status)) break;
      }
      toast.success('Supplier prices updated');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Price check failed'); } finally { setRefreshing(false); }
  };

  const view = useMemo(() => {
    const s = q.toLowerCase();
    return (rows || []).filter((r) => !s || [r.description, r.brand, r.part_no, r.supplier].some((v) => (v || '').toLowerCase().includes(s)));
  }, [rows, q]);
  const changed = view.filter((r) => r.feed?.best_price && Math.abs(r.feed.best_price - r.max_rate) / (r.max_rate || 1) > 0.005).length;

  return (
    <div className="space-y-5" data-testid="supplier-prices-page">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Supplier Prices</h1>
        <p className="text-sm text-slate-500">Live distributor prices (AUD, quantity 1, ex GST) and stock for every component with a part number. Review and apply changes to keep your rates current.</p>
      </div>
      <StatusCard status={status} canEdit={canEdit} onRefresh={refresh} refreshing={refreshing} />
      {changed > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-sm px-4 py-3 flex items-center gap-2" data-testid="feed-changed-banner">
          <AlertTriangle className="h-4 w-4" /> {changed} component{changed === 1 ? '' : 's'} differ from the latest supplier price.
        </div>
      )}
      <Card className="border-slate-200 overflow-hidden">
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="relative w-80">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search part, brand, supplier…" className="pl-8" data-testid="feed-search" />
          </div>
          <div className="text-xs text-slate-500">{view.length} parts with part numbers</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="feed-table">
            <thead><tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="w-8" /><th className="px-3 py-3 text-left">Component</th><th className="px-3 py-3 text-left">Part No</th>
              <th className="px-3 py-3 text-right">Your rate</th><th className="px-3 py-3 text-right">Your supplier</th><th className="px-3 py-3 text-right">Best live price</th><th className="px-3 py-3 text-right">Stock</th>
              <th className="px-3 py-3 text-right">Difference</th><th className="w-28" />
            </tr></thead>
            <tbody>
              {!rows && <tr><td colSpan={9} className="p-12 text-center text-slate-500">Loading…</td></tr>}
              {rows && view.length === 0 && <tr><td colSpan={9} className="p-12 text-center text-slate-500">No parts with part numbers found.</td></tr>}
              {view.map((r) => <PriceRow key={r.key} r={r} canEdit={canEdit} onApplied={load} />)}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs text-slate-500">Components without a part number can't be looked up. "Your supplier" shows the offer from the supplier on your component (e.g. RS). Overseas distributor prices are converted to AUD and may not include shipping or match your pack size — check before applying. Prices are refreshed daily.</p>
    </div>
  );
}
