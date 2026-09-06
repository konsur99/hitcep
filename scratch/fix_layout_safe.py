import re

with open('src/app/developer/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to wrap the elements.
# The layout starts at: <div className="px-5 mt-6 relative z-20 max-w-7xl mx-auto w-full flex flex-col gap-6 items-start pb-20">
# The blocks are:
# 1. Form Create Account
# 2. Section: Manajemen Pengguna
# 3. Manajemen Data & Backup (inside currentUserRole === 'Developer' block)

block1_start = content.find('{/* Form Create Account')
block2_start = content.find('{/* Section: Manajemen Pengguna')
block3_start = content.find("{currentUserRole === 'Developer' && (\n          <>\n            {/* Manajemen Data & Backup */}")

if block1_start != -1 and block2_start != -1 and block3_start != -1:
    block3_end_str = "          </>\n        )}\n      </div>"
    block3_end = content.find(block3_end_str, block3_start) + len("          </>\n        )}")
    
    if block3_end != -1:
        # Extract the blocks
        block1 = content[block1_start:block2_start]
        block2 = content[block2_start:block3_start]
        block3 = content[block3_start:block3_end]
        
        # Change the wrapper
        content = content.replace('<div className="px-5 mt-6 relative z-20 max-w-7xl mx-auto w-full flex flex-col gap-6 items-start pb-20">', '<div className="px-5 mt-6 relative z-20 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-6 items-start pb-20">')
        
        # Find the new block1_start (since indices might shift slightly)
        block1_start = content.find('{/* Form Create Account')
        block3_end = content.find(block3_end_str, content.find("{currentUserRole === 'Developer' && (\n          <>\n            {/* Manajemen Data & Backup */}")) + len("          </>\n        )}")
        
        # Rewrite the layout
        new_layout = f'''        {{/* LEFT COLUMN */}}
        <div className="w-full lg:w-1/2 flex flex-col gap-6">
{block1}
{block3}
        </div>

        {{/* RIGHT COLUMN */}}
        <div className="w-full lg:w-1/2 flex flex-col gap-6">
{block2}
        </div>'''
        
        # Replace in content
        content = content[:block1_start] + new_layout + content[block3_end:]
        
        with open('src/app/developer/page.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Success layout rewrite")
    else:
        print("Error: end not found")
else:
    print("Error: blocks not found")
