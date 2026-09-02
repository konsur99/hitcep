const fs = require('fs');

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove import getAdminDb
  content = content.replace(/import\s*\{\s*getAdminDb(?:,\s*getAdminAuth)?\s*\}\s*from\s*['"]@\/lib\/firebase-admin['"];?\n?/, '');
  
  // Change dynamic to revalidate
  content = content.replace(/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"];?/, 'export const revalidate = 10;');
  
  // Replace getAdminDb call with fetch
  const adminDbRegex = /const\s+cacheSnap\s*=\s*await\s+getAdminDb\(\)\.collection\(['"]public_cache['"]\)\.doc\(['"]v1['"]\)\.get\(\);\s*const\s+rawCacheData\s*=\s*cacheSnap\.data\(\)\s*\|\|\s*\{[^\}]+\};\s*const\s+cacheData\s*=\s*JSON\.parse\(JSON\.stringify\(rawCacheData\)\);/;
  
  const fetchCode = `const res = await fetch('https://hitcep.vercel.app/api/public_cache', { next: { revalidate: 10 } });
    const cacheData = await res.json();`;

  content = content.replace(adminDbRegex, fetchCode);
  fs.writeFileSync(file, content);
}

processFile('src/app/medali/page.tsx');
processFile('src/app/pelaporan/page.tsx');
processFile('src/app/cabor/page.tsx');
processFile('src/app/statistik/page.tsx');
console.log("Done");
