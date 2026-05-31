const fs = require('fs');
const p = 'src/ShopApp.tsx';
let c = fs.readFileSync(p, 'utf8');

// Fix CategoryIcon: add useState import not needed (already imported), add onError + referrerPolicy
// Replace the old 7-line CategoryIcon body
const oldCat = `function CategoryIcon({ category, fallbackLogo = false }: { category?: Pick<GameCategory, 'icon' | 'name'> | null; fallbackLogo?: boolean }) {
  const icon = String(category?.icon || '').trim()
  const label = String(category?.name || 'Game')
  if (icon || fallbackLogo) {
    return <img className="category-icon-img" src={assetUrl(icon || shopLogo)} alt={label} />
  }
  return <span>{label.slice(0, 1).toUpperCase()}</span>
}`;

const newCat = `function CategoryIcon({ category, fallbackLogo = false }: { category?: Pick<GameCategory, 'icon' | 'name'> | null; fallbackLogo?: boolean }) {
  const icon = String(category?.icon || '').trim()
  const label = String(category?.name || 'Game')
  const [failed, setFailed] = useState(false)
  const src = assetUrl((!failed && icon) ? icon : (fallbackLogo ? shopLogo : ''))
  if (src) {
    return <img className="category-icon-img" src={src} alt={label} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  }
  return <span>{label.slice(0, 1).toUpperCase()}</span>
}`;

if (c.includes(oldCat)) {
  c = c.replace(oldCat, newCat);
  console.log('CategoryIcon patched');
} else {
  console.log('CategoryIcon NOT found');
}

// Fix BootScreen: replace old with progress-based
const oldBoot = `function BootScreen() {
  return (
    <div className="boot-screen" role="status" aria-live="polite">
      <div className="boot-card">
        <div className="boot-dog">\u{1F415}</div>
        <div className="boot-track"><span /></div>
        <strong>\u00C4\u0090ang t\u00E1\u00BA\u00A3i t\u00C3\u00A0i kho\u00E1\u00BA\u00A3n...</strong>
        <p>Shop \u00C4\u0091ang ki\u00E1\u00BB\u0083m tra phi\u00C3\u00AAn \u00C4\u0091\u0103\u006E\u0067 nh\u00E1\u00BA\u00ADp c\u00E1\u00BB\u00A7a b\u00E1\u00BA\u00A1n.</p>
      </div>
    </div>
  )
}`;

// Try byte-by-byte match on the actual file content
const bootIdx = c.indexOf('function BootScreen() {');
if (bootIdx !== -1) {
  // Find end of function
  let braceCount = 0;
  let startBody = -1;
  for (let i = bootIdx; i < c.length; i++) {
    if (c[i] === '{') {
      if (braceCount === 0) startBody = i;
      braceCount++;
    }
    if (c[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        // Found end of outer function
        const end = i + 1;
        // Include trailing newline
        let finalEnd = end;
        if (c[finalEnd] === '\n') finalEnd++;
        const newBoot = `function BootScreen({ progress, label }: { progress: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)))
  return (
    <div className="boot-screen" role="status" aria-live="polite">
      <div className="boot-card">
        <div className="boot-track" aria-label={label}>
          <span style={{ width: pct + '%' }} />
          <div className="boot-dog" style={{ left: 'calc(' + pct + '% - 24px)' }}>\u{1F415}</div>
        </div>
        <strong>{label}</strong>
        <p>Shop dang tai du lieu cho ban.</p>
      </div>
    </div>
  )
}
`;
        c = c.substring(0, bootIdx) + newBoot + c.substring(finalEnd);
        console.log('BootScreen patched');
        break;
      }
    }
  }
} else {
  console.log('BootScreen NOT found');
}

fs.writeFileSync(p, c, 'utf8');
console.log('DONE');