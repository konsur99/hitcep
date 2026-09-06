import re

with open('src/app/developer/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Form tag
old_form = '<form onSubmit={handleCreateUser} className="space-y-4">'
new_form = '<form onSubmit={handleCreateUser} className="space-y-4" autoComplete="off">'
content = content.replace(old_form, new_form)

# Name input
old_name_input = 'onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Misal: John Doe" />'
new_name_input = 'onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Misal: John Doe" autoComplete="off" />'
content = content.replace(old_name_input, new_name_input)

# Email/Username input
old_email_input = 'className="w-full px-3 py-2 bg-transparent text-[11px] font-semibold focus:outline-none" \n                      placeholder="Misal: budi_99" \n                    />'
new_email_input = 'className="w-full px-3 py-2 bg-transparent text-[11px] font-semibold focus:outline-none" \n                      placeholder="Misal: budi_99" \n                      autoComplete="off"\n                    />'
content = content.replace(old_email_input, new_email_input)

# Password input
old_pass_input = 'onChange={e => setNewPassword(e.target.value)} className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Minimal 6 karakter" />'
new_pass_input = 'onChange={e => setNewPassword(e.target.value)} className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Minimal 6 karakter" autoComplete="new-password" />'
content = content.replace(old_pass_input, new_pass_input)

with open('src/app/developer/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("success")
