const fs = require('fs');
const p = 'src/ShopApp.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1) CategoryIcon: add onError fallback + referrerPolicy
c = c.replace(
  /function CategoryIcon\(\{ category, fallbackLogo = false \}[^}]+\}[^}]+\}[\s\S]*?return <span>\{label\.slice\(0, 1\)\.toUpperCase\(\)\}<\/span>\n\}/,
  `function CategoryIcon({ category, fallbackLogo = false }: { category?: Pick<GameCategory, 'icon' | 'name'> | null; fallbackLogo?: boolean }) {
  const icon = String(category?.icon || '').trim()
  const label = String(category?.name || 'Game')
  const [failed, setFailed] = useState(false)
  const src = assetUrl((!failed && icon) ? icon : (fallbackLogo ? shopLogo : ''))
  if (src) {
    return <img className="category-icon-img" src={src} alt={label} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  }
  return <span>{label.slice(0, 1).toUpperCase()}</span>
}`
);

// 2) BootScreen: progress-based with dog inside track
c = c.replace(
  /function BootScreen\(\) \{[\s\S]*?\n\}\n/,
  `function BootScreen({ progress, label }: { progress: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)))
  return (
    <div className="boot-screen" role="status" aria-live="polite">
      <div className="boot-card">
        <div className="boot-track" aria-label={label}>
          <span style={{ width: pct + '%' }} />
          <div className="boot-dog" style={{ left: 'calc(' + pct + '% - 24px)' }}>{String.fromCodePoint(0x1F415)}</div>
        </div>
        <strong>{label}</strong>
        <p>Shop dang tai du lieu cho ban.</p>
      </div>
    </div>
  )
}
`
);

// 3) booting state: add bootProgress + bootLabel
c = c.replace(
  "const [booting, setBooting] = useState(true)",
  "const [booting, setBooting] = useState(true)\n  const [bootProgress, setBootProgress] = useState(0)\n  const [bootLabel, setBootLabel] = useState('Dang tai...')"
);

// 4) BootScreen call: pass props
c = c.replace(
  "if (booting) return <BootScreen />",
  "if (booting) return <BootScreen progress={bootProgress} label={bootLabel} />"
);

// 5) Boot useEffect: progress-aware async
c = c.replace(
  /useEffect\(\(\) => \{\s*let active = true\s*api<\{ user: User \}>\('\/auth\/me'\)[\s\S]*?return \(\) => \{\s*active = false\s*\}\s*\}, \[\]\)/,
  `useEffect(() => {
    let active = true
    ;(async () => {
      setBootProgress(5)
      setBootLabel('Dang kiem tra dang nhap...')
      try {
        const data = await api<{ user: User }>('/auth/me')
        if (active) setUser(data.user)
      } catch {
        if (active) setUser(null)
      }

      setBootProgress(55)
      setBootLabel('Dang tai cau hinh shop...')
      try {
        const data = await api<Settings>('/settings/public')
        if (active) setSettings(data)
      } catch {
        // ignore
      }

      setBootProgress(100)
      setBootLabel('Hoan tat...')
      if (active) setBooting(false)
    })()
    return () => {
      active = false
    }
  }, [])`
);

fs.writeFileSync(p, c, 'utf8');
console.log('PATCH OK');