import re

with open('src/app/developer/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the grid wrapper
old_wrapper = '<div className="px-5 mt-6 relative z-20 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pb-20">'
new_wrapper = '<div className="px-5 mt-6 relative z-20 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-6 items-start pb-20">'
content = content.replace(old_wrapper, new_wrapper)

# We need to wrap the elements.
# The layout is:
# 1. Form Create Account block
# 2. Section: Manajemen Pengguna block
# 3. {currentUserRole === 'Developer' && ( ... )} block

# Let's find these blocks.
# Block 1 starts with "{/* Form Create Account" and ends before "{/* Section: Manajemen Pengguna"
block1_start = content.find('{/* Form Create Account')
block2_start = content.find('{/* Section: Manajemen Pengguna')
block3_start = content.find("{currentUserRole === 'Developer' && (\n          <>\n            {/* Manajemen Data & Backup */}")

if block1_start != -1 and block2_start != -1 and block3_start != -1:
    # Find the end of block 3
    # It ends with "          </>\n        )}"
    block3_end_str = "          </>\n        )}\n      </div>"
    block3_end = content.find(block3_end_str, block3_start) + len("          </>\n        )}")
    
    if block3_end != -1:
        # Extract the blocks
        block1 = content[block1_start:block2_start]
        block2 = content[block2_start:block3_start]
        block3 = content[block3_start:block3_end]
        
        # Rewrite the layout
        new_layout = f'''        {{/* LEFT COLUMN */}}
        <div className="w-full lg:w-1/2 flex flex-col gap-6">
          {block1.strip()}

          {block3.strip()}
        </div>

        {{/* RIGHT COLUMN */}}
        <div className="w-full lg:w-1/2 flex flex-col gap-6">
          {block2.strip()}
        </div>
'''
        
        # Replace in content
        content = content[:block1_start] + new_layout + content[block3_end:]
        
        with open('src/app/developer/page.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Success")
    else:
        print("Could not find block3 end")
else:
    print("Could not find blocks")
