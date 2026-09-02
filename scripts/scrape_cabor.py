import urllib.request
import re
import os
import json
from urllib.parse import urlparse
import unicodedata

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    import subprocess
    import sys
    print("Installing Pillow...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image
    PIL_AVAILABLE = True

# Create directories if they don't exist
public_dir = os.path.join('public', 'cabor')
raw_dir = os.path.join(public_dir, 'raw')
os.makedirs(public_dir, exist_ok=True)
os.makedirs(raw_dir, exist_ok=True)
os.makedirs(os.path.join('src', 'data'), exist_ok=True)

def slugify(value):
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    value = re.sub(r'[^\w\s-]', '', value.lower())
    return re.sub(r'[-\s]+', '-', value).strip('-_')

def remove_white_background(img_path, output_path):
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # If pixel is near white, make it transparent
        # Threshold: if R, G, B are all > 240
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")

url = 'https://www.konisolo.com/cabor'
print(f"Fetching {url}...")
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')

matches = re.findall(r'<div class="card-body">\s*<small class="card-text fs-smaller text-dark">(.*?)</small>', html)
images = re.findall(r'<img src="(https://www.konisolo.com/storage/images/cabor/.*?)"', html)

cabor_data = []
print(f"Found {len(matches)} cabors. Starting download and processing...")

for i in range(len(matches)):
    name = matches[i].strip()
    img_url = images[i]
    img_url = img_url.replace(" ", "%20")
    
    slug = slugify(name)
    ext = os.path.splitext(urlparse(img_url).path)[1]
    if not ext:
        ext = '.png'
        
    raw_path = os.path.join(raw_dir, f"{slug}{ext}")
    final_path = os.path.join(public_dir, f"{slug}.png")
    final_img = f"/cabor/{slug}.png"
    
    try:
        # Download if not exists
        if not os.path.exists(raw_path):
            urllib.request.urlretrieve(img_url, raw_path)
            
        # Process image
        remove_white_background(raw_path, final_path)
            
        cabor_data.append({
            "id": slug,
            "name": name,
            "image": final_img
        })
        print(f"[{i+1}/{len(matches)}] Processed: {name}")
    except Exception as e:
        print(f"[{i+1}/{len(matches)}] ERROR processing {name}: {e}")

json_path = os.path.join('src', 'data', 'cabor.json')
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(cabor_data, f, indent=2, ensure_ascii=False)

print(f"Data saved to {json_path}")
print("Finished!")
