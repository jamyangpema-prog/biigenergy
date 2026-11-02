# BIIG ENERGY — Costing App + Brand Website

## Original problem statement
1) Editable Equipment Costing & Quotation Management website (from Costing Template.xlsx): dashboard, editable equipment schedule with per-item costing (R, F, M, CC, Q, TCC, Ins, Wr, TI, LC, SP), settings (freight 15%, margin 20%, labour $85/hr, GST), quotation, reports, Excel import/export, PDF, roles. User choices: MongoDB, JWT email/password, logo supplied, seed workbook data, full feature set.
2) "Create a fully personalised, professional website structure and content for my business. Business name: BIIG ENERGY. Target audience: Finest Engineering. Brand personality: modern, trustworthy, premium, and originality. UVP: unique and originality. Location: Perth, Western Australia. Goals: attract clients, showcase services, increase credibility. Provide homepage, CTAs, tone of voice, palette/typography, About, Services, Contact, optional FAQs, testimonials, taglines."

## Architecture
- FastAPI + MongoDB (server.py), JWT auth with roles admin/estimator/viewer; reportlab PDF, openpyxl Excel.
- React: public marketing site at `/`, `/login`, authenticated app at `/app/*`.
- Formulas: F=R×f%, M=R×m%, CC=R+F+M, TCC=CC×Q, TI=Ins+Wr, LC=TI×rate, SP=TCC+LC.

## Implemented (2026-11-02)
- Costing app: 2 seeded projects (DB-1 & 2: 30 items; SMSD: 40 items), inline editing, expandable costing editor, per-item overrides, duplicate/delete/renumber, projects CRUD/duplicate, dashboard KPIs+charts, quote w/ GST, reports (5 tabs), Excel in/out, PDF quote, user management.
- Marketing site: hero, value strip, services (6), about + principles, testimonials, FAQ, contact form, footer. Navy/white/grey + red accent, IBM Plex Sans/Mono.
- Placeholders: years in operation, founding story, testimonials, standards FAQ, lead time, email, phone, ABN.
- Contact form is front-end only (no email sent).

## Backlog
- P0: connect contact form to email delivery (Resend)
- P1: full end-to-end test run (previous run cut short); logo on PDF quotes
- P2: separate About/Services pages if wanted, audit log
