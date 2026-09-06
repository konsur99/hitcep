import re

def check_loading(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    shows = len(re.findall(r'showLoading\(', content))
    hides = len(re.findall(r'hideLoading\(', content))
    print(f"{filepath}: showLoading={shows}, hideLoading={hides}")

check_loading('src/app/validasi/page.tsx')
check_loading('src/app/validasi-pelaporan/page.tsx')
check_loading('src/app/input-medali/page.tsx')
check_loading('src/app/input-pelaporan/page.tsx')
