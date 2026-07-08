const fs = require('fs');
let content = fs.readFileSync('src/components/pros-dashboard.tsx', 'utf8');
content = content.replace(/opacity-0 group-hover:opacity-100 transition/g, 'opacity-100 md:opacity-0 md:group-hover:opacity-100 transition');
fs.writeFileSync('src/components/pros-dashboard.tsx', content);
console.log('Opacity classes fixed');
