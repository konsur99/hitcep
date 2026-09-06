import re

def clean_developer_page(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Remove autoFocus
    content = content.replace("autoFocus", "")
    
    # 2. Replace the Classified glitch animation with a simple text badge
    glitch_pattern = r'\{/\* Fake Email Sensor Animation \*/\}.*?\{/\* Overlay gradient for depth \*/\}'
    simple_badge = '''{/* Simple Classified Badge */}
                        <div className="mt-1 flex items-center group cursor-not-allowed" title="Classified">
                          <div className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-400 border border-gray-200">
                            <i className="fa-solid fa-lock mr-1"></i> Classified
                          </div>'''
    
    # We will use string slicing or regex.
    # Actually, it's easier to just replace the whole block since it's multiline.
    pass

