const XLSX = require('xlsx');

const workbook = XLSX.readFile('C:\\Users\\User\\Downloads\\LIST ATLIT CONTOH - nomor pertandingan porprov - 11 sept 2026.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('Headers:', data[1]);

console.log('\nRows with 1 MEDALI / TIM? == YA:');
let count = 0;
for(let i=2; i<data.length; i++) {
  if (data[i] && data[i][5] && String(data[i][5]).startsWith('YA')) {
    console.log(data[i].slice(0, 6)); // Print up to the 1 MEDALI column
    count++;
    if (count > 20) break;
  }
}
