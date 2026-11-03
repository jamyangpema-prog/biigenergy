# Component Library (components collection) + project-line isolation tests. Only TEST_ data is created and cleaned up.
import os, io, pytest, requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"
PNG = (b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89'
       b'\x00\x00\x00\rIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82')


@pytest.fixture(scope='module')
def s():
    r = requests.post(f"{API}/auth/login", json={'email': 'admin@biigenergy.com', 'password': 'admin123'})
    if r.status_code != 200:
        pytest.skip('login failed')
    ses = requests.Session()
    ses.headers.update({'Authorization': f"Bearer {r.json()['token']}"})
    return ses


@pytest.fixture(scope='module')
def ctx(s):
    p = s.post(f"{API}/projects", json={'name': 'TEST_LibProject'}).json()
    c = {'pid': p['id'], 'comps': []}
    yield c
    s.delete(f"{API}/projects/{p['id']}")
    for cid in c['comps']:
        s.delete(f"{API}/components/{cid}")


# --- Library listing ---
def test_library_listing(s):
    r = s.get(f"{API}/library")
    assert r.status_code == 200
    rows = [x for x in r.json() if not x['description'].startswith('TEST_')]
    assert len(rows) == 35
    assert not any(' + ' in x['description'] for x in rows)
    names = {x['description'] for x in rows}
    assert 'SCHNEIDER TM32D SET @ 32A' in names and 'IPD FEET' in names
    for x in rows:
        assert x['category'] and 'uom' in x and isinstance(x['rate'], (int, float))
    assert sum(1 for x in rows if x['lines'] > 0) >= 30


def test_component_lines_sum_to_items(s):
    rows = s.get(f"{API}/library").json()
    total_lines = sum(x['lines'] for x in rows if not x['description'].startswith('TEST_'))
    assert total_lines == 149


def test_removed_parts_catalogue_endpoint(s):
    r = s.get(f"{API}/parts")
    assert r.status_code in (404, 405)


# --- Add item manual creates library component ---
def test_add_manual_item_creates_component(s, ctx):
    r = s.post(f"{API}/projects/{ctx['pid']}/items", json={'description': 'TEST_Widget MCB', 'brand': 'TB', 'part_no': 'TEST-PN-1',
                                                         'supplier': 'TEST_OrigSup', 'quantity': 2, 'rate': 100, 'install_hrs': 1, 'wiring_hrs': 0.5})
    assert r.status_code == 200
    it = r.json()
    assert it['component_id']
    ctx['comps'].append(it['component_id']); ctx['item1'] = it['id']; ctx['cid'] = it['component_id']
    c = s.get(f"{API}/components/{it['component_id']}").json()['component']
    assert c['rate'] == 100 and c['description'] == 'TEST_Widget MCB' and c['category'] == 'Circuit Breakers'
    assert any(x['id'] == ctx['cid'] for x in s.get(f"{API}/library").json())


def test_add_from_library_links_component(s, ctx):
    r = s.post(f"{API}/projects/{ctx['pid']}/items", json={'component_id': ctx['cid'], 'description': 'TEST_Widget MCB', 'brand': 'TB',
                                                         'part_no': 'TEST-PN-1', 'supplier': 'TEST_OrigSup', 'quantity': 3, 'rate': 100})
    assert r.status_code == 200 and r.json()['component_id'] == ctx['cid']
    ctx['item2'] = r.json()['id']
    usage = s.get(f"{API}/components/{ctx['cid']}").json()['usage']
    assert len(usage) == 2
    assert len([x for x in s.get(f"{API}/library").json() if x['description'] == 'TEST_Widget MCB']) == 1


# --- Line edit does not change library ---
def test_line_edit_does_not_change_library(s, ctx):
    items = {i['id']: i for i in s.get(f"{API}/projects/{ctx['pid']}/items").json()}
    body = dict(items[ctx['item1']]); body['rate'] = 150
    r = s.put(f"{API}/items/{ctx['item1']}", json=body)
    assert r.status_code == 200
    assert r.json()['rate'] == 150 and r.json()['component_id'] == ctx['cid']
    assert r.json()['selling_price'] != items[ctx['item1']]['selling_price']
    assert s.get(f"{API}/components/{ctx['cid']}").json()['component']['rate'] == 100
    items2 = {i['id']: i for i in s.get(f"{API}/projects/{ctx['pid']}/items").json()}
    assert items2[ctx['item2']]['rate'] == 100
    det = s.get(f"{API}/items/{ctx['item1']}/details").json()
    assert det['component']['id'] == ctx['cid'] and det['item']['rate'] == 150


# --- Library edit propagates ---
def test_library_edit_propagates(s, ctx):
    c = s.get(f"{API}/components/{ctx['cid']}").json()['component']
    body = {k: c[k] for k in ('description', 'brand', 'part_no', 'supplier', 'uom', 'rate', 'install_hrs', 'wiring_hrs', 'category')}
    body.update(supplier='TEST_Sup', rate=120, uom='m')
    r = s.put(f"{API}/components/{ctx['cid']}", json=body)
    assert r.status_code == 200 and r.json()['updated'] == 2
    for it in s.get(f"{API}/projects/{ctx['pid']}/items").json():
        assert it['supplier'] == 'TEST_Sup' and it['rate'] == 120 and it['uom'] == 'm'
        assert it['quantity'] in (2, 3)  # qty untouched
    c2 = s.get(f"{API}/components/{ctx['cid']}").json()['component']
    assert c2['supplier'] == 'TEST_Sup' and c2['uom'] == 'm'


# --- Image upload syncs to lines ---
def test_component_image_upload_and_remove(s, ctx):
    r = s.post(f"{API}/components/{ctx['cid']}/image", files={'file': ('t.png', io.BytesIO(PNG), 'image/png')})
    assert r.status_code == 200, r.text
    path = r.json()['image_path']; assert r.json()['updated'] == 2
    det = s.get(f"{API}/items/{ctx['item2']}/details").json()
    assert det['item']['image_path'] == path
    assert requests.get(f"{API}/images/{path}").status_code == 200
    bad = s.post(f"{API}/components/{ctx['cid']}/image", files={'file': ('t.txt', io.BytesIO(b'hello'), 'text/plain')})
    assert bad.status_code == 400
    assert s.delete(f"{API}/components/{ctx['cid']}/image").status_code == 200
    det = s.get(f"{API}/items/{ctx['item2']}/details").json()
    assert det['item']['image_path'] is None


# --- New + delete component ---
def test_create_and_delete_component(s, ctx):
    r = s.post(f"{API}/components", json={'description': 'TEST_New Busbar', 'uom': 'm', 'rate': 9.5, 'category': 'Busbars & Insulators'})
    assert r.status_code == 200
    cid = r.json()['id']; ctx['comps'].append(cid)
    got = s.get(f"{API}/components/{cid}").json()['component']
    assert got['uom'] == 'm' and got['category'] == 'Busbars & Insulators' and got['lines'] == 0
    assert s.delete(f"{API}/components/{cid}").status_code == 200
    assert s.get(f"{API}/components/{cid}").status_code == 404


def test_component_404s(s):
    assert s.get(f"{API}/components/nonexistent").status_code == 404
    assert s.put(f"{API}/components/nonexistent", json={'description': 'x'}).status_code == 404


# --- Feeds ---
def test_feed_prices(s):
    r = s.get(f"{API}/feeds/prices")
    assert r.status_code == 200
    rows = r.json()
    keys = [x['key'] for x in rows]
    assert len(keys) == len(set(keys)) and all(x['part_no'] for x in rows)


def test_feed_apply_validation_only(s):
    assert s.post(f"{API}/feeds/apply", json={'part_no': '', 'price': 10}).status_code == 400
    assert s.post(f"{API}/feeds/apply", json={'part_no': 'TEST_NOPE', 'price': 0}).status_code == 400
    assert s.post(f"{API}/feeds/apply", json={'part_no': 'TEST_NOPE_XYZ', 'price': 10}).status_code == 404


# --- Regression totals ---
def test_regression_totals(s):
    d = s.get(f"{API}/dashboard").json()
    pp = {p['name']: round(p['selling_price'], 2) for p in d['per_project']}
    # Values match items_backup_20261103 (A9MEM3250 meter rate bulk-set to 841.8654 on 2026-11-03T02:59, before backup)
    assert pp['DB-1 & 2 Component Costing'] == 37761.72
    assert pp['SMSD — Site Main Switch Board'] == 75057.03
