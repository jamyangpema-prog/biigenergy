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
- Topbar "Add project" button; bigger sidebar logo; Inter font site-wide.
- Component detail panel (click any row in Equipment Costing, Reports, Component Library): brand, part no, supplier, unit rate, freight, margin, component cost, installation cost, selling price, projects it's used in (`GET /api/items/{id}/details`).
- Component Library page (`/app/library`, `GET /api/library`): unique parts across all projects grouped by part no (or description), total qty, component spend, install cost, selling price, projects.
- Public Component_Viewer (`/component-viewer`, embed mode `?embed=1`, `GET /api/public/components`): only Description, Brand, Part No, Supplier, Quantity, Price; shows per-unit selling price (SP/Q, ex GST, incl. install) — purchase rate no longer exposed; category filter chips (auto-categorised by description keywords: Chassis, Enclosures & Panels, Meters, Surge Protection, Circuit Breakers, Fuse Carriers, Current Transformers, Busbars & Insulators, Cable Ducting, Other); styled to biigenergy.com.au (Inter, #1F2937 dark, #FD0531 red, #F1F1F1/#F7F7F7 greys); contact details taken from biigenergy.com.au footer.

## Backlog
- P0: connect contact form to email delivery (Resend)
- P1: full end-to-end test run (previous run cut short); logo on PDF quotes
- P2: separate About/Services pages if wanted, audit log
