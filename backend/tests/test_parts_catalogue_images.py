# Parts Catalogue (public API), Add-from-library, and Component Pictures tests
import os, io, struct, zlib
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"


def tiny_png():
    raw = b'\x00\xff\x00\x00'
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))


@pytest.fixture(scope="module")
def s():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@biigenergy.com", "password": "admin123"})
    if r.status_code != 200:
        pytest.skip("login failed")
    sess = requests.Session()
    sess.headers["Authorization"] = f"Bearer {r.json()['token']}"
    return sess


@pytest.fixture(scope="module")
def test_project(s):
    r = s.post(f"{API}/projects", json={"name": "TEST_LibAPI"})
    assert r.status_code == 200
    pid = r.json()["id"]
    yield pid
    s.delete(f"{API}/projects/{pid}")


# Public components API
def test_public_components_no_rates():
    r = requests.get(f"{API}/public/components")
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0
    for row in data:
        for f in ("min_rate", "max_rate", "rate"):
            assert f not in row
        for f in ("description", "brand", "part_no", "supplier", "quantity", "category", "image_path", "min_price", "max_price"):
            assert f in row


# Library contains the Schneider MCB
def test_library_has_a9f44332(s):
    r = s.get(f"{API}/library")
    assert r.status_code == 200
    m = [x for x in r.json() if x["part_no"].upper() == "A9F44332"]
    assert m, "A9F44332 not in library"
    assert m[0]["brand"].lower().startswith("schneider")
    assert abs(m[0]["rate"] - 60.057) < 0.001


# Add from library (same payload as UI) -> persists
def test_add_from_library_persists(s, test_project):
    lib = [x for x in s.get(f"{API}/library").json() if x["part_no"].upper() == "A9F44332"][0]
    payload = {k: lib[k] for k in ("description", "brand", "part_no", "supplier", "rate", "install_hrs", "wiring_hrs", "uom", "image_path")}
    payload["quantity"] = 3
    r = s.post(f"{API}/projects/{test_project}/items", json=payload)
    assert r.status_code == 200
    items = s.get(f"{API}/projects/{test_project}/items").json()
    assert len(items) == 1 and items[0]["quantity"] == 3 and items[0]["part_no"] == "A9F44332"
    assert items[0]["selling_price"] > 0
    lib2 = [x for x in s.get(f"{API}/library").json() if x["part_no"].upper() == "A9F44332"][0]
    assert any(p["id"] == test_project for p in lib2["projects"])


# Image upload / serve / remove
def test_image_lifecycle(s, test_project):
    r = s.post(f"{API}/projects/{test_project}/items", json={"description": "TEST_IMG_PART", "part_no": "TEST_IMG_PN_123", "rate": 10, "quantity": 1})
    iid = r.json()["id"]
    # non-image rejected
    bad = s.post(f"{API}/items/{iid}/image", files={"file": ("a.txt", b"hello", "text/plain")})
    assert bad.status_code == 400
    # unauth upload rejected
    un = requests.post(f"{API}/items/{iid}/image", files={"file": ("a.png", tiny_png(), "image/png")})
    assert un.status_code in (401, 403)
    up = s.post(f"{API}/items/{iid}/image", files={"file": ("a.png", tiny_png(), "image/png")})
    assert up.status_code == 200, up.text
    path = up.json()["image_path"]
    assert up.json()["updated"] == 1
    img = requests.get(f"{API}/images/{path}")
    assert img.status_code == 200
    assert img.headers["content-type"].startswith("image/png")
    assert img.content[:4] == b'\x89PNG'
    pub = [x for x in requests.get(f"{API}/public/components").json() if x["part_no"] == "TEST_IMG_PN_123"]
    assert pub and pub[0]["image_path"] == path
    rm = s.delete(f"{API}/items/{iid}/image")
    assert rm.status_code == 200
    assert requests.get(f"{API}/images/{path}").status_code == 404
    det = s.get(f"{API}/items/{iid}/details").json()
    assert det["item"]["image_path"] is None


def test_image_missing_item(s):
    r = s.post(f"{API}/items/nonexistent-xyz/image", files={"file": ("a.png", tiny_png(), "image/png")})
    assert r.status_code == 404
    assert requests.get(f"{API}/images/biig-energy/components/nope.png").status_code == 404
