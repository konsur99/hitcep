with open('src/app/developer/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('</div></div>\n                      </div>', '</div>\n                      </div>')

with open('src/app/developer/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
