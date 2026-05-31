const fs=require('fs');
let c=fs.readFileSync('src/ShopApp.tsx','utf8');

// emptyItem exact replace
c=c.replace(/const emptyItem = \{[\s\S]*?\n\}\n\nconst placeholderImage/, `const emptyItem = {\n  name: '',\n  game_category_id: '',\n  image: '',\n  short_description: '',\n  description: '',\n  price: '',\n}\n\nconst placeholderImage`);

// itemPayload exact replace (match function itemPayload(...){ return { ... } })
c=c.replace(/function itemPayload\(item: Record<string, unknown>\) \{[\s\S]*?\n\}/, `function itemPayload(item: Record<string, unknown>) {\n  return {\n    name: String(item.name || '').trim(),\n    price: Number(item.price || 0),\n    game_category_id: item.game_category_id === '' || item.game_category_id === null || item.game_category_id === undefined ? null : Number(item.game_category_id),\n    image: String(item.image || '').trim(),\n    short_description: String(item.short_description || '').trim(),\n    description: String(item.description || '').trim(),\n  }\n}`);

// CategoryIcon boundary replace by locating start
{
  const start=c.indexOf('function CategoryIcon(');
  if(start!==-1){
    const bodyStart=c.indexOf('{',start);
    let brace=0,end=-1;
    for(let i=bodyStart;i<c.length;i++){
      if(c[i]==='{') brace++;
      if(c[i]==='}') {brace--; if(brace===0){end=i+1;break;}}
    }
    const repl=`function CategoryIcon({ category, fallbackLogo = false }: { category?: Pick<GameCategory, 'icon' | 'name'> | null; fallbackLogo?: boolean }) {\n  const icon = String(category?.icon || '').trim()\n  const label = String(category?.name || 'Game')\n  const [failed, setFailed] = useState(false)\n  const src = assetUrl((!failed && icon) ? icon : (fallbackLogo ? shopLogo : ''))\n  if (src) {\n    return <img className=\"category-icon-img\" src={src} alt={label} loading=\"lazy\" decoding=\"async\" referrerPolicy=\"no-referrer\" onError={() => setFailed(true)} />\n  }\n  return <span>{label.slice(0, 1).toUpperCase()}</span>\n}`;
    c=c.slice(0,start)+repl+c.slice(end);
  }
}

// BootScreen boundary
{
  const start=c.indexOf('function BootScreen()');
  if(start!==-1){
    const bodyStart=c.indexOf('{',start);
    let brace=0,end=-1;
    for(let i=bodyStart;i<c.length;i++){
      if(c[i]==='{') brace++;
      if(c[i]==='}') {brace--; if(brace===0){end=i+1;break;}}
    }
    const repl=`function BootScreen({ progress, label }: { progress: number; label: string }) {\n  const pct = Math.max(0, Math.min(100, Math.round(progress)))\n  return (\n    <div className=\"boot-screen\" role=\"status\" aria-live=\"polite\">\n      <div className=\"boot-card\">\n        <div className=\"boot-track\" aria-label={label}>\n          <span style={{ width: \`${'${pct}'}%\` }} />\n          <div className=\"boot-dog\" style={{ left: \`calc(${ '${pct}' }% - 24px)\` }} aria-hidden=\"true\">🐕</div>\n        </div>\n        <strong>{label}</strong>\n        <p>Shop đang tải dữ liệu cho bạn.</p>\n      </div>\n    </div>\n  )\n}`;
    c=c.slice(0,start)+repl+c.slice(end);
  }
}

// add boot progress state
c=c.replace('const [booting, setBooting] = useState(true)', "const [booting, setBooting] = useState(true)\n  const [bootProgress, setBootProgress] = useState(0)\n  const [bootLabel, setBootLabel] = useState('Đang tải...')");

// replace boot useEffect block by regex from bak
c=c.replace(/useEffect\(\(\) => \{\n    let active = true[\s\S]*?\n  \}, \[\]\)/, `useEffect(() => {\n    let active = true\n\n    ;(async () => {\n      setBootProgress(10)\n      setBootLabel('Đang kiểm tra đăng nhập...')\n      try {\n        const data = await api<{ user: User }>('/auth/me')\n        if (active) setUser(data.user)\n      } catch {\n        if (active) setUser(null)\n      }\n\n      setBootProgress(60)\n      setBootLabel('Đang tải cấu hình shop...')\n      try {\n        const data = await api<Settings>('/settings/public')\n        if (active) setSettings(data)\n      } catch {\n        // ignore\n      }\n\n      setBootProgress(100)\n      setBootLabel('Hoàn tất...')\n      if (active) setBooting(false)\n    })()\n\n    return () => {\n      active = false\n    }\n  }, [])`);

c=c.replace('if (booting) return <BootScreen />','if (booting) return <BootScreen progress={bootProgress} label={bootLabel} />');

fs.writeFileSync('src/ShopApp.tsx',c,'utf8');
console.log('front patched');