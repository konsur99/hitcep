import re
with open('src/app/developer/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Classified</div>', 'Classified <span className="ml-1 text-emerald-500"><i className="fa-solid fa-check-circle"></i></span></div>')

with open('src/app/developer/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
