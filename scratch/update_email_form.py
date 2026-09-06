import re

with open('src/app/developer/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add newDomainSuffix state
state_old = "    const [newEmail, setNewEmail] = useState('');"
state_new = "    const [newEmail, setNewEmail] = useState('');\n    const [newDomainSuffix, setNewDomainSuffix] = useState('@quikkoni.admin');"
content = content.replace(state_old, state_new)

# 2. Update handleCreateUser finalEmail logic
# Look for: const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
create_old = "        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);"
create_new = "        const finalEmail = f'{newEmail}{newDomainSuffix}';\n        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, newPassword);"
# Fix f-string logic for TS
create_new = "        const finalEmail = ${newEmail};\n        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, newPassword);"
content = content.replace(create_old, create_new)

# 3. Update the Firestore payload
# Look for:
#           name: newName,
#           email: newEmail,
firestore_old = "          name: newName,\n          email: newEmail,"
firestore_new = "          name: newName,\n          email: finalEmail,"
content = content.replace(firestore_old, firestore_new)

# 4. Update the input field in JSX
jsx_old = '''              <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Email (@gmail.com)</label>
                  <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="contoh@gmail.com" />
                </div>'''

jsx_new = '''              <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Username Login</label>
                  <div className="flex rounded-lg shadow-sm border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-yellow-400 bg-gray-50">
                    <input 
                      type="text" 
                      required 
                      value={newEmail} 
                      onChange={e => setNewEmail(e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase())} 
                      className="w-full px-3 py-2 bg-transparent text-[11px] font-semibold focus:outline-none" 
                      placeholder="Misal: budi_99" 
                    />
                    <div className="border-l border-gray-200 bg-gray-100 flex items-center shrink-0">
                      <select 
                        value={newDomainSuffix} 
                        onChange={e => setNewDomainSuffix(e.target.value)}
                        className="bg-transparent border-none text-[11px] font-bold text-gray-700 pl-3 pr-6 py-2 focus:outline-none cursor-pointer appearance-none outline-none ring-0"
                        style={{ backgroundImage: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="%234B5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>'), backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}
                      >
                        <option value="@quikkoni.admin">@quikkoni.admin</option>
                        <option value="@quikkoni.cabor">@quikkoni.cabor</option>
                      </select>
                    </div>
                  </div>
                </div>'''
content = content.replace(jsx_old, jsx_new)

with open('src/app/developer/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("success")
