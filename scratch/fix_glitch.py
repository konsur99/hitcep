import re

def fix_glitch(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Replace columns with grid
    content = content.replace("columns-1 lg:columns-2 gap-6 pb-20", "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pb-20")
    
    # 2. Clean up child masonry classes
    content = content.replace("break-inside-avoid inline-block w-full mb-6", "w-full h-fit flex flex-col")
    content = content.replace("break-inside-avoid inline-block w-full", "w-full h-fit flex flex-col")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_glitch('src/app/developer/page.tsx')
