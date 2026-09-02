import re

path = 'src/app/validasi-pelaporan/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add useRef to imports
content = content.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect, useRef } from 'react';")

# 2. Add cities and ref state
state_code = """  const [cities, setCities] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationInputRef = useRef<HTMLDivElement>(null);
  
  // Load cities once
  useEffect(() => {
    fetch('/cities.json')
      .then(res => res.json())
      .then(data => setCities(data))
      .catch(err => console.error("Failed to load cities", err));
  }, []);
  
  // Close location dropdown when click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
"""

content = content.replace("  const [lightboxImage, setLightboxImage] = useState<string | null>(null);", "  const [lightboxImage, setLightboxImage] = useState<string | null>(null);\n\n" + state_code)

# 3. Replace the location input
old_input = """              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Lokasi (Kab/Kota)</label>
                <input 
                  type="text" 
                  value={editLocation} 
                  onChange={e => setEditLocation(e.target.value)} 
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>"""

new_input = """              <div className="relative" ref={locationInputRef}>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Lokasi (Kabupaten/Kota)</label>
                <div 
                  className="relative cursor-pointer"
                  onClick={() => setShowLocationDropdown(prev => !prev)}
                >
                  <input 
                    type="text" 
                    value={editLocation} 
                    onChange={e => { setEditLocation(e.target.value); setShowLocationDropdown(true); }}
                    placeholder="Cari Kota..."
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all cursor-text pointer-events-auto" 
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
              </div>"""

content = content.replace(old_input, new_input)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated successfully")
