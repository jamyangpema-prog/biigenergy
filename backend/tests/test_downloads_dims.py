# Download (PDF/Excel) endpoints + Component dimensions (L/W/H/thickness mm). Only TEST_ data created; all cleaned up.
import os, io, pytest, requests, openpyxl

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"
PID = '37d87972-c524-4aa1-9069-51ac32ec1564'
XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'


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
    p = s.post(f"{API}/projects", json={'name': 'TEST_Dims/Proj: A'}).json()
    c = {'pid': p['id'], 'comps': []}
    yield c
    s.delete(f"{API}/projects/{p['id']}")
    for cid in c['comps']:
        s.delete(f"{API}/components/{cid}")


def _check(r, fmt):
    assert r.status_code == 200, r.text[:300]
    if fmt == 'pdf':
        assert r.headers['content-type'].startswith('application/pdf')
        assert r.content[:4] == b'%PDF'
    else:
        assert r.headers['content-type'].startswith(XLSX)
        openpyxl.load_workbook(io.BytesIO(r.content))
    assert 'attachment' in r.headers.get('content-disposition', '')


# --- Downloads on real project (read-only) ---
@pytest.mark.parametrize('fmt', ['pdf', 'xlsx'])
def test_library_export(s, fmt):
    _check(s.get(f"{API}/library/export", params={'fmt': fmt}), fmt)


@pytest.mark.parametrize('fmt', ['pdf', 'xlsx'])
def test_costing_export(s, fmt):
    _check(s.get(f"{API}/projects/{PID}/export/costing", params={'fmt': fmt}), fmt)


@pytest.mark.parametrize('tab', ['costing', 'component', 'labour', 'sp', 'compare'])
@pytest.mark.parametrize('fmt', ['pdf', 'xlsx'])
def test_report_export(s, tab, fmt):
    _check(s.get(f"{API}/projects/{PID}/export/report", params={'tab': tab, 'fmt': fmt}), fmt)


@pytest.mark.parametrize('fmt', ['pdf', 'xlsx'])
def test_quote_export(s, fmt):
    _check(s.get(f"{API}/projects/{PID}/export/quote", params={'fmt': fmt}), fmt)


@pytest.mark.parametrize('url', ['/library/export', f'/projects/{PID}/export/costing', f'/projects/{PID}/export/report',
                                 f'/projects/{PID}/export/quote'])
def test_invalid_fmt_400(s, url):
    assert s.get(f"{API}{url}", params={'fmt': 'csv'}).status_code == 400


def test_invalid_tab_400(s):
    assert s.get(f"{API}/projects/{PID}/export/report", params={'tab': 'bogus', 'fmt': 'pdf'}).status_code == 400


@pytest.mark.parametrize('url', ['/library/export?fmt=pdf', f'/projects/{PID}/export/costing?fmt=pdf',
                                 f'/projects/{PID}/export/report?tab=costing&fmt=xlsx', f'/projects/{PID}/export/quote?fmt=xlsx'])
def test_requires_auth(url):
    assert requests.get(f"{API}{url}").status_code in (401, 403)


def test_unknown_project_404(s):
    assert s.get(f"{API}/projects/nope-xyz/export/costing", params={'fmt': 'pdf'}).status_code == 404


# --- Component dims ---
def test_component_dims_roundtrip(s, ctx):
    c = s.post(f"{API}/components", json={'description': 'TEST_DimsComp', 'rate': 10}).json()
    ctx['comps'].append(c['id'])
    assert c.get('length_mm') is None and c.get('thickness_mm') is None
    body = {**c, 'length_mm': 100, 'width_mm': 50, 'height_mm': 20, 'thickness_mm': 2}
    r = s.put(f"{API}/components/{c['id']}", json=body)
    assert r.status_code == 200
    g = s.get(f"{API}/components/{c['id']}").json()['component']
    assert (g['length_mm'], g['width_mm'], g['height_mm'], g['thickness_mm']) == (100, 50, 20, 2)
    ctx['cid'] = c['id']


def test_item_details_shows_dims(s, ctx):
    it = s.post(f"{API}/projects/{ctx['pid']}/items", json={'description': 'TEST_DimsComp', 'component_id': ctx['cid'],
                                                             'quantity': 1, 'rate': 10, 'project_id': ctx['pid']}).json()
    assert it['component_id'] == ctx['cid']
    d = s.get(f"{API}/items/{it['id']}/details").json()
    assert d['component']['length_mm'] == 100 and d['component']['thickness_mm'] == 2
    ctx['iid'] = it['id']


def test_dims_nullable_reset(s, ctx):
    g = s.get(f"{API}/components/{ctx['cid']}").json()['component']
    r = s.put(f"{API}/components/{ctx['cid']}", json={**g, 'length_mm': None, 'width_mm': None, 'height_mm': None, 'thickness_mm': None})
    assert r.status_code == 200
    g = s.get(f"{API}/components/{ctx['cid']}").json()['component']
    assert g['length_mm'] is None and g['thickness_mm'] is None


def test_exports_special_chars_project(s, ctx):
    # project name containing '/' and ':' -> xlsx sheet title must not crash
    for url in ['export/costing', 'export/report?tab=costing', 'export/quote']:
        for fmt in ('pdf', 'xlsx'):
            sep = '&' if '?' in url else '?'
            r = s.get(f"{API}/projects/{ctx['pid']}/{url}{sep}fmt={fmt}")
            assert r.status_code == 200, f"{url} {fmt}: {r.status_code}"


def test_pdf_with_markup_chars(s, ctx):
    c = s.post(f"{API}/components", json={'description': 'TEST_Cable <10mm & "big"', 'rate': 1}).json()
    ctx['comps'].append(c['id'])
    r = s.get(f"{API}/library/export", params={'fmt': 'pdf'})
    s.delete(f"{API}/components/{c['id']}")
    assert r.status_code == 200, f"library pdf with '<' in description -> {r.status_code}"
