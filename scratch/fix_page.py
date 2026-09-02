import re

def fix_page_tsx(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Replace optimized.replace(/\.[^/.]+$/, '.jpg'); with .webp
    content = re.sub(
        r"optimized = optimized\.replace\(/\\\.\[\^/\.\]\+\\\$/, '\.jpg'\);",
        r"optimized = optimized.replace(/\.[^/.]+$/, '.webp');",
        content
    )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed page.tsx")

fix_page_tsx('src/app/page.tsx')
