import re

def add_global_loader(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if 'useGlobalLoader' in content:
        return
        
    # Add import
    import_statement = "import { useGlobalLoader } from '@/components/GlobalLoader';\n"
    
    # Find the right place to add import (after other imports)
    import_match = list(re.finditer(r'^import .*?;$', content, re.MULTILINE))
    if import_match:
        last_import = import_match[-1]
        content = content[:last_import.end()] + '\n' + import_statement + content[last_import.end():]
    else:
        content = import_statement + content
        
    # Inject hook at the start of the main component
    # We look for export default function XYZ() { or export default function XYZ(...) {
    comp_match = re.search(r'(export default function [A-Za-z0-9_]+\s*\([^)]*\)\s*\{)', content)
    if not comp_match:
        print(f"Could not find main component in {filepath}")
        return
        
    hook_str = "\n  const { showLoading, hideLoading } = useGlobalLoader();"
    content = content[:comp_match.end()] + hook_str + content[comp_match.end():]
    
    # Replace setIsSubmitting(true) with showLoading("Memproses...")
    content = re.sub(
        r'setIsSubmitting\(\s*true\s*\);',
        'setIsSubmitting(true);\n    showLoading("Mengunggah data...");',
        content
    )
    
    # Replace setIsSubmitting(false) with hideLoading()
    content = re.sub(
        r'setIsSubmitting\(\s*false\s*\);',
        'setIsSubmitting(false);\n    hideLoading();',
        content
    )
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

files = [
    'src/app/input-medali/page.tsx',
    'src/app/input-pelaporan/page.tsx',
    'src/app/developer/page.tsx'
]

for f in files:
    add_global_loader(f)
