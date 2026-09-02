const fs = require('fs');

const files = [
  'src/app/page.tsx',
  'src/app/medali/page.tsx',
  'src/app/pelaporan/page.tsx',
  'src/app/statistik/page.tsx',
  'src/app/cabor/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace medals createdAt
  content = content.replace(/createdAt: m\.createdAt && typeof m\.createdAt\.toDate === 'function'[\s\S]*?\? m\.createdAt\.toDate\(\)\.getTime\(\)[\s\S]*?: \(m\.createdAt\?\.seconds \? m\.createdAt\.seconds \* 1000 : null\)/g, 
    "createdAt: m.createdAt ? (typeof m.createdAt.toDate === 'function' ? m.createdAt.toDate().getTime() : (m.createdAt.seconds ? m.createdAt.seconds * 1000 : (typeof m.createdAt === 'string' ? new Date(m.createdAt).getTime() : (typeof m.createdAt === 'number' ? m.createdAt : null)))) : null");

  // Replace reports createdAt
  content = content.replace(/createdAt: r\.createdAt && typeof r\.createdAt\.toDate === 'function'[\s\S]*?\? r\.createdAt\.toDate\(\)\.getTime\(\)[\s\S]*?: \(r\.createdAt\?\.seconds \? r\.createdAt\.seconds \* 1000 : null\)/g, 
    "createdAt: r.createdAt ? (typeof r.createdAt.toDate === 'function' ? r.createdAt.toDate().getTime() : (r.createdAt.seconds ? r.createdAt.seconds * 1000 : (typeof r.createdAt === 'string' ? new Date(r.createdAt).getTime() : (typeof r.createdAt === 'number' ? r.createdAt : null)))) : null");

  fs.writeFileSync(file, content);
  console.log("Fixed date parsing in", file);
}
