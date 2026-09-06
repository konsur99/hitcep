import re

with open('src/app/developer/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace wrapper
content = content.replace('<div className="px-5 mt-6 relative z-20 max-w-7xl mx-auto w-full flex flex-col gap-6 items-start pb-20">', '<div className="px-5 mt-6 relative z-20 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-6 items-start pb-20">\n        <div className="w-full lg:w-1/2 flex flex-col gap-6">')

# Close left column and open right column before Manajemen Pengguna
old_manajemen = '        {/* Section: Manajemen Pengguna */}'
new_manajemen = '        </div>\n        <div className="w-full lg:w-1/2 flex flex-col gap-6">\n' + old_manajemen
content = content.replace(old_manajemen, new_manajemen)

# Close right column and reopen left column before Manajemen Data & Backup
old_kontrol = '        {/* Kontrol Khusus Developer (Hanya Developer Asli) */}'
new_kontrol = '        </div>\n        <div className="w-full lg:w-1/2 flex flex-col gap-6">\n' + old_kontrol
content = content.replace(old_kontrol, new_kontrol)

# Close the final left column before the wrapper closes
# Wait, the wrapper closes at line 1135: "      </div>\n      </main>"
old_end = '      </div>\n    </main>'
new_end = '        </div>\n      </div>\n    </main>'
content = content.replace(old_end, new_end)

with open('src/app/developer/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("success")
