import re

with open('src/app/developer/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = '''            {/* Developer Cards */}
            <div className="space-y-3">
              {users.filter(u => u.role === 'Developer').map(u => (
                <div key={u.id} className="p-3 border rounded-xl flex flex-col gap-2 relative overflow-hidden bg-gradient-to-br from-amber-100 via-yellow-200 to-yellow-100 border-yellow-400 ring-2 ring-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                  {/* Shimmer Effect for Developer */}
                  
                  
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex-1">
                      <h3 className="text-[11px] font-black text-yellow-900 tracking-tight">RAYNALDO ANANTA WIJAYA</h3>
                      {/* Simple Classified Badge */}
                      <div className="mt-1 flex items-center group cursor-not-allowed" title="Classified">
                          <div className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-400 border border-gray-200 flex items-center">
                            <i className="fa-solid fa-lock mr-1.5"></i> Classified <span className="ml-1 text-emerald-500"><i className="fa-solid fa-check-circle"></i> V3</span>
                          </div>
                      </div>
                    </div>
                    <div className="relative inline-flex items-center justify-center">
                      <div 
                        className="text-[9px] font-bold px-2 py-1 rounded-md border text-center relative z-10 bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 text-yellow-950 border-amber-600 shadow-[0_2px_8px_rgba(251,191,36,0.6)]"
                      >
                        Developer
                      </div>
                      <div className="absolute inset-0 rounded-md overflow-hidden pointer-events-none z-20 isolate" style={{ transform: 'translateZ(0)' }}>
                        
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>'''

new_block = '''            {/* Developer Cards */}
            <div className="space-y-3">
              {users.filter(u => u.role === 'Developer').map(u => (
                <div key={u.id} className="p-4 border rounded-xl flex flex-col gap-2 relative overflow-hidden bg-gradient-to-br from-yellow-100 via-yellow-200 to-yellow-100 border-yellow-400 shadow-sm">
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex-1">
                      <h3 className="text-[12px] font-black text-yellow-900 tracking-tight uppercase">{u.name}</h3>
                      <div className="mt-1 flex items-center">
                          <div className="px-2 py-0.5 bg-white/50 rounded text-[9px] font-bold text-yellow-800 border border-yellow-300/50 flex items-center">
                            <i className="fa-solid fa-shield-halved mr-1.5 text-yellow-600"></i> Developer Access <span className="ml-1 text-emerald-600"><i className="fa-solid fa-check-circle"></i> V3</span>
                          </div>
                      </div>
                    </div>
                    <div className="relative inline-flex items-center justify-center ml-2">
                      <div className="text-[10px] font-bold px-3 py-1 rounded-lg border text-center relative z-10 bg-gradient-to-b from-yellow-300 to-yellow-400 text-yellow-900 border-yellow-500 shadow-sm">
                        Developer
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>'''

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('src/app/developer/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated developer cards')
else:
    print('Not found')
