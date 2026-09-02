const fs = require('fs');
 // Not available? I'll use simple recursive search or just list the files.
const files = [
  'src/app/statistik/page.tsx',
  'src/app/sitemap.ts',
  'src/app/page.tsx',
  'src/app/pelaporan/page.tsx',
  'src/app/medali/page.tsx',
  'src/app/cabor/page.tsx',
  'src/app/cabor/[id]/page.tsx',
  'src/app/api/public_cache/route.ts',
  'src/app/api/version/route.ts',
  'src/app/api/init-cache/route.ts',
  'src/app/api/fix-images/route.ts',
  'src/app/api/delete-user/route.ts',
  'src/app/api/revoke-session/route.ts',
  'src/app/api/edit-user/route.ts',
  'src/app/api/delete-image/route.ts',
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace imports
    content = content.replace(/import\s+\{\s*adminDb\s*(?:,\s*adminAuth\s*)?\}\s+from\s+['"]@\/lib\/firebase-admin['"];?/g, "import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';");
    content = content.replace(/import\s+\{\s*adminAuth\s*(?:,\s*adminDb\s*)?\}\s+from\s+['"]@\/lib\/firebase-admin['"];?/g, "import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';");
    
    // Replace usage
    content = content.replace(/\badminDb\b(?!\s*from)/g, "getAdminDb()");
    content = content.replace(/\badminAuth\b(?!\s*from)/g, "getAdminAuth()");
    
    // Fix function calls that might have ended up as getAdminDb()()
    content = content.replace(/getAdminDb\(\)\(\)/g, "getAdminDb()");
    content = content.replace(/getAdminAuth\(\)\(\)/g, "getAdminAuth()");

    fs.writeFileSync(file, content);
  }
}
console.log("Done");
