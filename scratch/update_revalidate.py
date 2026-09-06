import re
import glob

# Files to update
files = [
    'src/app/page.tsx',
    'src/app/medali/page.tsx',
    'src/app/pelaporan/page.tsx',
    'src/app/statistik/page.tsx',
    'src/app/cabor/[id]/page.tsx'
]

for file in files:
    try:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace revalidate = 10 or whatever to 600
        content = re.sub(r'export const revalidate = \d+;?', 'export const revalidate = 600;', content)
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file}")
    except Exception as e:
        print(f"Error on {file}: {e}")
