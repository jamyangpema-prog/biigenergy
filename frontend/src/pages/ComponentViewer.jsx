import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API, fmtAUD, fmtNum } from '@/lib/api';
import { Search, Phone, Mail, MapPin, ArrowUpDown, Boxes, ImageOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { imageUrl } from '@/components/ComponentImage';

const LOGO = 'https://customer-assets-jt897jd0.emergentagent.net/job_equipquote--13ttmu53/artifacts/57e4a1b4741c1c06_LOGO%20BE.png';
const SITE = 'https://biigenergy.com.au';
const RED = '#FD0531';
const DARK = '#1F2937';

const NAV = [['Home', '/'], ['Products', '/products/'], ['Electrical Testing', '/electrical-testing/'], ['About Us', '/about-us/'], ['Contact Us', '/contact-us/']];
const COLS = [['description', 'Equipment Description', false], ['brand', 'Brand', false], ['part_no', 'Part Number', false],
  ['supplier', 'Supplier', false], ['quantity', 'Quantity', true], ['min_price', 'Price (ex GST)', true]];

function Header() {
  return (
    <div style={{ background: DARK }} className="px-4 pt-3 pb-2">
      <div className="max-w-7xl mx-auto rounded-xl border border-white/15 bg-white/5 px-4 py-3 flex items-center justify-between gap-4">
        <a href={SITE} data-testid="cv-logo"><img src={LOGO} alt="BIIG ENERGY" className="h-12 w-auto rounded-sm" /></a>
        <nav className="hidden lg:flex items-center gap-8">
          {NAV.map(([l, h]) => (
            <a key={l} href={SITE + h} className="text-[13px] font-semibold uppercase text-white hover:text-[#FD0531] transition-colors">{l}</a>
          ))}
        </nav>
        <a href={`${SITE}/contact-us/`} data-testid="cv-quote-btn" style={{ background: RED }}
           className="text-white text-[13px] font-semibold uppercase px-5 py-3 rounded-md hover:opacity-90 transition-opacity">Request a Quote</a>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-[#F7F7F7] text-[#767676]">
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-10">
        <div>
          <img src={LOGO} alt="BIIG ENERGY" className="h-20 w-auto rounded-md mb-4" />
          <p className="text-sm text-[#1F2937] leading-relaxed">BiigEnergy delivers high-quality electrical enclosures, control stations, and industrial solutions engineered for reliability, safety, and performance in demanding environments.</p>
        </div>
        <div className="space-y-3 text-sm md:pt-6">
          <h4 className="text-lg text-[#1F2937] font-medium mb-2">Get in Touch</h4>
          <div className="flex items-center gap-2"><Phone className="h-4 w-4" style={{ color: RED }} />Call: 0893 685516</div>
          <div className="flex items-center gap-2"><Phone className="h-4 w-4" style={{ color: RED }} />Phone: 0450 881817</div>
          <div className="flex items-center gap-2"><Mail className="h-4 w-4" style={{ color: RED }} />Mail: info@biigenergy.com.au</div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4" style={{ color: RED }} />Location: 3/16 Cohn St, Carlisle WA 6101</div>
        </div>
        <div className="space-y-3 text-sm md:pt-6">
          <h4 className="text-lg text-[#1F2937] font-medium mb-2">Supported Links</h4>
          {[['Engineering Blog', '/engineering-blogs/'], ['Contact us', '/contact-us/'], ['Products', '/products/']].map(([l, h]) => (
            <a key={l} href={SITE + h} className="block hover:text-[#FD0531]">{l}</a>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-200 py-5 text-center text-sm">© {new Date().getFullYear()} BiigEnergy Pty Ltd. All Rights Reserved.</div>
    </footer>
  );
}

function PartDialog({ part, price, onClose }) {
  const rows = part ? [['Brand', part.brand], ['Part number', part.part_no], ['Supplier', part.supplier], ['Category', part.category], ['Quantity', fmtNum(part.quantity, 0)]] : [];
  return (
    <Dialog open={!!part} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden" data-testid="cv-dialog">
        {part && (
          <div className="grid sm:grid-cols-2">
            <div className="bg-[#F1F1F1] flex items-center justify-center min-h-[240px]">
              {part.image_path ? <img src={imageUrl(part.image_path)} alt={part.description} className="w-full h-full object-contain max-h-80" data-testid="cv-dialog-img" />
                : <div className="text-slate-400 text-sm flex flex-col items-center gap-1"><ImageOff className="h-10 w-10" />No picture available</div>}
            </div>
            <div className="p-6 flex flex-col">
              <DialogHeader className="text-left space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: RED }}>{part.category}</div>
                <DialogTitle className="text-lg leading-snug text-[#1F2937]" data-testid="cv-dialog-title">{part.description}</DialogTitle>
                <DialogDescription className="sr-only">Component details</DialogDescription>
              </DialogHeader>
              <div className="mt-4 divide-y divide-slate-100 text-sm">
                {rows.map(([l, v]) => (
                  <div key={l} className="flex justify-between py-2"><span className="text-slate-500">{l}</span><span className="font-medium text-[#1F2937]">{v || '—'}</span></div>
                ))}
              </div>
              <div className="mt-4 rounded-md p-4 text-white" style={{ background: DARK }}>
                <div className="text-xs uppercase tracking-wider text-slate-300">Current price (per unit, ex GST)</div>
                <div className="text-2xl font-bold tabular-nums mt-1" style={{ color: RED }} data-testid="cv-dialog-price">{price}</div>
                <div className="text-[11px] text-slate-400 mt-1">Supplied and installed. Final pricing confirmed on quotation.</div>
              </div>
              <a href={`${SITE}/contact-us/`} target="_blank" rel="noreferrer" className="mt-4 text-center text-white text-sm font-semibold uppercase px-5 py-3 rounded-md hover:opacity-90" style={{ background: RED }} data-testid="cv-dialog-quote">Request a Quote</a>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ComponentViewer({ inApp = false }) {
  const [params] = useSearchParams();
  const embed = inApp || params.get('embed') === '1';
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [sel, setSel] = useState(null);
  const [sort, setSort] = useState({ key: 'description', dir: 'asc' });

  useEffect(() => { axios.get(`${API}/public/components`).then((r) => setRows(r.data)).catch(() => setRows([])); }, []);

  const view = useMemo(() => {
    const s = q.toLowerCase();
    const arr = (rows || []).filter((r) => (cat === 'All' || r.category === cat)
      && (!s || [r.description, r.brand, r.part_no, r.supplier].some((v) => (v || '').toLowerCase().includes(s))));
    return [...arr].sort((a, b) => {
      const v1 = a[sort.key], v2 = b[sort.key];
      const c = typeof v1 === 'number' ? v1 - v2 : String(v1 || '').localeCompare(String(v2 || ''));
      return sort.dir === 'asc' ? c : -c;
    });
  }, [rows, q, sort, cat]);

  const cats = useMemo(() => {
    const counts = {};
    (rows || []).forEach((r) => { counts[r.category] = (counts[r.category] || 0) + 1; });
    return [['All', (rows || []).length], ...Object.entries(counts).sort((a, b) => (a[0] === 'Other') - (b[0] === 'Other') || a[0].localeCompare(b[0]))];
  }, [rows]);

  const toggle = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  const price = (r) => r.max_price == null ? 'On request' : r.min_price === r.max_price ? fmtAUD(r.min_price) : `${fmtAUD(r.min_price)} – ${fmtAUD(r.max_price)}`;

  return (
    <div className={inApp ? 'text-[#4B5563]' : 'min-h-screen bg-white text-[#4B5563]'} data-testid="component-viewer">
      {inApp && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Parts Catalogue</h1>
            <p className="text-sm text-slate-500">Exactly what visitors see on the public page.</p>
          </div>
          <a href="/parts-catalogue" target="_blank" rel="noreferrer" className="text-sm font-medium text-white px-4 py-2 rounded-md hover:opacity-90" style={{ background: RED }} data-testid="cv-open-public">Open public page</a>
        </div>
      )}
      {!embed && <Header />}
      {!embed && (
        <section style={{ background: DARK }} className="px-6 pt-14 pb-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: RED }}>BiigEnergy</div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mt-3">Parts Catalogue</h1>
            <p className="text-slate-300 mt-4 max-w-2xl">Browse the electrical components we specify and supply: descriptions, brands, part numbers, suppliers, quantities and prices. Prices are per unit, supplied and installed, in AUD excluding GST.</p>
          </div>
        </section>
      )}

      <section className={`${inApp ? 'py-4' : 'px-6'} ${embed ? (inApp ? '' : 'py-6') : 'py-14 bg-[#F1F1F1]'}`}>
        <div className={`${inApp ? '' : 'max-w-7xl mx-auto'} ${embed ? '' : '-mt-24'}`}>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search description, brand, part number, supplier…"
                       className="w-full pl-9 pr-3 py-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-[#FD0531] focus:ring-2 focus:ring-[#FD0531]/20"
                       data-testid="cv-search" />
              </div>
              <span className="text-sm" data-testid="cv-count">{view.length} components</span>
            </div>
            <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap gap-2" data-testid="cv-categories">
              {cats.map(([name, n]) => (
                <button key={name} onClick={() => setCat(name)} data-testid={`cv-cat-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${cat === name ? 'bg-[#FD0531] border-[#FD0531] text-white' : 'bg-white border-slate-300 text-[#1F2937] hover:border-[#FD0531] hover:text-[#FD0531]'}`}>
                  {name} <span className={cat === name ? 'text-white/80' : 'text-slate-400'}>({n})</span>
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="cv-table">
                <thead>
                  <tr style={{ background: DARK }} className="text-white text-xs uppercase tracking-wider">
                    {COLS.map(([k, l, num]) => (
                      <th key={k} className={`px-4 py-3.5 font-semibold ${num ? 'text-right' : 'text-left'}`}>
                        <button onClick={() => toggle(k)} className="inline-flex items-center gap-1 hover:text-[#FD0531]" data-testid={`cv-sort-${k}`}>{l}<ArrowUpDown className="h-3 w-3" /></button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!rows && <tr><td colSpan={6} className="p-12 text-center">Loading components…</td></tr>}
                  {rows && view.length === 0 && (
                    <tr><td colSpan={6} className="p-12 text-center"><Boxes className="h-8 w-8 mx-auto mb-2 text-slate-300" />No components found.</td></tr>
                  )}
                  {view.map((r, i) => (
                    <tr key={i} onClick={() => setSel(r)} className="border-t border-slate-100 even:bg-[#F7F7F7] hover:bg-[#FD0531]/5 transition-colors cursor-pointer" data-testid={`cv-row-${i}`}>
                      <td className="px-4 py-3 font-medium text-[#1F2937]">{r.description}</td>
                      <td className="px-4 py-3">{r.brand || '—'}</td>
                      <td className="px-4 py-3 tabular-nums">{r.part_no || '—'}</td>
                      <td className="px-4 py-3">{r.supplier || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtNum(r.quantity, 0)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: RED }}>{price(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500" data-testid="cv-price-note">Prices are per unit, supplied and installed, in AUD excluding GST. Final pricing is confirmed on quotation.</p>
          {!embed && (
            <div className="mt-10 text-center">
              <a href={`${SITE}/contact-us/`} style={{ background: RED }} className="inline-block text-white font-medium px-8 py-3.5 rounded-md hover:opacity-90" data-testid="cv-cta">Request a Quote</a>
            </div>
          )}
        </div>
      </section>
      <PartDialog part={sel} price={sel ? price(sel) : ''} onClose={() => setSel(null)} />
      {!embed && <Footer />}
    </div>
  );
}
