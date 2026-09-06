import re

with open('src/app/developer/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the shimmer effects
content = re.sub(r'<div className="absolute inset-0 w-\[200%\] h-full bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer pointer-events-none -translate-x-full"></div>', '', content)
content = re.sub(r'<div className="absolute inset-0 w-\[200%\] h-full bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer -translate-x-full"></div>', '', content)

with open('src/app/developer/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
