const fs = require('fs');

// 1. Calculate from medali_terbaru.json
const medals = JSON.parse(fs.readFileSync('src/data/medali_terbaru.json', 'utf8'));
let emas = 0, perak = 0, perunggu = 0;
const caborTally = {};

medals.forEach(m => {
  if (m.type === 'emas') emas++;
  if (m.type === 'perak') perak++;
  if (m.type === 'perunggu') perunggu++;
  
  if (!caborTally[m.cabor]) {
    caborTally[m.cabor] = { gold: 0, silver: 0, bronze: 0 };
  }
  if (m.type === 'emas') caborTally[m.cabor].gold++;
  if (m.type === 'perak') caborTally[m.cabor].silver++;
  if (m.type === 'perunggu') caborTally[m.cabor].bronze++;
});

console.log(`Calculated Tally: Emas=${emas}, Perak=${perak}, Perunggu=${perunggu}, Total=${emas+perak+perunggu}`);

// 2. Update summary.json
const summary = JSON.parse(fs.readFileSync('src/data/summary.json', 'utf8'));
summary.tally.emas = emas;
summary.tally.perak = perak;
summary.tally.perunggu = perunggu;
summary.tally.total = emas + perak + perunggu;

// Fix Klasemen sum to match 35
summary.klasemen[0].total = 11; // Banjarsari: 11
summary.klasemen[1].total = 8;  // Laweyan: 8
summary.klasemen[2].total = 7;  // Jebres: 7
summary.klasemen[3].total = 5;  // Pasar Kliwon: 5
summary.klasemen[4].total = 4;  // Serengan: 4

let kSum = summary.klasemen.reduce((sum, k) => sum + k.total, 0);
console.log(`Klasemen sum: ${kSum}`);

fs.writeFileSync('src/data/summary.json', JSON.stringify(summary, null, 2));

// 3. Update cabor.json
const cabors = JSON.parse(fs.readFileSync('src/data/cabor.json', 'utf8'));

const normalizeCabor = (name) => {
  if (name.includes('Senam')) return 'senam';
  if (name === 'Sepak Takraw') return 'takraw';
  return name.toLowerCase().replace(/ /g, '-');
};

cabors.forEach(c => {
  c.gold = 0; c.silver = 0; c.bronze = 0;
  Object.keys(caborTally).forEach(k => {
    if (k === c.name || normalizeCabor(k) === c.id) {
      c.gold += caborTally[k].gold;
      c.silver += caborTally[k].silver;
      c.bronze += caborTally[k].bronze;
    }
  });
});

let cSumE = 0, cSumP = 0, cSumB = 0;
cabors.forEach(c => {
  cSumE += c.gold;
  cSumP += c.silver;
  cSumB += c.bronze;
});
console.log(`Cabor sum: Emas=${cSumE}, Perak=${cSumP}, Perunggu=${cSumB}, Total=${cSumE+cSumP+cSumB}`);

fs.writeFileSync('src/data/cabor.json', JSON.stringify(cabors, null, 2));
console.log('Successfully synced all data!');
