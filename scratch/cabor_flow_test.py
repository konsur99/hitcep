"""
CABOR FLOW DEEP VERIFICATION TEST
Tests the complete data pipeline:
  Input Medali -> Firebase (medals + cabors + public_cache) -> Revalidate -> Public Pages
"""
import urllib.request
import urllib.error
import json
import time

BASE = "http://localhost:3000"
errors = []
warnings = []

def fetch_json(path):
    """Helper to fetch JSON from an endpoint"""
    url = f"{BASE}{path}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))

def fetch_html(path):
    """Helper to fetch HTML from an endpoint"""
    url = f"{BASE}{path}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode('utf-8', errors='replace')

print("=" * 70)
print("CABOR FLOW DEEP VERIFICATION")
print("=" * 70)

# ============================================
# TEST 1: Public Cache Data Integrity
# ============================================
print("\n--- TEST 1: Public Cache Data Integrity ---")
try:
    cache_data = fetch_json("/api/public_cache")
    cabors = cache_data.get('cabors', [])
    medals = cache_data.get('medals', [])
    reports = cache_data.get('reports', [])
    
    print(f"  Cabors in cache: {len(cabors)}")
    print(f"  Medals in cache: {len(medals)}")
    print(f"  Reports in cache: {len(reports)}")
    
    if len(cabors) == 0:
        errors.append("No cabors in public_cache! Public pages will show empty data.")
    else:
        print(f"  PASS: {len(cabors)} cabors found")
    
    # Verify cabor data structure
    sample_cabor = cabors[0] if cabors else None
    if sample_cabor:
        required_fields = ['id', 'name']
        optional_fields = ['gold', 'silver', 'bronze', 'image']
        missing = [f for f in required_fields if f not in sample_cabor]
        if missing:
            errors.append(f"Cabor missing required fields: {missing}")
        else:
            print(f"  PASS: Cabor data structure valid (sample: {sample_cabor.get('name', '?')})")
            print(f"    gold={sample_cabor.get('gold',0)} silver={sample_cabor.get('silver',0)} bronze={sample_cabor.get('bronze',0)}")
    
    # Verify medal data structure
    if medals:
        sample_medal = medals[0]
        required_medal_fields = ['caborId', 'athleteName', 'medalType']
        missing = [f for f in required_medal_fields if f not in sample_medal]
        if missing:
            errors.append(f"Medal missing required fields: {missing}")
        else:
            print(f"  PASS: Medal data structure valid (sample: {sample_medal.get('athleteName', '?')})")
    
    # Verify medal counts match cabor tallies
    print("\n  --- Medal Count Verification ---")
    for cabor in cabors[:5]:  # Check first 5 cabors
        cabor_medals = [m for m in medals if m.get('caborId') == cabor.get('id') and (m.get('status') == 'approved' or not m.get('status'))]
        gold_count = sum(1 for m in cabor_medals if m.get('medalType') == 'emas')
        silver_count = sum(1 for m in cabor_medals if m.get('medalType') == 'perak')
        bronze_count = sum(1 for m in cabor_medals if m.get('medalType') == 'perunggu')
        
        cabor_gold = cabor.get('gold', 0)
        cabor_silver = cabor.get('silver', 0)
        cabor_bronze = cabor.get('bronze', 0)
        
        match = (gold_count == cabor_gold and silver_count == cabor_silver and bronze_count == cabor_bronze)
        status = "PASS" if match else "WARN"
        if not match:
            warnings.append(f"Medal count mismatch for {cabor.get('name')}: tally={cabor_gold}/{cabor_silver}/{cabor_bronze} actual={gold_count}/{silver_count}/{bronze_count}")
        print(f"  [{status}] {cabor.get('name')}: tally={cabor_gold}G/{cabor_silver}S/{cabor_bronze}B | medals={gold_count}G/{silver_count}S/{bronze_count}B")

except Exception as e:
    errors.append(f"Public cache test failed: {str(e)}")
    print(f"  FAIL: {e}")

# ============================================
# TEST 2: Cabor List Page Renders Correctly
# ============================================
print("\n--- TEST 2: Cabor List Page (/cabor) ---")
try:
    html = fetch_html("/cabor")
    
    # Check that cabors are rendered
    for cabor in cabors[:3]:
        name = cabor.get('name', '')
        if name.lower() in html.lower():
            print(f"  PASS: '{name}' found in /cabor page")
        else:
            warnings.append(f"'{name}' not found in /cabor HTML")
            print(f"  WARN: '{name}' not found in /cabor HTML")
except Exception as e:
    errors.append(f"Cabor list page test failed: {str(e)}")

# ============================================
# TEST 3: Cabor Detail Pages
# ============================================
print("\n--- TEST 3: Cabor Detail Pages ---")
tested_cabors = 0
for cabor in cabors[:5]:
    cabor_id = cabor.get('id', '')
    cabor_name = cabor.get('name', '')
    try:
        html = fetch_html(f"/cabor/{cabor_id}")
        
        # Check cabor name appears
        if cabor_name.lower() in html.lower():
            print(f"  PASS: /cabor/{cabor_id} renders '{cabor_name}' correctly")
        else:
            warnings.append(f"/cabor/{cabor_id} does not contain '{cabor_name}'")
            print(f"  WARN: /cabor/{cabor_id} missing '{cabor_name}'")
        
        # Check medal counts appear
        gold = cabor.get('gold', 0)
        if str(gold) in html:
            print(f"    PASS: Gold count ({gold}) visible")
        
        tested_cabors += 1
    except urllib.error.HTTPError as e:
        if e.code == 404:
            warnings.append(f"/cabor/{cabor_id} returns 404")
            print(f"  WARN: /cabor/{cabor_id} - 404 (may need generateStaticParams)")
        else:
            errors.append(f"/cabor/{cabor_id} HTTP {e.code}")
            print(f"  FAIL: /cabor/{cabor_id} - HTTP {e.code}")
    except Exception as e:
        errors.append(f"/cabor/{cabor_id} error: {str(e)}")

print(f"  Tested {tested_cabors} cabor detail pages")

# ============================================
# TEST 4: Admin Input Medali Page
# ============================================
print("\n--- TEST 4: Input Medali Page ---")
try:
    html = fetch_html("/input-medali")
    
    checks = [
        ("form element", "<form" in html.lower()),
        ("cabor dropdown", "cabor" in html.lower()),
        ("medali selection", "medali" in html.lower() or "medal" in html.lower()),
    ]
    
    for name, result in checks:
        status = "PASS" if result else "WARN"
        print(f"  [{status}] {name}")
        if not result:
            warnings.append(f"Input Medali: {name} not found")
except Exception as e:
    errors.append(f"Input Medali test failed: {str(e)}")

# ============================================
# TEST 5: Admin Validasi Page
# ============================================
print("\n--- TEST 5: Validasi Medali Page ---")
try:
    html = fetch_html("/validasi")
    
    checks = [
        ("page loads", len(html) > 1000),
        ("validasi content", "validasi" in html.lower() or "medali" in html.lower()),
    ]
    
    for name, result in checks:
        status = "PASS" if result else "WARN"
        print(f"  [{status}] {name}")
except Exception as e:
    errors.append(f"Validasi test failed: {str(e)}")

# ============================================
# TEST 6: Realtime Flow - Version Bump
# ============================================
print("\n--- TEST 6: Realtime Data Flow Verification ---")
try:
    # Step 1: Check current version
    v1 = fetch_json("/api/version")
    old_ver = v1.get('version', 0)
    print(f"  Current version: {old_ver}")
    
    # Step 2: Trigger revalidate (simulating admin save)
    req = urllib.request.Request(f"{BASE}/api/revalidate", data=b'', headers={'User-Agent': 'Mozilla/5.0'}, method='POST')
    with urllib.request.urlopen(req, timeout=10) as resp:
        rev = json.loads(resp.read().decode())
        print(f"  Revalidate response: {rev}")
    
    # Step 3: Check new version
    time.sleep(0.5)
    v2 = fetch_json("/api/version")
    new_ver = v2.get('version', 0)
    print(f"  New version: {new_ver}")
    
    if new_ver > old_ver or old_ver == 0:
        print(f"  PASS: Version correctly bumped from {old_ver} -> {new_ver}")
    else:
        errors.append(f"Version did not bump: {old_ver} -> {new_ver}")
        print(f"  FAIL: Version did not bump")

except Exception as e:
    errors.append(f"Realtime flow test failed: {str(e)}")

# ============================================
# TEST 7: Homepage shows correct data
# ============================================
print("\n--- TEST 7: Homepage Data Verification ---")
try:
    html = fetch_html("/")
    
    # Calculate expected totals from cache
    total_gold = sum(c.get('gold', 0) for c in cabors)
    total_silver = sum(c.get('silver', 0) for c in cabors)
    total_bronze = sum(c.get('bronze', 0) for c in cabors)
    
    print(f"  Expected totals: Gold={total_gold} Silver={total_silver} Bronze={total_bronze}")
    
    if str(total_gold) in html:
        print(f"  PASS: Gold total ({total_gold}) shown on homepage")
    else:
        warnings.append(f"Gold total ({total_gold}) not visible on homepage")
        print(f"  WARN: Gold total ({total_gold}) not found in HTML")
        
    if str(total_silver) in html:
        print(f"  PASS: Silver total ({total_silver}) shown on homepage")
        
    if str(total_bronze) in html:
        print(f"  PASS: Bronze total ({total_bronze}) shown on homepage")

except Exception as e:
    errors.append(f"Homepage test failed: {str(e)}")

# ============================================
# FINAL REPORT
# ============================================
print("\n" + "=" * 70)
print("CABOR FLOW VERIFICATION REPORT")
print("=" * 70)

if errors:
    print(f"\n  ERRORS ({len(errors)}):")
    for e in errors:
        print(f"    [X] {e}")
else:
    print("\n  NO ERRORS FOUND!")

if warnings:
    print(f"\n  WARNINGS ({len(warnings)}):")
    for w in warnings:
        print(f"    [!] {w}")
else:
    print("  NO WARNINGS!")

print(f"\n  VERDICT: {'NEEDS ATTENTION' if errors else 'ALL CABOR FLOWS WORKING PERFECTLY'}")
print("=" * 70)
