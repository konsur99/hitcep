const fs = require('fs');

async function run() {
  const provRes = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
  const provs = await provRes.json();
  let allRegencies = [];
  for (let p of provs) {
    const regRes = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${p.id}.json`);
    const regs = await regRes.json();
    allRegencies.push(...regs.map(r => r.name));
  }
  allRegencies.sort((a, b) => a.localeCompare(b));
  fs.writeFileSync('public/cities.json', JSON.stringify(allRegencies));
  console.log('Done, count:', allRegencies.length);
}
run();
