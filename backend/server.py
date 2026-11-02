"""BIIG Energy — Equipment Costing & Quotation Management API."""
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, io, logging, uuid, jwt, bcrypt
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'biig-energy-dev-secret-change-me')
JWT_ALGO = 'HS256'
JWT_EXP_HOURS = 24 * 7

app = FastAPI(title="BIIG Energy Costing API")
api = APIRouter(prefix="/api")
auth_scheme = HTTPBearer(auto_error=False)
logger = logging.getLogger("biig")

# ================= Models =================

Role = Literal['admin', 'estimator', 'viewer']

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: Role = 'viewer'
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LoginReq(BaseModel):
    email: str
    password: str

class RegisterReq(BaseModel):
    email: str
    password: str
    name: str
    role: Role = 'estimator'

class ProjectSettings(BaseModel):
    freight_pct: float = 0.15
    margin_pct: float = 0.20
    labour_rate: float = 85.0
    currency: str = 'AUD'
    gst_rate: float = 0.10
    gst_included: bool = False

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    client: Optional[str] = ''
    description: Optional[str] = ''
    notes: Optional[str] = ''
    exclusions: Optional[str] = ''
    terms: Optional[str] = ''
    settings: ProjectSettings = Field(default_factory=ProjectSettings)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EquipmentItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: Optional[str] = None
    item_no: int = 1
    description: str = ''
    brand: Optional[str] = ''
    part_no: Optional[str] = ''
    supplier: Optional[str] = ''
    quantity: float = 1
    rate: float = 0
    install_hrs: float = 0
    wiring_hrs: float = 0
    # per-item overrides (null => use project setting)
    freight_pct_override: Optional[float] = None
    margin_pct_override: Optional[float] = None
    labour_rate_override: Optional[float] = None
    label: Optional[str] = ''  # e.g., "UNIT 23 METER"
    uom: Optional[str] = 'ea'
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ================= Helpers =================

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def check_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def make_token(user_id: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS)
    return jwt.encode({'sub': user_id, 'role': role, 'exp': exp}, JWT_SECRET, algorithm=JWT_ALGO)

async def current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme)) -> dict:
    if not creds:
        raise HTTPException(401, "Missing token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({'id': payload['sub']}, {'_id': 0, 'password_hash': 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

def require_role(*roles: str):
    async def dep(user: dict = Depends(current_user)):
        if user['role'] not in roles:
            raise HTTPException(403, "Insufficient permissions")
        return user
    return dep

def calc_item(item: dict, settings: dict) -> dict:
    """Compute all derived fields per prompt formulas."""
    R = float(item.get('rate') or 0)
    Q = float(item.get('quantity') or 0)
    Ins = float(item.get('install_hrs') or 0)
    Wr = float(item.get('wiring_hrs') or 0)
    f_pct = item.get('freight_pct_override')
    m_pct = item.get('margin_pct_override')
    l_rate = item.get('labour_rate_override')
    freight_pct = f_pct if f_pct is not None else settings['freight_pct']
    margin_pct = m_pct if m_pct is not None else settings['margin_pct']
    labour_rate = l_rate if l_rate is not None else settings['labour_rate']
    F = R * freight_pct
    M = R * margin_pct
    CC = R + F + M
    TCC = CC * Q
    TI = Ins + Wr
    LC = TI * labour_rate
    SP = TCC + LC
    return {
        **item,
        'freight': round(F, 4), 'margin': round(M, 4),
        'component_cost': round(CC, 4), 'total_component_cost': round(TCC, 4),
        'total_install_hrs': round(TI, 4), 'labour_cost': round(LC, 4),
        'selling_price': round(SP, 4),
        'effective_freight_pct': freight_pct, 'effective_margin_pct': margin_pct,
        'effective_labour_rate': labour_rate,
    }

def clean_doc(d):
    if d is None:
        return None
    d.pop('_id', None)
    return d

# ================= Auth =================

@api.post("/auth/register")
async def register(req: RegisterReq, user: dict = Depends(require_role('admin'))):
    if await db.users.find_one({'email': req.email.lower()}):
        raise HTTPException(400, "Email already registered")
    u = User(email=req.email.lower(), name=req.name, role=req.role)
    doc = u.model_dump()
    doc['password_hash'] = hash_pw(req.password)
    await db.users.insert_one(doc)
    return u

@api.post("/auth/login")
async def login(req: LoginReq):
    doc = await db.users.find_one({'email': req.email.lower()})
    if not doc or not check_pw(req.password, doc.get('password_hash', '')):
        raise HTTPException(401, "Invalid credentials")
    token = make_token(doc['id'], doc['role'])
    doc.pop('_id', None); doc.pop('password_hash', None)
    return {'token': token, 'user': doc}

@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return user

@api.get("/auth/users")
async def list_users(user: dict = Depends(require_role('admin'))):
    return await db.users.find({}, {'_id': 0, 'password_hash': 0}).to_list(1000)

@api.delete("/auth/users/{uid}")
async def del_user(uid: str, user: dict = Depends(require_role('admin'))):
    if uid == user['id']:
        raise HTTPException(400, "Cannot delete yourself")
    await db.users.delete_one({'id': uid})
    return {'ok': True}

# ================= Projects =================

@api.get("/projects")
async def list_projects(user: dict = Depends(current_user)):
    return await db.projects.find({}, {'_id': 0}).sort('created_at', 1).to_list(1000)

@api.post("/projects")
async def create_project(p: Project, user: dict = Depends(require_role('admin', 'estimator'))):
    doc = p.model_dump()
    await db.projects.insert_one(doc)
    return clean_doc(doc)

@api.get("/projects/{pid}")
async def get_project(pid: str, user: dict = Depends(current_user)):
    p = await db.projects.find_one({'id': pid}, {'_id': 0})
    if not p:
        raise HTTPException(404, "Project not found")
    return p

@api.put("/projects/{pid}")
async def update_project(pid: str, p: Project, user: dict = Depends(require_role('admin', 'estimator'))):
    doc = p.model_dump()
    doc['id'] = pid
    doc['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.projects.update_one({'id': pid}, {'$set': doc})
    return clean_doc(doc)

@api.delete("/projects/{pid}")
async def delete_project(pid: str, user: dict = Depends(require_role('admin'))):
    await db.projects.delete_one({'id': pid})
    await db.items.delete_many({'project_id': pid})
    return {'ok': True}

@api.post("/projects/{pid}/duplicate")
async def duplicate_project(pid: str, user: dict = Depends(require_role('admin', 'estimator'))):
    src = await db.projects.find_one({'id': pid}, {'_id': 0})
    if not src:
        raise HTTPException(404, "Project not found")
    new_id = str(uuid.uuid4())
    src['id'] = new_id
    src['name'] = f"{src['name']} (Copy)"
    src['created_at'] = datetime.now(timezone.utc).isoformat()
    src['updated_at'] = src['created_at']
    await db.projects.insert_one(dict(src))
    items = await db.items.find({'project_id': pid}, {'_id': 0}).to_list(5000)
    for it in items:
        it['id'] = str(uuid.uuid4())
        it['project_id'] = new_id
        await db.items.insert_one(dict(it))
    src.pop('_id', None)
    return src

# ================= Items =================

@api.get("/projects/{pid}/items")
async def list_items(pid: str, user: dict = Depends(current_user)):
    proj = await db.projects.find_one({'id': pid}, {'_id': 0})
    if not proj:
        raise HTTPException(404, "Project not found")
    items = await db.items.find({'project_id': pid}, {'_id': 0}).sort('item_no', 1).to_list(5000)
    return [calc_item(i, proj['settings']) for i in items]

@api.post("/projects/{pid}/items")
async def add_item(pid: str, it: EquipmentItem, user: dict = Depends(require_role('admin', 'estimator'))):
    proj = await db.projects.find_one({'id': pid}, {'_id': 0})
    if not proj:
        raise HTTPException(404, "Project not found")
    it.project_id = pid
    # Auto item_no
    last = await db.items.find({'project_id': pid}).sort('item_no', -1).limit(1).to_list(1)
    it.item_no = (last[0]['item_no'] + 1) if last else 1
    doc = it.model_dump()
    await db.items.insert_one(dict(doc))
    return calc_item(doc, proj['settings'])

@api.put("/items/{iid}")
async def update_item(iid: str, it: EquipmentItem, user: dict = Depends(require_role('admin', 'estimator'))):
    existing = await db.items.find_one({'id': iid}, {'_id': 0})
    if not existing:
        raise HTTPException(404, "Item not found")
    doc = it.model_dump()
    doc['id'] = iid
    doc['project_id'] = existing['project_id']
    doc['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.items.update_one({'id': iid}, {'$set': doc})
    proj = await db.projects.find_one({'id': doc['project_id']}, {'_id': 0})
    return calc_item(doc, proj['settings'])

@api.get("/items/{iid}/details")
async def item_details(iid: str, user: dict = Depends(current_user)):
    it = await db.items.find_one({'id': iid}, {'_id': 0})
    if not it:
        raise HTTPException(404, "Item not found")
    projects = {p['id']: p for p in await db.projects.find({}, {'_id': 0}).to_list(1000)}
    proj = projects.get(it['project_id'])
    part = (it.get('part_no') or '').strip()
    match = {'part_no': part} if part else {'description': it.get('description', '')}
    usage = []
    for u in await db.items.find(match, {'_id': 0}).sort('item_no', 1).to_list(5000):
        p = projects.get(u['project_id'])
        if not p:
            continue
        c = calc_item(u, p['settings'])
        usage.append({'item_id': u['id'], 'project_id': p['id'], 'project_name': p['name'],
                      'item_no': u['item_no'], 'quantity': u['quantity'], 'selling_price': c['selling_price']})
    return {'item': calc_item(it, proj['settings']), 'project_name': proj['name'],
            'matched_by': 'part_no' if part else 'description', 'usage': usage}


@api.delete("/items/{iid}")
async def delete_item(iid: str, user: dict = Depends(require_role('admin', 'estimator'))):
    await db.items.delete_one({'id': iid})
    return {'ok': True}

@api.post("/items/{iid}/duplicate")
async def duplicate_item(iid: str, user: dict = Depends(require_role('admin', 'estimator'))):
    src = await db.items.find_one({'id': iid}, {'_id': 0})
    if not src:
        raise HTTPException(404, "Item not found")
    new = dict(src)
    new['id'] = str(uuid.uuid4())
    last = await db.items.find({'project_id': src['project_id']}).sort('item_no', -1).limit(1).to_list(1)
    new['item_no'] = (last[0]['item_no'] + 1) if last else 1
    await db.items.insert_one(dict(new))
    proj = await db.projects.find_one({'id': new['project_id']}, {'_id': 0})
    return calc_item(new, proj['settings'])

@api.post("/projects/{pid}/renumber")
async def renumber(pid: str, user: dict = Depends(require_role('admin', 'estimator'))):
    items = await db.items.find({'project_id': pid}, {'_id': 0}).sort('item_no', 1).to_list(5000)
    for i, it in enumerate(items, start=1):
        await db.items.update_one({'id': it['id']}, {'$set': {'item_no': i}})
    return {'ok': True, 'count': len(items)}

# ================= Dashboard & summary =================

@api.get("/dashboard")
async def dashboard(user: dict = Depends(current_user)):
    projects = await db.projects.find({}, {'_id': 0}).to_list(1000)
    totals = {'items': 0, 'quantity': 0, 'component_cost': 0, 'freight': 0, 'margin': 0,
             'install_hrs': 0, 'labour_cost': 0, 'selling_price': 0, 'projects': len(projects)}
    per_project = []
    for p in projects:
        items = await db.items.find({'project_id': p['id']}, {'_id': 0}).to_list(5000)
        p_total = {'id': p['id'], 'name': p['name'], 'items': len(items),
                  'selling_price': 0, 'component_cost': 0, 'labour_cost': 0}
        for raw in items:
            c = calc_item(raw, p['settings'])
            totals['items'] += 1
            totals['quantity'] += float(c['quantity'])
            totals['component_cost'] += c['total_component_cost']
            totals['freight'] += c['freight'] * float(c['quantity'])
            totals['margin'] += c['margin'] * float(c['quantity'])
            totals['install_hrs'] += c['total_install_hrs']
            totals['labour_cost'] += c['labour_cost']
            totals['selling_price'] += c['selling_price']
            p_total['selling_price'] += c['selling_price']
            p_total['component_cost'] += c['total_component_cost']
            p_total['labour_cost'] += c['labour_cost']
        per_project.append(p_total)
    return {'totals': totals, 'per_project': per_project}

@api.get("/projects/{pid}/quote")
async def quote(pid: str, user: dict = Depends(current_user)):
    p = await db.projects.find_one({'id': pid}, {'_id': 0})
    if not p:
        raise HTTPException(404)
    items = await db.items.find({'project_id': pid}, {'_id': 0}).sort('item_no', 1).to_list(5000)
    lines = []
    subtotal = 0
    for raw in items:
        c = calc_item(raw, p['settings'])
        lines.append({
            'item_no': c['item_no'], 'description': c['description'], 'brand': c.get('brand'),
            'part_no': c.get('part_no'), 'quantity': c['quantity'], 'uom': c.get('uom', 'ea'),
            'unit_cost': round(c['selling_price'] / max(c['quantity'], 1), 2),
            'total_ex_gst': round(c['selling_price'], 2),
        })
        subtotal += c['selling_price']
    gst = subtotal * p['settings']['gst_rate']
    total = subtotal + gst if not p['settings']['gst_included'] else subtotal
    sub_ex = subtotal / (1 + p['settings']['gst_rate']) if p['settings']['gst_included'] else subtotal
    gst_amt = subtotal - sub_ex if p['settings']['gst_included'] else gst
    return {'project': p, 'lines': lines, 'subtotal_ex_gst': round(sub_ex, 2),
            'gst': round(gst_amt, 2), 'total_inc_gst': round(total, 2)}

# ================= Excel import / export =================

@api.get("/projects/{pid}/export/excel")
async def export_excel(pid: str, user: dict = Depends(current_user)):
    p = await db.projects.find_one({'id': pid}, {'_id': 0})
    if not p:
        raise HTTPException(404)
    items = await db.items.find({'project_id': pid}, {'_id': 0}).sort('item_no', 1).to_list(5000)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = (p['name'] or 'Costing')[:30]
    headers = ['ITEM','DESCRIPTION','Brand','Part No','Supplier','Qty (Q)','Rate (R)','Freight (F)',
               'Margin (M)','Comp Cost (CC)','Total CC','Install (Ins)','Wiring (Wr)',
               'Total Install (TI)','Labour Cost (LC)','Selling Price (SP)']
    header_fill = PatternFill('solid', fgColor='0F172A')
    header_font = Font(color='FFFFFF', bold=True)
    for col, h in enumerate(headers, 1):
        c = ws.cell(1, col, h); c.fill = header_fill; c.font = header_font; c.alignment = Alignment(horizontal='center')
    totals = {'ccq': 0, 'sp': 0, 'f': 0, 'm': 0, 'lc': 0}
    for i, raw in enumerate(items, start=2):
        c = calc_item(raw, p['settings'])
        row = [c['item_no'], c['description'], c.get('brand') or '', c.get('part_no') or '', c.get('supplier') or '',
               c['quantity'], c['rate'], c['freight'], c['margin'], c['component_cost'], c['total_component_cost'],
               c['install_hrs'], c['wiring_hrs'], c['total_install_hrs'], c['labour_cost'], c['selling_price']]
        for col, v in enumerate(row, 1):
            ws.cell(i, col, v)
        totals['ccq'] += c['total_component_cost']; totals['sp'] += c['selling_price']
        totals['f'] += c['freight']*c['quantity']; totals['m'] += c['margin']*c['quantity']; totals['lc'] += c['labour_cost']
    tr = len(items) + 3
    ws.cell(tr, 1, 'TOTAL').font = Font(bold=True)
    ws.cell(tr, 8, round(totals['f'], 2)); ws.cell(tr, 9, round(totals['m'], 2))
    ws.cell(tr, 11, round(totals['ccq'], 2)); ws.cell(tr, 15, round(totals['lc'], 2))
    ws.cell(tr, 16, round(totals['sp'], 2)).font = Font(bold=True)
    for col in range(1, 17):
        ws.column_dimensions[chr(64+col)].width = 16
    ws.column_dimensions['B'].width = 50
    buf = io.BytesIO(); wb.save(buf); buf.seek(0)
    fn = f"{p['name'].replace(' ', '_')}_costing.xlsx"
    return StreamingResponse(buf, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                             headers={'Content-Disposition': f'attachment; filename="{fn}"'})

@api.post("/projects/{pid}/import/excel")
async def import_excel(pid: str, file: UploadFile = File(...), user: dict = Depends(require_role('admin', 'estimator'))):
    p = await db.projects.find_one({'id': pid}, {'_id': 0})
    if not p:
        raise HTTPException(404)
    data = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
    ws = wb.active
    # Find header row
    header_row = None
    for r in range(1, min(20, ws.max_row + 1)):
        vals = [str(ws.cell(r, c).value or '').lower() for c in range(1, min(30, ws.max_column + 1))]
        if any('description' in v for v in vals) and any('rate' in v for v in vals):
            header_row = r; break
    if header_row is None:
        raise HTTPException(400, "Could not find header row")
    headers = {}
    for c in range(1, ws.max_column + 1):
        v = str(ws.cell(header_row, c).value or '').lower()
        if 'item' in v and 'no' not in v and 'desc' not in v: headers['item_no'] = c
        elif 'equipment' in v or 'description' in v: headers['description'] = c
        elif v.strip() == 'brand': headers['brand'] = c
        elif 'part' in v: headers['part_no'] = c
        elif 'supplier' in v: headers['supplier'] = c
        elif 'qty' in v or v.startswith('q'): headers.setdefault('quantity', c)
        elif 'rate' in v: headers['rate'] = c
        elif 'install' in v and 'total' not in v: headers.setdefault('install_hrs', c)
        elif 'wiring' in v: headers['wiring_hrs'] = c
    imported = 0
    last = await db.items.find({'project_id': pid}).sort('item_no', -1).limit(1).to_list(1)
    next_no = (last[0]['item_no'] + 1) if last else 1
    for r in range(header_row + 1, ws.max_row + 1):
        desc = ws.cell(r, headers.get('description', 2)).value
        if not desc or str(desc).strip() == '' or 'total' in str(desc).lower() or 'sum' in str(desc).lower():
            continue
        try:
            it = EquipmentItem(
                project_id=pid, item_no=next_no, description=str(desc).strip(),
                brand=str(ws.cell(r, headers['brand']).value or '') if 'brand' in headers else '',
                part_no=str(ws.cell(r, headers['part_no']).value or '') if 'part_no' in headers else '',
                supplier=str(ws.cell(r, headers['supplier']).value or '') if 'supplier' in headers else '',
                quantity=float(ws.cell(r, headers.get('quantity', 6)).value or 1),
                rate=float(ws.cell(r, headers.get('rate', 7)).value or 0),
                install_hrs=float(ws.cell(r, headers.get('install_hrs', 12)).value or 0) if 'install_hrs' in headers else 0,
                wiring_hrs=float(ws.cell(r, headers.get('wiring_hrs', 13)).value or 0) if 'wiring_hrs' in headers else 0,
            )
            await db.items.insert_one(it.model_dump())
            next_no += 1; imported += 1
        except Exception as e:
            logger.warning(f"skip row {r}: {e}")
    return {'imported': imported}

# ================= PDF export =================

@api.get("/projects/{pid}/export/pdf")
async def export_pdf(pid: str, user: dict = Depends(current_user)):
    p = await db.projects.find_one({'id': pid}, {'_id': 0})
    if not p:
        raise HTTPException(404)
    q = await quote(pid, user)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=15*mm, rightMargin=15*mm, topMargin=15*mm, bottomMargin=15*mm)
    styles = getSampleStyleSheet()
    title = ParagraphStyle('t', parent=styles['Heading1'], textColor=colors.HexColor('#0F172A'), fontSize=20)
    sub = ParagraphStyle('s', parent=styles['Normal'], textColor=colors.HexColor('#475569'), fontSize=10)
    story = [
        Paragraph("BIIG ENERGY", title),
        Paragraph("Equipment Quotation", sub), Spacer(1, 6*mm),
        Paragraph(f"<b>Project:</b> {p['name']}", styles['Normal']),
        Paragraph(f"<b>Client:</b> {p.get('client','')}", styles['Normal']),
        Paragraph(f"<b>Date:</b> {datetime.now().strftime('%d %b %Y')}", styles['Normal']),
        Paragraph(f"<b>Currency:</b> {p['settings']['currency']}", styles['Normal']),
        Spacer(1, 4*mm),
    ]
    if p.get('description'):
        story += [Paragraph(f"<b>Description</b>", styles['Heading3']), Paragraph(p['description'], styles['Normal']), Spacer(1, 3*mm)]
    data = [['#', 'Description', 'Qty', 'UoM', 'Unit (ex GST)', 'Total (ex GST)']]
    for ln in q['lines']:
        data.append([ln['item_no'], Paragraph(ln['description'][:120], styles['Normal']), f"{ln['quantity']:g}",
                     ln['uom'], f"{ln['unit_cost']:,.2f}", f"{ln['total_ex_gst']:,.2f}"])
    data.append(['', '', '', '', 'Subtotal (ex GST)', f"{q['subtotal_ex_gst']:,.2f}"])
    data.append(['', '', '', '', f"GST ({int(p['settings']['gst_rate']*100)}%)", f"{q['gst']:,.2f}"])
    data.append(['', '', '', '', 'TOTAL (inc GST)', f"{q['total_inc_gst']:,.2f}"])
    t = Table(data, colWidths=[12*mm, 85*mm, 15*mm, 15*mm, 25*mm, 28*mm], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-3), 0.25, colors.HexColor('#CBD5E1')),
        ('ALIGN', (2,1), (-1,-1), 'RIGHT'),
        ('FONTNAME', (-2,-1), (-1,-1), 'Helvetica-Bold'),
        ('BACKGROUND', (-2,-1), (-1,-1), colors.HexColor('#F1F5F9')),
        ('BACKGROUND', (-2,-3), (-1,-3), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (-2,-2), (-1,-2), colors.HexColor('#F8FAFC')),
    ]))
    story.append(t); story.append(Spacer(1, 6*mm))
    if p.get('notes'):
        story += [Paragraph("<b>Notes</b>", styles['Heading3']), Paragraph(p['notes'].replace('\n', '<br/>'), styles['Normal']), Spacer(1, 3*mm)]
    if p.get('exclusions'):
        story += [Paragraph("<b>Exclusions</b>", styles['Heading3']), Paragraph(p['exclusions'].replace('\n', '<br/>'), styles['Normal']), Spacer(1, 3*mm)]
    if p.get('terms'):
        story += [Paragraph("<b>Terms &amp; Conditions</b>", styles['Heading3']), Paragraph(p['terms'].replace('\n', '<br/>'), styles['Normal'])]
    doc.build(story); buf.seek(0)
    fn = f"{p['name'].replace(' ', '_')}_quotation.pdf"
    return StreamingResponse(buf, media_type='application/pdf',
                             headers={'Content-Disposition': f'attachment; filename="{fn}"'})

# ================= Backup / restore =================

@api.get("/backup")
async def backup(user: dict = Depends(require_role('admin'))):
    projects = await db.projects.find({}, {'_id': 0}).to_list(5000)
    items = await db.items.find({}, {'_id': 0}).to_list(50000)
    return {'projects': projects, 'items': items, 'exported_at': datetime.now(timezone.utc).isoformat()}

@api.post("/restore")
async def restore(data: dict, user: dict = Depends(require_role('admin'))):
    if 'projects' not in data or 'items' not in data:
        raise HTTPException(400, "Invalid backup")
    await db.projects.delete_many({})
    await db.items.delete_many({})
    if data['projects']:
        await db.projects.insert_many([dict(p) for p in data['projects']])
    if data['items']:
        await db.items.insert_many([dict(i) for i in data['items']])
    return {'ok': True, 'projects': len(data['projects']), 'items': len(data['items'])}

@api.get("/")
async def root(): return {"service": "BIIG Energy Costing API", "status": "ok"}

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"], allow_headers=["*"],
)
logging.basicConfig(level=logging.INFO)

# ================= Seed =================

SEED_DB1 = [
    (1, 'DB-1 Enclosure', '', '', '', 1, 5000, 3, 2),
    (2, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 841.8654, 2, 2),
    (3, 'SCHNEIDER 10kA 3P 32A ACTi9 MCB', 'Schneider', 'A9F44332', '', 1, 60.057, 1, 2),
    (4, '100mm X 100mm PVC SLOTTED DUCT', '', '', '', 2, 100, 2, 0),
    (5, '20 x 6.3 Cu BAR', '', '', '', 1, 500, 1, 3),
    (6, '50mm INSULATOR', '', '', '', 2, 100, 0.5, 0),
    (7, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 935.406, 1, 2),
    (8, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 935.406, 1, 2),
    (9, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 935.406, 1, 2),
    (10, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 935.406, 1, 2),
    (11, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 935.406, 1, 2),
    (12, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 935.406, 1, 2),
    (13, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 935.406, 1, 2),
    (14, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 935.406, 1, 2),
    (15, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 935.406, 1, 2),
    (16, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 935.406, 1, 2),
    (17, 'SCHNEIDER 10kA 3P 32A ACTi9 MCB', 'Schneider', 'A9F44332', 'RS Online', 1, 60.057, 0.5, 1),
    (18, 'SCHNEIDER 10kA 3P 32A ACTi9 MCB', 'Schneider', 'A9F44332', 'RS Online', 1, 60.057, 0.5, 1),
    (19, 'SCHNEIDER 10kA 3P 32A ACTi9 MCB', 'Schneider', 'A9F44332', 'RS Online', 1, 60.057, 0.5, 1),
    (20, 'SCHNEIDER 10kA 3P 32A ACTi9 MCB', 'Schneider', 'A9F44332', 'RS Online', 1, 60.057, 0.5, 1),
    (21, 'SCHNEIDER 10kA 3P 32A ACTi9 MCB', 'Schneider', 'A9F44332', 'RS Online', 1, 60.057, 0.5, 1),
    (22, 'SCHNEIDER 10kA 3P 32A ACTi9 MCB', 'Schneider', 'A9F44332', 'RS Online', 1, 60.057, 0.5, 1),
    (23, 'SCHNEIDER 10kA 3P 32A ACTi9 MCB', 'Schneider', 'A9F44332', 'RS Online', 1, 60.057, 0.5, 1),
    (24, 'SCHNEIDER 10kA 3P 32A ACTi9 MCB', 'Schneider', 'A9F44332', 'RS Online', 1, 60.057, 0.5, 1),
    (25, 'SCHNEIDER 10kA 3P 32A ACTi9 MCB', 'Schneider', 'A9F44332', 'RS Online', 1, 60.057, 0.5, 1),
    (26, 'SCHNEIDER 10kA 3P 32A ACTi9 MCB', 'Schneider', 'A9F44332', 'RS Online', 1, 60.057, 0.5, 1),
    (27, 'SCHNEIDER 10kA 3P 32A ACTi9 MCB', 'Schneider', 'A9F44332', 'RS Online', 1, 60.057, 0.5, 1),
    (28, 'SCHNEIDER 36 POLE 250A MCB CHASSIS BOTTOM FED', 'Schneider', 'SAU25036183', 'RS Online', 1, 543.15, 3, 3),
    (29, 'SCHNEIDER 3P+N 40kA DIN SURGE (A9L40600)', 'Schneider', 'A9L40600', 'RS Online', 1, 2641.66, 2, 3),
    (30, 'SCHNEIDER 25kA 3P 250A MCCB CVS250B + TM250D @ 250A', 'Schneider', 'LV525306', 'RS Online', 1, 1318.59, 4, 3),
]

SEED_SMSD = [
    (1, 'SMSD Enclosure', '', '', '', 1, 8500, 3, 0),
    (2, '80mm X 80mm PVC SLOTTED DUCT', '', '', 'RS Online', 1, 200, 3, 0),
    (3, '100mm X 100mm PVC SLOTTED DUCT', '', '', '', 2, 100, 3, 0),
    (4, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 844.8654, 1, 2),
    (5, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 845.8654, 1, 2),
    (6, 'SCHNEIDER 25kA 3P MCCB CVS100B + TM32D @ 32A', 'Schneider', 'LV510302', 'RS Online', 1, 595.92, 1, 2),
    (7, 'SCHNEIDER 25kA 3P MCCB CVS100B + TM32D @ 32A', 'Schneider', 'LV510302', 'RS Online', 1, 595.92, 1, 2),
    (8, '35mm INSULATORS', '', '', 'RS Online', 8, 200, 3, 0),
    (9, '30mm X 10mm RE CU BAR', '', '', 'RS Online', 1, 1000, 3, 0),
    (10, 'IPD NB 6 K 6 POLE NEUTRAL BAR + FEET', '', '', 'RS Online', 2, 850.8654, 3, 0),
    (11, 'EB 6 6 POLE EARTH BAR', '', '', 'RS Online', 2, 1000, 3, 2),
    (12, 'IPD EXTERNAL LIGHTING KIT (LCKD-EP)', '', '', 'RS Online', 1, 0, 3, 3),
    (13, 'SCHNEIDER 1P 10A MCB (A9F441010)', 'Schneider', 'A9F44110', 'RS Online', 1, 22.47, 3, 2),
    (14, 'SCHNEIDER 1P 10A RCBO (A9D61810)', 'Schneider', 'A9D61810', 'RS Online', 2, 110.33, 3, 2),
    (15, 'SCHNEIDER 12 POLE MCB CHASSIS (C325123-BF)', 'Schneider', '', 'RS Online', 1, 855.8654, 3, 2),
    (16, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 856.8654, 1, 2),
    (17, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 857.8654, 1, 2),
    (18, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 858.8654, 1, 2),
    (19, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 859.8654, 1, 2),
    (20, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 860.8654, 1, 2),
    (21, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 861.8654, 1, 2),
    (22, 'SCHNEIDER 3P DIRECT CONNECT METER (iEM3250)', 'Schneider', 'A9MEM3250', 'RS Online', 1, 862.8654, 1, 2),
    (23, 'SCHNEIDER 3P+N DIN SURGE (A9L40600)', 'Schneider', 'A9L40600', 'RS Online', 1, 2641.66, 2, 2),
    (24, 'SCHNEIDER 25kA 3P MCCB CVS100B + TM32D @ 32A', 'Schneider', 'LV510302', 'RS Online', 1, 595.92, 1, 2),
    (25, 'SCHNEIDER 25kA 3P MCCB CVS100B + TM32D @ 32A', 'Schneider', 'LV510302', 'RS Online', 1, 595.92, 1, 2),
    (26, 'SCHNEIDER 25kA 3P MCCB CVS100B + TM32D @ 32A', 'Schneider', 'LV510302', 'RS Online', 1, 595.92, 1, 2),
    (27, 'SCHNEIDER 25kA 3P MCCB CVS100B + TM63D @ 63A', 'Schneider', 'LV510305', 'RS Online', 1, 440.86, 3, 2),
    (28, 'SCHNEIDER 25kA 3P MCCB CVS100B + TM63D @ 63A', 'Schneider', 'LV510305', 'RS Online', 1, 440.86, 3, 2),
    (29, 'SCHNEIDER 25kA 3P MCCB CVS100B + TM32D @ 32A', 'Schneider', 'LV510302', 'RS Online', 1, 595.92, 1, 2),
    (30, 'SCHNEIDER 25kA 3P MCCB CVS100B + TM32D @ 32A', 'Schneider', 'LV510302', 'RS Online', 1, 595.92, 1, 2),
    (31, 'SCHNEIDER 25kA 3P MCCB CVS100B + TM63D @ 63A', 'Schneider', 'LV510305', 'RS Online', 1, 440.86, 3, 2),
    (32, 'SCHNEIDER 25kA 3P MCCB CVS250B + TM250D @ 250A', 'Schneider', 'LV525306', 'RS Online', 1, 1318.59, 3, 2),
    (33, 'SCHNEIDER 25kA 3P MCCB CVS250B + TM250D @ 250A', 'Schneider', 'LV525306', 'RS Online', 1, 1318.59, 3, 2),
    (34, 'SCHNEIDER 36 POLE MCB CHASSIS BOTTOM FED', 'Schneider', 'SAU25036183', 'RS Online', 1, 548.64, 3, 2),
    (35, 'SCHNEIDER 3P 630A MCCB 36kA CVS630F @ 300A', 'Schneider', 'LV563306', 'RS Online', 1, 2331.7, 3, 3),
    (36, 'IPD SC32H FUSE CARRIER / NS6 CART (x6)', '', '', '', 3, 876.8654, 3, 2),
    (37, 'IPD SC32H FUSE CARRIER / NS32 CART (x6)', '', '', '', 3, 877.8654, 3, 2),
    (38, 'WESTERN POWER "T" TYPE CTs', '', '', '', 3, 0, 0, 0),
    (39, 'WESTERN POWER 600x600 meter panel', '', '', '', 1, 0, 0, 0),
    (40, 'SCHNEIDER 3P 630A MCCB 36kA CVS630F @ 300A', 'Schneider', 'LV563306', 'RS Online', 1, 2331.7, 3, 3),
]

@app.on_event("startup")
async def seed():
    # Seed users
    if await db.users.count_documents({}) == 0:
        logger.info("Seeding users…")
        users = [
            ('admin@biigenergy.com', 'admin123', 'Admin User', 'admin'),
            ('estimator@biigenergy.com', 'estimator123', 'Estimator User', 'estimator'),
            ('viewer@biigenergy.com', 'viewer123', 'Viewer User', 'viewer'),
        ]
        for email, pw, name, role in users:
            u = User(email=email, name=name, role=role)
            doc = u.model_dump(); doc['password_hash'] = hash_pw(pw)
            await db.users.insert_one(doc)
    # Seed projects + items
    if await db.projects.count_documents({}) == 0:
        logger.info("Seeding projects from Costing Template…")
        for proj_name, rows, client, desc in [
            ('DB-1 & 2 Component Costing', SEED_DB1, 'Demo Client Pty Ltd',
             'Distribution Board DB-1 & DB-2: Supply and install all components including custom-fabricated enclosure, bus-bars and internal wiring.'),
            ('SMSD — Site Main Switch Board', SEED_SMSD, 'Demo Client Pty Ltd',
             'Site Main Switch Board: Supply and install all components including custom-fabricated enclosure, bus-bars and internal wiring.'),
        ]:
            p = Project(name=proj_name, client=client, description=desc,
                       notes='Lead time 6-8 weeks from PO.\nAll work carried out in accordance with AS/NZS 3000.',
                       exclusions='Civil works\nAfter-hours labour\nCommissioning witness tests',
                       terms='Payment terms: 30 days from invoice.\nQuotation valid for 30 days.\nPrices in AUD excl. GST unless stated.')
            pdoc = p.model_dump()
            await db.projects.insert_one(pdoc)
            for (no, d, br, pn, sup, qty, rate, ins, wr) in rows:
                it = EquipmentItem(project_id=p.id, item_no=no, description=d, brand=br, part_no=pn,
                                   supplier=sup, quantity=qty, rate=rate, install_hrs=ins, wiring_hrs=wr)
                await db.items.insert_one(it.model_dump())
        logger.info("Seed complete.")

@app.on_event("shutdown")
async def shutdown():
    client.close()
