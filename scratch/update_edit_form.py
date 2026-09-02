import re

path = 'src/app/validasi-pelaporan/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add DatePicker import if missing
if "import DatePicker" not in content:
    content = content.replace("import { createPortal } from 'react-dom';", "import { createPortal } from 'react-dom';\nimport DatePicker from '@/components/DatePicker';")

# 2. Update states for category dropdown
# In validasi-pelaporan, we need: searchCategory, showCategoryDropdown
state_add = """  const [searchCategory, setSearchCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryInputRef = useRef<HTMLDivElement>(null);
  const isOtherCategorySelected = editCategories.includes("Lainnya") || editCategories.includes("Lain-lain");
"""
if "const [searchCategory" not in content:
    content = content.replace("  const [editCustomCategory, setEditCustomCategory] = useState('');", "  const [editCustomCategory, setEditCustomCategory] = useState('');\n" + state_add)

# 3. Update handleClickOutside to include categoryInputRef
new_click_outside = """  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
      if (categoryInputRef.current && !categoryInputRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);"""

content = re.sub(r'  // Close location dropdown when click outside\n  useEffect\(\(\) => \{.*?  \}, \[\]\);', new_click_outside, content, flags=re.DOTALL)

# 4. Helper function toggleCategory
toggle_func = """  const toggleCategory = (cat: string) => {
    setEditCategories(prev => {
      if (prev.includes(cat)) {
        const next = prev.filter(c => c !== cat);
        if (cat === "Lain-lain" || cat === "Lainnya") setEditCustomCategory('');
        return next;
      } else {
        return [...prev, cat];
      }
    });
  };
"""
if "const toggleCategory =" not in content:
    content = content.replace("  const handleCategoryChange = (cat: string) => {", toggle_func + "\n  const handleCategoryChange = (cat: string) => {")

# 5. The new form UI
new_form = """            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Cabor / Pelapor</label>
                  <div className="flex h-[34px] items-center">
                    <div className="relative px-3 py-1.5 border rounded-lg text-xs font-bold whitespace-nowrap shadow-md overflow-hidden bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500 text-yellow-950 border-yellow-300 ring-2 ring-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer"></div>
                      <span className="relative z-10 flex items-center gap-1.5"><i className="fa-solid text-[10px] fa-crown text-yellow-800"></i>
                        <select 
                          value={editCaborName}
                          onChange={e => setEditCaborName(e.target.value)}
                          className="bg-transparent font-bold focus:outline-none cursor-pointer"
                        >
                          <option value="" disabled>Pilih Cabor</option>
                          {Object.values(cabors).map((name: any) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Nama Pelapor</label>
                  <input 
                    type="text" 
                    value={editReporterName} 
                    onChange={e => setEditReporterName(e.target.value)} 
                    placeholder="Nama Lengkap"
                    className="w-full h-[34px] px-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all" 
                  />
                </div>
              </div>

              <div className="relative" ref={locationInputRef}>
                <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Lokasi (Kabupaten/Kota)</label>
                <div 
                  className="relative cursor-pointer"
                  onClick={() => setShowLocationDropdown(prev => !prev)}
                >
                  <input 
                    type="text" 
                    value={editLocation} 
                    onChange={e => { setEditLocation(e.target.value); setShowLocationDropdown(true); }}
                    placeholder="Cari Kota..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all cursor-text pointer-events-auto" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLocationDropdown(true);
                    }}
                  />
                  <div className="absolute right-0 inset-y-0 flex items-center px-3 cursor-pointer">
                    <i className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`}></i>
                  </div>
                </div>
                
                {showLocationDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto overscroll-contain">
                    {cities.filter(c => c.toLowerCase().includes(editLocation.toLowerCase())).map(city => (
                      <div 
                        key={city} 
                        onClick={() => { setEditLocation(city); setShowLocationDropdown(false); }}
                        className={`px-3 py-2 text-[11px] font-bold cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${
                          editLocation === city ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {city}
                      </div>
                    ))}
                    {cities.filter(c => c.toLowerCase().includes(editLocation.toLowerCase())).length === 0 && (
                       <div className="px-3 py-3 text-xs font-semibold text-gray-400 text-center">Tidak ditemukan</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Waktu Kejadian</label>
                <DatePicker 
                  date={editIncidentTime || null} 
                  onChange={(dateStr) => setEditIncidentTime(dateStr || '')} 
                  placeholder="Pilih Tanggal Kejadian"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Lokasi Detail</label>
                <input 
                  type="text" 
                  value={editSpecificLocation} 
                  onChange={e => setEditSpecificLocation(e.target.value)} 
                  placeholder="Contoh: GOR Manahan"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all" 
                />
              </div>

              <div className="relative" ref={categoryInputRef}>
                <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Jenis Laporan <span className="text-gray-400 font-medium">(Bisa pilih lebih dari satu)</span></label>
                
                {editCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {editCategories.map(cat => (
                      <span key={cat} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200">
                        {cat}
                        <button type="button" onClick={() => toggleCategory(cat)} className="hover:text-red-500 transition-colors">
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div 
                  className="relative cursor-pointer"
                  onClick={() => setShowCategoryDropdown(prev => !prev)}
                >
                  <input 
                    type="text" 
                    value={searchCategory}
                    onChange={e => { setSearchCategory(e.target.value); setShowCategoryDropdown(true); }}
                    placeholder="Cari & Pilih Jenis Laporan..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all cursor-text pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCategoryDropdown(true);
                    }}
                  />
                  <div className="absolute right-0 inset-y-0 flex items-center px-3 cursor-pointer">
                    <i className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`}></i>
                  </div>
                </div>
                
                {showCategoryDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto overscroll-contain">
                    {REPORT_CATEGORIES.filter(c => c.toLowerCase().includes(searchCategory.toLowerCase())).map(cat => (
                      <div 
                        key={cat} 
                        onClick={() => { toggleCategory(cat); setSearchCategory(''); setShowCategoryDropdown(false); }}
                        className={`px-3 py-2 text-[11px] font-bold cursor-pointer transition-colors flex justify-between items-center border-b border-gray-50 last:border-0 ${
                          editCategories.includes(cat) ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {cat}
                        {editCategories.includes(cat) && <i className="fa-solid fa-check text-blue-500"></i>}
                      </div>
                    ))}
                    {REPORT_CATEGORIES.filter(c => c.toLowerCase().includes(searchCategory.toLowerCase())).length === 0 && (
                       <div className="px-3 py-3 text-xs font-semibold text-gray-400 text-center">Tidak ditemukan</div>
                    )}
                  </div>
                )}

                {isOtherCategorySelected && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-[10px] font-bold text-blue-800 mb-1">Tulis Jenis Laporan Lainnya</label>
                    <input 
                      type="text" 
                      value={editCustomCategory} 
                      onChange={e => setEditCustomCategory(e.target.value)} 
                      placeholder="Ketik spesifik jenis laporannya..."
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-md text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all" 
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Judul Laporan</label>
                <input 
                  type="text" 
                  value={editTitle} 
                  onChange={e => setEditTitle(e.target.value)} 
                  placeholder="Contoh: Indikasi Kecurangan Wasit"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Deskripsi Kejadian</label>
                <textarea 
                  value={editDescription} 
                  onChange={e => setEditDescription(e.target.value)} 
                  placeholder="Ceritakan detail kejadian secara lengkap..."
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all resize-none overflow-hidden" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Foto Bukti <span className="text-gray-400 font-medium">(Opsional)</span></label>
                <div className="relative h-32 rounded-lg overflow-hidden bg-gray-50 border-2 border-dashed border-gray-300 hover:bg-gray-100 transition-colors flex items-center justify-center group cursor-pointer">
                  {(editImagePreview || editingReport.imageUrl) ? (
                    <img src={editImagePreview || getOptimizedUrl(editingReport.imageUrl, 400)} className="w-full h-full object-contain" alt="Preview" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <i className="fa-solid fa-camera text-2xl mb-2"></i>
                      <span className="text-[10px] font-semibold">Ketuk untuk foto</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
            </div>"""

import re
# Find the start of <div className="p-5 space-y-4 overflow-y-auto flex-1">
# and end just before <div className="p-4 bg-gray-50 border-t border-gray-100">
pattern = r'<div className="p-5 space-y-[43] overflow-y-auto flex-1">.*?(?=<div className="p-4 bg-gray-50 border-t border-gray-100">)'
content = re.sub(pattern, new_form + '\n            ', content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated validasi-pelaporan edit modal!")
