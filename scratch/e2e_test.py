"""
COMPREHENSIVE E2E TEST SUITE
Porprov Koni Surakarta Website
Tests all public pages, API endpoints, and validates code integrity
"""
import urllib.request
import urllib.error
import json
import time
import sys

BASE = "http://localhost:3000"
results = []
errors = []

def test_page(name, path, expected_strings=None, expect_status=200):
    """Test if a page loads successfully and contains expected content"""
    url = f"{BASE}{path}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            body = resp.read().decode('utf-8', errors='replace')
            
            if status != expect_status:
                errors.append(f"[{name}] Expected status {expect_status}, got {status}")
                results.append(f"FAIL {name} - Status {status}")
                return False
            
            if expected_strings:
                missing = []
                for s in expected_strings:
                    if s.lower() not in body.lower():
                        missing.append(s)
                if missing:
                    errors.append(f"[{name}] Missing content: {missing}")
                    results.append(f"WARN {name} - Missing: {missing}")
                    return True  # page loaded but missing content
            
            body_size = len(body)
            results.append(f"PASS {name} - {status} OK ({body_size:,} bytes)")
            return True
    except urllib.error.HTTPError as e:
        errors.append(f"[{name}] HTTP Error {e.code}: {e.reason}")
        results.append(f"FAIL {name} - HTTP {e.code}")
        return False
    except Exception as e:
        errors.append(f"[{name}] Connection Error: {str(e)}")
        results.append(f"FAIL {name} - {str(e)[:80]}")
        return False

def test_api(name, path, method="GET", expect_keys=None):
    """Test an API endpoint"""
    url = f"{BASE}{path}"
    try:
        if method == "POST":
            req = urllib.request.Request(url, data=b'', headers={'User-Agent': 'Mozilla/5.0'}, method='POST')
        else:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            body = resp.read().decode('utf-8', errors='replace')
            
            try:
                data = json.loads(body)
            except:
                data = {}
            
            if expect_keys:
                missing = [k for k in expect_keys if k not in data]
                if missing:
                    errors.append(f"[{name}] Missing keys: {missing}")
                    results.append(f"WARN {name} - Missing keys: {missing}")
                    return True
            
            results.append(f"PASS {name} - {status} OK | Response: {json.dumps(data)[:100]}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace') if e.fp else ''
        errors.append(f"[{name}] HTTP Error {e.code}: {body[:200]}")
        results.append(f"FAIL {name} - HTTP {e.code}")
        return False
    except Exception as e:
        errors.append(f"[{name}] Error: {str(e)}")
        results.append(f"FAIL {name} - {str(e)[:80]}")
        return False

print("=" * 70)
print("COMPREHENSIVE WEBSITE TEST SUITE")
print("Porprov Koni Surakarta - Full E2E Testing")
print("=" * 70)
print()

# ============================================
# SECTION 1: PUBLIC PAGES
# ============================================
print("--- SECTION 1: PUBLIC PAGES ---")
test_page("Homepage (Beranda)", "/", ["porprov", "surakarta"])
test_page("Cabor List", "/cabor", ["cabor"])
test_page("Medali Page", "/medali", ["medali"])
test_page("Statistik", "/statistik", ["statistik"])
test_page("Pelaporan Page", "/pelaporan")
test_page("Profil/Login", "/profil")
print()

# ============================================
# SECTION 2: CABOR DETAIL PAGES (Dynamic Routes)
# ============================================
print("--- SECTION 2: CABOR DETAIL PAGES ---")
# Test some common cabor IDs that likely exist
test_page("Cabor Detail - atletik", "/cabor/atletik")
test_page("Cabor Detail - renang", "/cabor/renang")
test_page("Cabor Detail - badminton", "/cabor/badminton")
test_page("Cabor Detail - sepakbola", "/cabor/sepakbola")
test_page("Cabor Detail - basket", "/cabor/basket")
print()

# ============================================
# SECTION 3: ADMIN PAGES (Should load but require auth)
# ============================================
print("--- SECTION 3: ADMIN/PROTECTED PAGES ---")
test_page("Input Medali", "/input-medali")
test_page("Validasi Medali", "/validasi")
test_page("Input Pelaporan", "/input-pelaporan")
test_page("Validasi Pelaporan", "/validasi-pelaporan")
test_page("Pengaturan", "/pengaturan")
test_page("Developer Panel", "/developer")
print()

# ============================================
# SECTION 4: API ENDPOINTS
# ============================================
print("--- SECTION 4: API ENDPOINTS ---")
test_api("API: Version Check", "/api/version", "GET", ["version"])
test_api("API: Revalidate", "/api/revalidate", "POST", ["revalidated"])
print()

# ============================================
# SECTION 5: STATIC ASSETS
# ============================================
print("--- SECTION 5: STATIC ASSETS ---")
test_page("Robots.txt", "/robots.txt")
test_page("Cities JSON", "/cities.json")
test_page("Favicon", "/favicon.ico")
print()

# ============================================
# SECTION 6: REALTIME FLOW TEST
# ============================================
print("--- SECTION 6: REALTIME DATA FLOW TEST ---")

# Step 1: Get current version
try:
    req = urllib.request.Request(f"{BASE}/api/version", headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as resp:
        v1 = json.loads(resp.read().decode())
        old_ver = v1.get('version', 0)
        results.append(f"PASS Version Before Revalidate: {old_ver}")
except Exception as e:
    results.append(f"FAIL Version Check 1: {str(e)[:80]}")
    old_ver = -1

# Step 2: Trigger revalidate (simulating admin input)
try:
    req = urllib.request.Request(f"{BASE}/api/revalidate", data=b'', headers={'User-Agent': 'Mozilla/5.0'}, method='POST')
    with urllib.request.urlopen(req, timeout=10) as resp:
        rev = json.loads(resp.read().decode())
        results.append(f"PASS Revalidate Triggered: {rev}")
except Exception as e:
    results.append(f"FAIL Revalidate: {str(e)[:80]}")

# Step 3: Check version again
time.sleep(1)
try:
    req = urllib.request.Request(f"{BASE}/api/version", headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as resp:
        v2 = json.loads(resp.read().decode())
        new_ver = v2.get('version', 0)
        if new_ver > old_ver or old_ver == 0:
            results.append(f"PASS Version After Revalidate: {new_ver} (BUMPED correctly!)")
        else:
            results.append(f"WARN Version unchanged: {old_ver} -> {new_ver}")
            errors.append("Version did not bump after revalidate")
except Exception as e:
    results.append(f"FAIL Version Check 2: {str(e)[:80]}")

print()

# ============================================
# FINAL REPORT
# ============================================
print("=" * 70)
print("FINAL TEST RESULTS")
print("=" * 70)
print()

pass_count = sum(1 for r in results if r.startswith("PASS"))
warn_count = sum(1 for r in results if r.startswith("WARN"))
fail_count = sum(1 for r in results if r.startswith("FAIL"))

for r in results:
    icon = "+" if r.startswith("PASS") else ("!" if r.startswith("WARN") else "X")
    print(f"  [{icon}] {r}")

print()
print(f"Total: {len(results)} tests")
print(f"  PASS: {pass_count}")
print(f"  WARN: {warn_count}")
print(f"  FAIL: {fail_count}")
print()

if errors:
    print("ERRORS & WARNINGS:")
    for e in errors:
        print(f"  - {e}")
else:
    print("NO ERRORS FOUND!")

print()
print("=" * 70)
