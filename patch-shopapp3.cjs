const fs = require('fs');
const p = 'src/ShopApp.tsx';
let c = fs.readFileSync(p, 'utf8');
const start = c.indexOf('function CategoryIcon(');
if (start === -1) {
  console.log('CategoryIcon start not found');
  process.exit(0);
}
let brace = 0;
let seen = false;
let end = -1;
for (let i = start; i < c.length; i++) {
  if (c[i] === '{') { brace++; seen = true; }
  if (c[i] === '}') {
    brace--;
    if (seen && brace === 0) { end = i + 1; break; }
  }
}
if (end === -1) {
  console.log('CategoryIcon end not found');
  process.exit(0);
}
if (c[end] === '\n') end++;
const replacement = `function CategoryIcon({ category, fallbackLogo = false }: { category?: Pick<GameCategory, 'icon' | 'name'> | null; fallbackLogo?: boolean }) {
  const icon = String(category?.icon || '').trim()
  const label = String(category?.name || 'Game')
  const [failed, setFailed] = useState(false)
  const src = assetUrl((!failed && icon) ? icon : (fallbackLogo ? shopLogo : ''))
  if (src) {
    return <img className="category-icon-img" src={src} alt={label} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  }
  return <span>{label.slice(0, 1).toUpperCase()}</span>
}
`;
c = c.slice(0, start) + replacement + c.slice(end);
fs.writeFileSync(p, c, 'utf8');
console.log('CategoryIcon patched by boundary');