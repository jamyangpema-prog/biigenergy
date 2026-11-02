import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API, fmtAUD, fmtNum } from '@/lib/api';
import { Search, Phone, Mail, MapPin, ArrowUpDown, Boxes } from 'lucide-react';

const LOGO = 'https://customer-assets-jt897jd0.emergentagent.net/job_equipquote--13ttmu53/artifacts/57e4a1b4741c1c06_LOGO%20BE.png';
const SITE = 'https://biigenergy.com.au';
const RED = '#FD0531';
const DARK = '#1F2937';

const NAV = [['Home', '/'], ['Products', '/products/'], ['Electrical Testing', '/electrical-testing/'], ['About Us', '/about-us/'], ['Contact Us', '/contact-us/']];
const COLS = [['description', 'Equipment Description', false], ['brand', 'Brand', false], ['part_no', 'Part Number', false],
  ['supplier', 'Supplier', false], ['quantity', 'Quantity', true], ['min_rate', 'Rate', true]];

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

export default function ComponentViewer() {
  const [params] = useSearchParams();
  const embed = params.get('embed') === '1';
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: 'description', dir: 'asc' });

  useEffect(() => { axios.get(`${API}/public/components`).then((r) => setRows(r.data)).catch(() => setRows([])); }, []);

  const view = useMemo(() => {
    const s = q.toLowerCase();
    const arr = (rows || []).filter((r) => !s || [r.description, r.brand, r.part_no, r.supplier].some((v) => (v || '').toLowerCase().includes(s)));
    return [...arr].sort((a, b) => {
      const v1 = a[sort.key], v2 = b[sort.key];
      const c = typeof v1 === 'number' ? v1 - v2 : String(v1 || '').localeCompare(String(v2 || ''));
      return sort.dir === 'asc' ? c : -c;
    });
  }, [rows, q, sort]);

  const toggle = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  const rate = (r) => !r.max_rate ? '—' : r.min_rate === r.max_rate ? fmtAUD(r.min_rate) : `${fmtAUD(r.min_rate)} – ${fmtAUD(r.max_rate)}`;

  return (
    <div className="min-h-screen bg-white text-[#4B5563]" data-testid="component-viewer">
      {!embed && <Header />}
      {!embed && (
        <section style={{ background: DARK }} className="px-6 pt-14 pb-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: RED }}>BiigEnergy</div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mt-3">Component_Viewer</h1>
            <p className="text-slate-300 mt-4 max-w-2xl">Browse the electrical components we specify and supply: descriptions, brands, part numbers, suppliers, quantities and rates.</p>
          </div>
        </section>
      )}

      <section className={`px-6 ${embed ? 'py-6' : 'py-14 bg-[#F1F1F1]'}`}>
        <div className={`max-w-7xl mx-auto ${embed ? '' : '-mt-24'}`}>
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
                    <tr key={i} className="border-t border-slate-100 even:bg-[#F7F7F7] hover:bg-[#FD0531]/5 transition-colors" data-testid={`cv-row-${i}`}>
                      <td className="px-4 py-3 font-medium text-[#1F2937]">{r.description}</td>
                      <td className="px-4 py-3">{r.brand || '—'}</td>
                      <td className="px-4 py-3 tabular-nums">{r.part_no || '—'}</td>
                      <td className="px-4 py-3">{r.supplier || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtNum(r.quantity, 0)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: RED }}>{rate(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {!embed && (
            <div className="mt-10 text-center">
              <a href={`${SITE}/contact-us/`} style={{ background: RED }} className="inline-block text-white font-medium px-8 py-3.5 rounded-md hover:opacity-90" data-testid="cv-cta">Request a Quote</a>
            </div>
          )}
        </div>
      </section>
      {!embed && <Footer />}
    </div>
  );
}
