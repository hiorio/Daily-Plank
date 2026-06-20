const fs = require('node:fs');
const path = require('node:path');

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');
const notFoundPath = path.join(distDir, '404.html');
const noJekyllPath = path.join(distDir, '.nojekyll');

if (!fs.existsSync(indexPath)) {
  throw new Error(`Cannot prepare GitHub Pages output. Missing ${indexPath}`);
}

fs.copyFileSync(indexPath, notFoundPath);
fs.writeFileSync(noJekyllPath, '');

console.log('Prepared GitHub Pages fallback files in dist/.');
