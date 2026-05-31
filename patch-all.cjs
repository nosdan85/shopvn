const fs = require('fs');

let shopApp = fs.readFileSync('src/ShopApp.tsx.bak', 'utf8');
let shopCss = fs.readFileSync('src/shop.css.bak', 'utf8');
let serverIdx = fs.readFileSync('server/index.cjs.bak', 'utf8');

let log = '';

// ===== FRONTEND: ShopApp.tsx =====
// emptyItem
{
  const eiStart = shopApp.indexOf('const emptyItem = {');
  const eiEndBlock = shopApp.indexOf('}', eiStart) + 1;
  const eiEndSemi = shopApp.indexOf(';', eiEndBlock) + 1;
  const newEmptyItem = `const emptyItem = {\n  name: '',\n  game_category_id: '',\n  image: '',\n  short_description: '',\n  description: '',\n  price: '',\n}\n\n`;
  shopApp = shopApp.slice(0, eiStart) + newEmptyItem + shopApp.slice(eiEndSemi);
  log += 'emptyItem\n';
}

// itemPayload
{
  const ppStart = shopApp.indexOf('function itemPayload');
  const bodyStart = shopApp.indexOf('{', ppStart);
  let brace = 0, end = -1;
  for (let i = bodyStart; i < shopApp.length; i++) {
    if (shopApp[i] === '{') brace++;
    if (shopApp[i] === '}') { brace--; if (brace === 0) { end = i + 1; break; } }
  }
  const newItemPayload = `function itemPayload(item: Record<string, unknown>) {\n  return {\n    name: String(item.name || '').trim(),\n    price: Number(item.price || 0),\n    game_category_id: item.game_category_id === '' || item.game_category_id == null ? null : Number(item.game_category_id),\n    image: String(item.image || '').trim(),\n    short_description: String(item.short_description || '').trim(),\n    description: String(item.description || '').trim(),\n  }\n}\n\n`;
  shopApp = shopApp.slice(0, ppStart) + newItemPayload + shopApp.slice(end);
  log += 'itemPayload\n';
}

// CategoryIcon boundary replace
{
  const start = shopApp.indexOf('function CategoryIcon(');
  const bodyStart = shopApp.indexOf('{', start);
  let brace = 0, end = -1;
  for (let i = bodyStart; i < shopApp.length; i++) {
    if (shopApp[i] === '{') brace++;
    if (shopApp[i] === '}') { brace--; if (brace === 0) { end = i + 1; break; } }
  }
  const replacement = `function CategoryIcon({ category, fallbackLogo = false }: { category?: Pick<GameCategory, 'icon' | 'name'> | null; fallbackLogo?: boolean }) {\n  const icon = String(category?.icon || '').trim()\n  const label = String(category?.name || 'Game')\n  const [failed, setFailed] = useState(false)\n  const src = assetUrl((!failed && icon) ? icon : (fallbackLogo ? shopLogo : ''))\n  if (src) {\n    return <img className=\"category-icon-img\" src={src} alt={label} loading=\"lazy\" decoding=\"async\" referrerPolicy=\"no-referrer\" onError={() => setFailed(true)} />\n  }\n  return <span>{label.slice(0, 1).toUpperCase()}</span>\n}\n\n`;
  shopApp = shopApp.slice(0, start) + replacement + shopApp.slice(end);
  log += 'CategoryIcon\n';
}

// BootScreen boundary replace
{
  const start = shopApp.indexOf('function BootScreen()');
  const bodyStart = shopApp.indexOf('{', start);
  let brace = 0, end = -1;
  for (let i = bodyStart; i < shopApp.length; i++) {
    if (shopApp[i] === '{') brace++;
    if (shopApp[i] === '}') { brace--; if (brace === 0) { end = i + 1; break; } }
  }
  const replacement = `function BootScreen({ progress, label }: { progress: number; label: string }) {\n  const pct = Math.max(0, Math.min(100, Math.round(progress)))\n  return (\n    <div className=\"boot-screen\" role=\"status\" aria-live=\"polite\">\n      <div className=\"boot-card\">\n        <div className=\"boot-track\" aria-label={label}>\n          <span style={{ width: pct + '%' }} />\n          <div className=\"boot-dog\" style={{ left: 'calc(' + pct + '% - 24px)' }}>🐕</div>\n        </div>\n        <strong>{label}</strong>\n        <p>Shop dang tai du lieu cho ban.</p>\n      </div>\n    </div>\n  )\n}\n\n`;
  shopApp = shopApp.slice(0, start) + replacement + shopApp.slice(end);
  log += 'BootScreen\n';
}

// boot state vars + BootScreen usage
shopApp = shopApp.replace('const [booting, setBooting] = useState(true)', "const [booting, setBooting] = useState(true)\n  const [bootProgress, setBootProgress] = useState(0)\n  const [bootLabel, setBootLabel] = useState('Dang tai...')");
shopApp = shopApp.replace('if (booting) return <BootScreen />', 'if (booting) return <BootScreen progress={bootProgress} label={bootLabel} />');
log += 'boot state + return\n';

// boot useEffect: replace first useEffect block only
{
  const marker = 'useEffect(() => {\n    let active = true';
  const start = shopApp.indexOf(marker);
  const end = shopApp.indexOf('}, [])', start) + '}, [])'.length;
  const replacement = `useEffect(() => {\n    let active = true\n    ;(async () => {\n      setBootProgress(5)\n      setBootLabel('Dang kiem tra dang nhap...')\n      try {\n        const data = await api<{ user: User }>('/auth/me')\n        if (active) setUser(data.user)\n      } catch {\n        if (active) setUser(null)\n      }\n\n      setBootProgress(55)\n      setBootLabel('Dang tai cau hinh shop...')\n      try {\n        const data = await api<Settings>('/settings/public')\n        if (active) setSettings(data)\n      } catch {}\n\n      setBootProgress(100)\n      setBootLabel('Hoan tat...')\n      if (active) setBooting(false)\n    })()\n    return () => {\n      active = false\n    }\n  }, [])`;
  shopApp = shopApp.slice(0, start) + replacement + shopApp.slice(end);
  log += 'boot useEffect\n';
}

// AdminItems boundary replace (minimal 6 fields)
{
  const start = shopApp.indexOf('function AdminItems({ setNotice }');
  const bodyStart = shopApp.indexOf('{', start);
  let brace = 0, end = -1;
  for (let i = bodyStart; i < shopApp.length; i++) {
    if (shopApp[i] === '{') brace++;
    if (shopApp[i] === '}') { brace--; if (brace === 0) { end = i + 1; break; } }
  }
  const replacement = `function AdminItems({ setNotice }: { setNotice: (message: string) => void }) {\n  const [items, setItems] = useState<Item[]>([])\n  const [categories, setCategories] = useState<GameCategory[]>([])\n  const [editing, setEditing] = useState<Record<string, unknown>>(emptyItem)\n  const [isEditing, setIsEditing] = useState(false)\n  const load = () => api<{ items: Item[] }>('/admin/items').then((data) => setItems(data.items))\n  const loadCategories = () => api<{ categories: GameCategory[] }>('/admin/game-categories').then((data) => setCategories(data.categories))\n  useEffect(() => {\n    load()\n    loadCategories()\n  }, [])\n\n  async function save(event: FormEvent) {\n    event.preventDefault()\n    const path = isEditing ? \`/admin/items/\${editing.id}\` : '/admin/items'\n    try {\n      await api(path, { method: isEditing ? 'PATCH' : 'POST', body: JSON.stringify(itemPayload(editing)) })\n      setEditing(emptyItem)\n      setIsEditing(false)\n      load()\n    } catch (error) {\n      setNotice(messageFromError(error))\n    }\n  }\n\n  async function hide(item: Item) {\n    if (!window.confirm(\`Xoa hoac an item \"\${item.name}\"?\`)) return\n    try {\n      const result = await api<{ softDeleted?: boolean }>(\`/admin/items/\${item.id}\`, { method: 'DELETE' })\n      setNotice(result.softDeleted ? 'Item da co trong don nen da duoc an.' : 'Da xoa item.')\n      load()\n    } catch (error) {\n      setNotice(messageFromError(error))\n    }\n  }\n\n  return (\n    <>\n      <h1>Quan ly item</h1>\n      <form className=\"admin-form\" onSubmit={save}>\n        <label>Ten item<input required placeholder=\"Vi du: Light Fruit\" value={String(editing.name || '')} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label>\n        <label>Gia ban<input type=\"number\" placeholder=\"Vi du: 50000\" value={numberInputValue(editing.price)} onChange={(event) => setEditing({ ...editing, price: numberInputNext(event.target.value) })} /></label>\n        <label>Game category<select value={String(editing.game_category_id || '')} onChange={(event) => setEditing({ ...editing, game_category_id: event.target.value })}><option value=\"\">Chua phan loai</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>\n        <label>Anh dai dien<input placeholder=\"Dan link anh\" value={String(editing.image || '')} onChange={(event) => setEditing({ ...editing, image: event.target.value })} /></label>\n        <label>Mo ta ngan<textarea placeholder=\"Mo ta ngan\" value={String(editing.short_description || '')} onChange={(event) => setEditing({ ...editing, short_description: event.target.value })} /></label>\n        <label>Mo ta chi tiet<textarea placeholder=\"Mo ta chi tiet\" value={String(editing.description || '')} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></label>\n        <button className=\"primary\">{isEditing ? 'Cap nhat item' : 'Them item'}</button>\n        {isEditing && <button type=\"button\" onClick={() => { setEditing(emptyItem); setIsEditing(false) }}>Huy sua</button>}\n      </form>\n      <TablePage title=\"Danh sach item\" headers={['Ten', 'Game', 'Gia', 'Trang thai', 'Thao tac']} rows={items.map((item) => [item.name, item.game_category_name || 'Chua phan loai', money(item.current_price || item.price), item.status, <span className=\"actions\"><button onClick={() => { setEditing(item); setIsEditing(true) }}>Sua</button><button onClick={() => hide(item)}>Xoa/An</button></span>])} />\n    </>\n  )\n}\n\n`;
  shopApp = shopApp.slice(0, start) + replacement + shopApp.slice(end);
  log += 'AdminItems\n';
}

// ===== CSS =====
// Make boot-track span not animated
shopCss = shopCss.replace(/\.boot-track span \{[\s\S]*?animation: boot-track-load[^;]*;[\s\S]*?\}/, `.boot-track span {\n  position: absolute;\n  inset: 0 auto 0 0;\n  width: 0%;\n  border-radius: inherit;\n  background: linear-gradient(90deg, var(--primary), #7df7c1);\n}`);
// boot-dog placed in track
shopCss = shopCss.replace(/\.boot-dog \{[\s\S]*?\}/, `.boot-dog {\n  position: absolute;\n  top: -20px;\n  left: 0;\n  width: 48px;\n  height: 48px;\n  display: grid;\n  place-items: center;\n  font-size: 2.1rem;\n}`);
log += 'CSS boot\n';

// ===== BACKEND: server/index.cjs =====
serverIdx = serverIdx.replace(
  "const { cacheDelPattern, cacheGet, cacheSet, createRedisRateLimitStore, redisKey, redisStatus, withRedisLock } = require('./redis.cjs');",
  "const { cacheDelPattern, cacheGet, cacheSet, createRedisRateLimitStore, redisKey, redisStatus, withRedisLock, sessionGetUser, sessionSetUser, sessionDelUser, setBotStatus, getBotStatus } = require('./redis.cjs');"
);
log += 'backend import\n';

// async getCurrentUser
serverIdx = serverIdx.replace(
  /function getCurrentUser\(req\) \{[\s\S]*?\n\}/,
  `async function getCurrentUser(req) {\n  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');\n  if (!token) return null;\n  try {\n    const payload = jwt.verify(token, jwtSecret);\n    const cached = await sessionGetUser(payload.id);\n    if (cached && cached.id === payload.id) return cached;\n    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);\n    if (user) sessionSetUser(user, 120).catch(() => undefined);\n    return user;\n  } catch (_error) {\n    return null;\n  }\n}`
);

serverIdx = serverIdx.replace(
  /function requireAuth\(req, res, next\) \{[\s\S]*?\n\}/,
  `async function requireAuth(req, res, next) {\n  const user = await getCurrentUser(req);\n  if (!user || user.status !== 'active') {\n    logSecurity({ eventType: 'auth_required_denied', severity: 'low', message: 'Unauthenticated request blocked.', req });\n    res.status(401).json({ message: 'Vui long dang nhap.' });\n    return;\n  }\n  req.user = user;\n  next();\n}`
);

serverIdx = serverIdx.replace(
  /function requireAdmin\(req, res, next\) \{[\s\S]*?\n\}/,
  `async function requireAdmin(req, res, next) {\n  const user = await getCurrentUser(req);\n  if (!user || user.status !== 'active' || !['admin', 'super_admin'].includes(user.role)) {\n    logSecurity({ eventType: 'admin_access_denied', userId: user?.id, severity: 'medium', message: 'Admin request blocked.', req });\n    res.status(403).json({ message: 'Ban khong co quyen truy cap admin.' });\n    return;\n  }\n  req.user = user;\n  next();\n}`
);
log += 'backend auth async\n';

// invalidate session on logout
serverIdx = serverIdx.replace(
  /app\.post\('\/api\/auth\/logout',[\s\S]*?\);/,
  `app.post('/api/auth/logout', async (req, res) => {\n  const user = await getCurrentUser(req);\n  if (user?.id) sessionDelUser(user.id).catch(() => undefined);\n  res.clearCookie('token', authCookieOptions()).json({ ok: true });\n});`
);

fs.writeFileSync('src/ShopApp.tsx', shopApp, 'utf8');
fs.writeFileSync('src/shop.css', shopCss, 'utf8');
fs.writeFileSync('server/index.cjs', serverIdx, 'utf8');
console.log(log);
console.log('DONE');