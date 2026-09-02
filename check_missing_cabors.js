fetch('http://localhost:3000/cabor')
  .then(res => res.text())
  .then(html => {
     const matches = [...html.matchAll(/href="\/cabor\/([^"]+)"/g)].map(m => m[1]);
     const unique = [...new Set(matches)];
     const fs = require('fs');
     const files = fs.readdirSync('public/cabor').map(f => f.split('.')[0]);
     const missing = unique.filter(id => !files.includes(id));
     console.log('Missing IDs:', missing);
  });
