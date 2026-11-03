# Project soft-delete / Recently-deleted bin, real data integrity, PDF branding. Only TEST_ data touched.
import os, io, uuid, pytest, requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"
REAL = {'Smart BEMS': None, 'DB-1 & 2 Component Costing': 30, 'SMSD': 40, 'RTO123': 72}


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={'email': email, 'password': pw})
    return r


@pytest.fixture(scope='module')
def s():
    r = _login('admin@biigenergy.com', 'admin123')
    if r.status_code != 200:
        pytest.skip('admin login failed')
    ses = requests.Session()
    ses.headers.update({'Authorization': f"Bearer {r.json()['token']}"})
    return ses


@pytest.fixture(scope='module')
def role_sessions(s):
    created, out = [], {}
    for role in ('estimator', 'viewer'):
        email = f"test_{role}_{uuid.uuid4().hex[:6]}@example.com"
        r = s.post(f"{API}/auth/register", json={'email': email, 'name': f'TEST_{role}', 'password': 'Test1234!', 'role': role})
        assert r.status_code == 200, r.text
        created.append(r.json()['id'])
        t = _login(email, 'Test1234!').json()['token']
        ses = requests.Session(); ses.headers.update({'Authorization': f'Bearer {t}'})
        out[role] = ses
    yield out
    for uid in created:
        s.delete(f"{API}/auth/users/{uid}")


# --- Auth basics
def test_wrong_password_401():
    assert _login('admin@biigenergy.com', 'nope').status_code == 401


# --- Real data integrity
def test_real_projects_present(s):
    projs = s.get(f"{API}/projects").json()
    names = [p['name'] for p in projs if not p['name'].startswith('TEST_')]
    print('projects:', [(p['name'], p['id']) for p in projs])
    for n in REAL:
        assert any(x.startswith(n) for x in names), f"missing {n}"
    for p in projs:
        exp = next((v for k, v in REAL.items() if p['name'].startswith(k)), None)
        if exp is not None:
            items = s.get(f"{API}/projects/{p['id']}/items").json()
            print(p['name'], len(items))
            assert len(items) == exp


def test_library_lines_total(s):
    lib = s.get(f"{API}/library").json()
    total = sum(r['lines'] for r in lib)
    print('library rows', len(lib), 'lines', total)
    assert total >= 149


def test_library_pdf_branding(s):
    r = s.get(f"{API}/library/export", params={'fmt': 'pdf'})
    assert r.status_code == 200 and r.content[:4] == b'%PDF'
    try:
        from pypdf import PdfReader
        txt = PdfReader(io.BytesIO(r.content)).pages[0].extract_text()
        print(txt[:200])
        assert 'Costing System' in txt and 'BiiG Quote' not in txt
    except ImportError:
        pytest.skip('pypdf not installed')


# --- Trash flow
def test_trash_rbac(s, role_sessions):
    for role, ses in role_sessions.items():
        assert ses.get(f"{API}/trash/projects").status_code == 403, role
    assert s.get(f"{API}/trash/projects").status_code == 200


def test_restore_unknown_404(s):
    assert s.post(f"{API}/trash/projects/{uuid.uuid4()}/restore").status_code == 404
    assert s.delete(f"{API}/trash/projects/{uuid.uuid4()}").status_code == 404


def test_delete_restore_purge_flow(s, role_sessions):
    p = s.post(f"{API}/projects", json={'name': 'TEST_TrashFlow', 'client': 'TEST_C'}).json()
    pid = p['id']
    for d in ('TEST_item A', 'TEST_item B'):
        r = s.post(f"{API}/projects/{pid}/items", json={'description': d, 'quantity': 2, 'rate': 10})
        assert r.status_code == 200, r.text
    # non-admin can't delete
    assert role_sessions['estimator'].delete(f"{API}/projects/{pid}").status_code == 403
    assert s.delete(f"{API}/projects/{pid}").status_code == 200
    assert all(x['id'] != pid for x in s.get(f"{API}/projects").json())
    assert s.get(f"{API}/projects/{pid}").status_code == 404
    trash = s.get(f"{API}/trash/projects").json()
    row = next(x for x in trash if x['id'] == pid)
    assert row['item_count'] == 2 and row['deleted_at'] and '_id' not in row
    # restore
    r = s.post(f"{API}/trash/projects/{pid}/restore")
    assert r.status_code == 200 and r.json()['items'] == 2
    assert s.get(f"{API}/projects/{pid}").json()['name'] == 'TEST_TrashFlow'
    items = s.get(f"{API}/projects/{pid}/items").json()
    assert sorted(i['description'] for i in items) == ['TEST_item A', 'TEST_item B']
    assert 'deleted_at' not in s.get(f"{API}/projects/{pid}").json()
    assert all(x['id'] != pid for x in s.get(f"{API}/trash/projects").json())
    # delete again then purge
    s.delete(f"{API}/projects/{pid}")
    assert s.delete(f"{API}/trash/projects/{pid}").status_code == 200
    assert all(x['id'] != pid for x in s.get(f"{API}/trash/projects").json())
    assert s.post(f"{API}/trash/projects/{pid}/restore").status_code == 404
    # cleanup orphan components auto-created from items
    for c in s.get(f"{API}/library").json():
        if c['description'].startswith('TEST_item'):
            s.delete(f"{API}/components/{c['id']}")
