import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { ArrowRight, Zap, Calculator, FileSpreadsheet, ShieldCheck, Gauge, Users2, Factory, Mail, Phone, MapPin, Star, CheckCircle2 } from 'lucide-react';

const LOGO = 'https://customer-assets-jt897jd0.emergentagent.net/job_equipquote--13ttmu53/artifacts/57e4a1b4741c1c06_LOGO%20BE.png';
const HERO_BG = 'https://images.unsplash.com/photo-1717386255773-1e3037c81788?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwZW5naW5lZXJpbmclMjBtYW51ZmFjdHVyaW5nJTIwZmFjaWxpdHklMjBjbGVhbnxlbnwwfHx8fDE3OTM1OTI1MDB8MA&ixlib=rb-4.1.0&q=85';

function Nav() {
  const [open, setOpen] = useState(false);
  const items = [['#services', 'Services'], ['#about', 'About'], ['#testimonials', 'Clients'], ['#faq', 'FAQ'], ['#contact', 'Contact']];
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" data-testid="brand-link">
          <img src={LOGO} className="h-10 w-10 rounded-md object-cover ring-1 ring-red-600/30" alt="BIIG ENERGY" />
          <div>
            <div className="font-bold tracking-tight text-slate-900 leading-none">BIIG ENERGY</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mt-0.5">Perth · WA</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-slate-600">
          {items.map(([h, l]) => <a key={h} href={h} className="hover:text-slate-900 transition-colors">{l}</a>)}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost" className="text-slate-700" data-testid="nav-login">Client sign-in</Button></Link>
          <a href="#contact"><Button className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="nav-cta">Request a quote</Button></a>
        </div>
      </div>
    </header>
  );
}

function Section({ id, eyebrow, title, lead, children, className = '' }) {
  return (
    <section id={id} className={`py-24 px-6 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {(eyebrow || title) && (
          <div className="max-w-2xl mb-14">
            {eyebrow && <div className="text-xs uppercase tracking-[0.2em] text-red-600 font-semibold mb-3">{eyebrow}</div>}
            {title && <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">{title}</h2>}
            {lead && <p className="mt-4 text-slate-600 text-lg leading-relaxed">{lead}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export default function Marketing() {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', message: '' });
  const submit = (e) => { e.preventDefault(); toast.success("Thanks — enquiry captured (email delivery not yet connected)."); setForm({ name: '', company: '', email: '', phone: '', message: '' }); };

  return (
    <div className="bg-white text-slate-900">
      <Nav />

      {/* HERO */}
      <section className="relative overflow-hidden" data-testid="hero">
        <img src={HERO_BG} className="absolute inset-0 h-full w-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-900/70" />
        <div className="relative max-w-7xl mx-auto px-6 py-28 md:py-36 text-white">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur px-3 py-1 rounded-full text-xs uppercase tracking-[0.2em] mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Perth · Western Australia
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] max-w-4xl">
            Finest engineering, costed with <span className="text-red-500">certainty.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-200/90">
            BIIG ENERGY builds custom switchboards, metering panels and electrical assemblies for Australian industry — backed by a transparent, line-by-line costing system that keeps every quote defensible.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href="#contact"><Button className="bg-red-600 hover:bg-red-700 text-white px-6 h-12 text-base" data-testid="hero-cta">Start your project <ArrowRight className="h-4 w-4 ml-1.5" /></Button></a>
            <a href="#services"><Button variant="outline" className="bg-white/5 border-white/30 text-white hover:bg-white/10 h-12 px-6">Explore services</Button></a>
          </div>
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl">
            {[['[X]+', 'Years in operation'], ['AS/NZS 3000', 'Wiring rules'], ['AUD', 'Transparent pricing'], ['Perth', 'Based in WA']].map(([k, l]) => (
              <div key={k}>
                <div className="fin text-2xl md:text-3xl font-semibold text-white">{k}</div>
                <div className="text-xs uppercase tracking-wider text-slate-300 mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VALUE STRIP */}
      <div className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          {[['Original engineering, never off-the-shelf.', Zap], ['Line-item transparent costing.', Calculator], ['Compliance-first delivery.', ShieldCheck], ['Lead-time you can plan around.', Gauge]].map(([t, I]) => (
            <div key={t} className="flex items-start gap-3">
              <I className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <span className="text-slate-700">{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SERVICES */}
      <Section id="services" eyebrow="Services" title="Precision engineering for Australian industry."
        lead="End-to-end delivery — from first sketch to commissioned switchboard — with a costing paper trail that keeps your project auditable.">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { I: Factory, t: 'Custom switchboard fabrication', d: 'Site Main Switch Boards, Distribution Boards and metering panels — fabricated, wired and labelled to your specification.' },
            { I: Zap, t: 'Metering & monitoring upgrades', d: 'Schneider iEM3250 direct-connect metering, surge diverters, CTs and sub-metering retrofits.' },
            { I: Calculator, t: 'Transparent costing & quoting', d: 'Every component, freight line, margin and labour hour is itemised — the exact system that powers this website.' },
            { I: ShieldCheck, t: 'Compliance & commissioning', d: 'Pre-energisation inspection, witness testing and documentation handover so your sparkie can sign off with confidence.' },
            { I: Gauge, t: 'Lifecycle maintenance', d: 'Scheduled thermographic surveys, torque audits and spare-parts kitting to keep critical assets running.' },
            { I: Users2, t: 'Owners-engineering support', d: 'Specification review, tender evaluation and site representation on behalf of principal contractors and asset owners.' },
          ].map((s) => (
            <Card key={s.t} className="p-6 border-slate-200 hover:border-slate-300 hover:shadow-md transition-all group" data-testid={`service-${s.t.replace(/[^a-z]/gi, '-').toLowerCase()}`}>
              <div className="h-10 w-10 rounded-md bg-slate-900 text-white flex items-center justify-center mb-5 group-hover:bg-red-600 transition-colors">
                <s.I className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">{s.t}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{s.d}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* ABOUT */}
      <Section id="about" className="bg-slate-50 border-y border-slate-200" eyebrow="About" title="Perth-born. Site-tested. Owner-run.">
        <div className="grid md:grid-cols-5 gap-10 items-start">
          <div className="md:col-span-3 space-y-4 text-slate-700 leading-relaxed">
            <p className="text-xs text-red-600">[Placeholder story — replace with your own founding details]</p>
            <p>BIIG ENERGY was founded on a simple frustration: on too many projects, the cost of the switchboard was a mystery number on a one-page quote. We believed Perth's finest engineers and principal contractors deserved better.</p>
            <p>So we built a different kind of workshop. Every assembly we fabricate is backed by a transparent, line-by-line costing register — the exact enclosure, the exact brand and part number of every MCB, the exact labour hours. That register is live, auditable and attached to every quotation we send.</p>
            <p>We work with Schneider, IPD and Western Power as a matter of course, but what we really sell is <strong className="text-slate-900">certainty</strong> — the certainty that the price on page one of your quote is the price you will pay, and that the board that arrives on site matches the one on the schedule.</p>
            <div className="pt-4 flex flex-wrap gap-6">
              {[['Itemised costing', CheckCircle2], ['Fully traceable BOM', CheckCircle2], ['Clear quotations', CheckCircle2]].map(([t, I]) => (
                <div key={t} className="flex items-center gap-2 text-sm font-medium text-slate-900"><I className="h-4 w-4 text-red-600" />{t}</div>
              ))}
            </div>
          </div>
          <Card className="md:col-span-2 p-7 border-slate-200 bg-white">
            <div className="text-xs uppercase tracking-[0.2em] text-red-600 font-semibold mb-4">Our principles</div>
            <ul className="space-y-5 text-sm">
              {[
                ['Originality over off-the-shelf', 'Every board is engineered for its site — not pulled from a catalogue.'],
                ['Numbers before narrative', 'Costings are open-book. Margins are stated, not hidden.'],
                ['Compliance is a floor, not a ceiling', 'We exceed AS/NZS minimums because site conditions do too.'],
                ['Local, accountable, named', 'You get a mobile number — not a ticket queue.'],
              ].map(([t, d]) => (
                <li key={t}>
                  <div className="font-semibold text-slate-900">{t}</div>
                  <div className="text-slate-600 mt-1">{d}</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section id="testimonials" eyebrow="Clients" title="Trusted by Western Australia's project leaders.">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { q: '[Placeholder testimonial — add a real client quote about your costing transparency.]', n: '[Client name, role]', c: '[Company, location]' },
            { q: '[Placeholder testimonial — add a real client quote about build quality.]', n: '[Client name, role]', c: '[Company, location]' },
            { q: '[Placeholder testimonial — add a real client quote about delivery.]', n: '[Client name, role]', c: '[Company, location]' },
          ].map((t, i) => (
            <Card key={i} className="p-7 border-slate-200">
              <div className="flex gap-1 mb-4">{[0,1,2,3,4].map((s) => <Star key={s} className="h-4 w-4 fill-red-500 text-red-500" />)}</div>
              <blockquote className="text-slate-800 leading-relaxed">"{t.q}"</blockquote>
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="font-semibold text-sm text-slate-900">{t.n}</div>
                <div className="text-xs text-slate-500">{t.c}</div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="bg-slate-50 border-y border-slate-200" eyebrow="FAQ" title="Honest answers to the questions we hear every week.">
        <div className="max-w-3xl">
          <Accordion type="single" collapsible className="w-full" data-testid="faq-accordion">
            {[
              ['Do you take on single switchboards or only large packages?', 'Both. A single DB-1 is as welcome as a full MSB and sub-main package. The costing method is identical — every item itemised, every margin visible.'],
              ['What is your typical lead time?', 'For custom boards, typically [6–8] weeks from signed PO and approved schedule. Ring us early for rush work so we can be straight with you.'],
              ['Do you quote in AUD excl. GST?', 'Yes. Every quotation is issued in AUD ex-GST with GST shown on a separate line. Freight is a transparent line item, revised to actuals at invoice.'],
              ['Can we see your costing before awarding?', 'That is exactly the point of our system. On request we share the full line-by-line schedule — the same one you can log into and review on this site.'],
              ['Which brands do you specify by default?', 'Schneider Electric is our default for MCBs, MCCBs, metering and surge. IPD is our default for fuse carriers, insulators and busbar hardware. We will spec anything you nominate.'],
              ['Which standards do you build to?', '[Placeholder — list your certifications and standards.]'],
            ].map(([q, a], i) => (
              <AccordionItem key={i} value={`i${i}`}>
                <AccordionTrigger className="text-left font-medium text-slate-900 hover:no-underline">{q}</AccordionTrigger>
                <AccordionContent className="text-slate-600 leading-relaxed">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      {/* CONTACT */}
      <Section id="contact" eyebrow="Contact" title="Let's cost your next board — properly."
        lead="Tell us about your project. We'll come back within one business day with a transparent, line-by-line proposal.">
        <div className="grid md:grid-cols-5 gap-10">
          <form onSubmit={submit} className="md:col-span-3 space-y-4" data-testid="contact-form">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Full name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="contact-name" /></div>
              <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="contact-email" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Project details</Label><Textarea rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="A short description of the board, site, timing and anything we should factor in." /></div>
            <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white h-11 px-6" data-testid="contact-submit">Send enquiry <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
          </form>
          <div className="md:col-span-2 space-y-5">
            <Card className="p-6 border-slate-200 space-y-4">
              <div className="flex items-start gap-3"><MapPin className="h-5 w-5 text-red-600 mt-0.5" /><div><div className="font-semibold text-slate-900">Workshop</div><div className="text-sm text-slate-600">Perth, Western Australia</div></div></div>
              <div className="flex items-start gap-3"><Mail className="h-5 w-5 text-red-600 mt-0.5" /><div><div className="font-semibold text-slate-900">Email</div><div className="text-sm text-slate-600">[your email]</div></div></div>
              <div className="flex items-start gap-3"><Phone className="h-5 w-5 text-red-600 mt-0.5" /><div><div className="font-semibold text-slate-900">Phone</div><div className="text-sm text-slate-600">[your phone]</div></div></div>
            </Card>
            <Card className="p-6 border-slate-200 bg-slate-900 text-white">
              <div className="text-xs uppercase tracking-[0.2em] text-red-400 font-semibold mb-3">Existing clients</div>
              <p className="text-sm text-slate-300 mb-5">Access live costing, update quantities and export quotations through our client portal.</p>
              <Link to="/login"><Button className="w-full bg-white text-slate-900 hover:bg-slate-100" data-testid="contact-signin">Sign in to client portal</Button></Link>
            </Card>
          </div>
        </div>
      </Section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4"><img src={LOGO} className="h-10 w-10 rounded object-cover" alt="BIIG ENERGY" /><div className="font-bold text-white">BIIG ENERGY</div></div>
            <p className="text-sm max-w-md">Perth-based electrical assembly and switchboard engineering. Original, auditable, delivered.</p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white font-semibold mb-3">Explore</div>
            <ul className="space-y-2 text-sm"><li><a href="#services">Services</a></li><li><a href="#about">About</a></li><li><a href="#faq">FAQ</a></li><li><a href="#contact">Contact</a></li></ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white font-semibold mb-3">Client</div>
            <ul className="space-y-2 text-sm"><li><Link to="/login">Portal sign-in</Link></li></ul>
          </div>
        </div>
        <div className="border-t border-slate-800 py-5 px-6 text-xs flex flex-wrap gap-3 justify-between max-w-7xl mx-auto">
          <div>© {new Date().getFullYear()} BIIG ENERGY · Perth, Western Australia</div>
          <div>ABN [placeholder]</div>
        </div>
      </footer>
    </div>
  );
}
