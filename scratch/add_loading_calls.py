import re

def add_loading_calls(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    content = re.sub(
        r'(isSyncing\s*=\s*true\s*;|setIsSyncing\(\s*true\s*\);|setIsGenerating\(\s*true\s*\);|setIsCleaning\(\s*true\s*\);)',
        r'\1\n      showLoading("Memproses...");',
        content
    )
    
    content = re.sub(
        r'(isSyncing\s*=\s*false\s*;|setIsSyncing\(\s*false\s*\);|setIsGenerating\(\s*false\s*\);|setIsCleaning\(\s*false\s*\);)',
        r'\1\n      hideLoading();',
        content
    )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

add_loading_calls('src/app/developer/page.tsx')
