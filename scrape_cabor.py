import urllib.request
import re

url = 'https://www.konisolo.com/cabor'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')

# Find all cabor cards
matches = re.findall(r'<div class="card-body">\s*<small class="card-text fs-smaller text-dark">(.*?)</small>', html)
images = re.findall(r'<img src="(https://www.konisolo.com/storage/images/cabor/.*?)"', html)

print(f'Found {len(matches)} cabors and {len(images)} images.')
for i in range(min(5, len(matches))):
    print(f'{matches[i]}: {images[i]}')
