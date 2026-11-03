# BIIG ENERGY — Costing App + Brand Website

## Original problem statement
1) Editable Equipment Costing & Quotation Management website (from Costing Template.xlsx): dashboard, editable equipment schedule with per-item costing (R, F, M, CC, Q, TCC, Ins, Wr, TI, LC, SP), settings (freight 15%, margin 20%, labour $85/hr, GST), quotation, reports, Excel import/export, PDF, roles. User choices: MongoDB, JWT email/password, logo supplied, seed workbook data, full feature set.
2) "Create a fully personalised, professional website structure and content for my business. Business name: BIIG ENERGY. Target audience: Finest Engineering. Brand personality: modern, trustworthy, premium, and originality. UVP: unique and originality. Location: Perth, Western Australia. Goals: attract clients, showcase services, increase credibility. Provide homepage, CTAs, tone of voice, palette/typography, About, Services, Contact, optional FAQs, testimonials, taglines."

## Architecture
- FastAPI + MongoDB (server.py), JWT auth with roles admin/estimator/viewer; reportlab PDF, openpyxl Excel.
- React: public marketing site at `/`, `/login`, authenticated app at `/app/*`.
- Formulas: F=R×f%, M=R×m%, CC=R+F+M, TCC=CC×Q, TI=Ins+Wr, LC=TI×rate, SP=TCC+LC.

## Implemented (2026-11-03)
- Component_Viewer renamed **Parts Catalogue** (public `/parts-catalogue`, old `/component-viewer` still works; in-app `/app/parts-catalogue`); row click opens pop-up with picture, details, current per-unit price, Request a Quote.
- Add from library: Component Rates → "Add from library" searches all parts and adds to current project with qty (copies brand, part no, supplier, rate, hours, picture).
- Component pictures via Emergent object storage: upload/change/remove in detail panel; applied to all lines of the same part; shown in Library, detail panel, Parts Catalogue pop-up. `/api/images/{path}` public.
- Supplier Prices page (`/app/supplier-prices`): Nexar (Octopart) feed, AU/AUD, qty-1 price, stock per distributor; Apply button updates rate on all matching lines (logged in `rate_changes`); daily cron 6:00 Perth (`.emergent/crons.yml` → `/api/cron/supplier-feed`). Waiting for NEXAR_CLIENT_ID / NEXAR_CLIENT_SECRET.
- Project selector removed from top bar. New **Projects** tab (`/app/projects`): cards with client, items, component/selling totals; New, Edit (name/client/description), Duplicate, Delete (admin); Rates/Quote/Settings buttons open that project. Project pages (Component Rates, Quotation, Reports, Costing Settings) have a small in-page project picker + "Manage" link.
- Dashboard is clickable: KPI cards link to Projects / Component Library / Reports tabs (`?tab=labour|component|compare`), chart bars and new Projects table open that project's Component Rates, pie slices open the matching report.
- Owner admin account jamyang.pema@gmail.com added.
- Component Library is now a master `components` collection (per unit, Unit column, Category chips/editable category, New/Edit/Remove, picture on component). Project lines link via `component_id`. Library edit → syncs description/brand/part no/supplier/unit/rate/picture to linked lines; line edit in Costing → that line only. Migration (one-off, marker `meta.components_migrated`): each distinct (part, rate) → own entry; " + " names split (5 new $0 parts). New lines/imports reuse an identical library entry or create one. Backup of pre-migration items in `items_backup_20261103`.
- "Component Rates" renamed **Costing**; Parts Catalogue removed (public + in-app); sticky table headers (`.table-scroll`).
- Nexar connected (NEXAR_CLIENT_ID / NEXAR_CLIENT_SECRET set); first run matched 10/10 part numbers, 7 with AUD offers. Supplier Prices shows "Your supplier" offer (matched by first word of component supplier, e.g. RS → RS APAC), best live price, per-offer "Use this price".
- Pending: Claude AI integration (user hasn't chosen purpose/model yet).

## Implemented (2026-11-02)
- Costing app: 2 seeded projects (DB-1 & 2: 30 items; SMSD: 40 items), inline editing, expandable costing editor, per-item overrides, duplicate/delete/renumber, projects CRUD/duplicate, dashboard KPIs+charts, quote w/ GST, reports (5 tabs), Excel in/out, PDF quote, user management.
- Marketing site: hero, value strip, services (6), about + principles, testimonials, FAQ, contact form, footer. Navy/white/grey + red accent, IBM Plex Sans/Mono.
- Placeholders: years in operation, founding story, testimonials, standards FAQ, lead time, email, phone, ABN.
- Contact form is front-end only (no email sent).
- Topbar "Add project" button; bigger sidebar logo; Inter font site-wide.
- Component detail panel (click any row in Equipment Costing, Reports, Component Library): brand, part no, supplier, unit rate, freight, margin, component cost, installation cost, selling price, projects it's used in (`GET /api/items/{id}/details`).
- Component Library page (`/app/library`, `GET /api/library`): unique parts across all projects grouped by part no (or description), total qty, component spend, install cost, selling price, projects.
- Component_Viewer tab in app sidebar under Reports (`/app/component-viewer`).
- "Equipment Costing" renamed "Component Rates" in sidebar.
- Edit component everywhere: detail panel "Edit component" (admin/estimator) → `PUT /api/items/{id}/apply-all` updates description, brand, part no, supplier, rate, install/wiring hrs on all matching lines (same part no, else same description) in every project; quantity editable per line.
- Public Component_Viewer (`/component-viewer`, embed mode `?embed=1`, `GET /api/public/components`): only Description, Brand, Part No, Supplier, Quantity, Price; shows per-unit selling price (SP/Q, ex GST, incl. install) — purchase rate no longer exposed; category filter chips (auto-categorised by description keywords: Chassis, Enclosures & Panels, Meters, Surge Protection, Circuit Breakers, Fuse Carriers, Current Transformers, Busbars & Insulators, Cable Ducting, Other); styled to biigenergy.com.au (Inter, #1F2937 dark, #FD0531 red, #F1F1F1/#F7F7F7 greys); contact details taken from biigenergy.com.au footer.

## Backlog
- P0: connect contact form to email delivery (Resend)
- P1: full end-to-end test run (previous run cut short); logo on PDF quotes
- P2: separate About/Services pages if wanted, audit log
