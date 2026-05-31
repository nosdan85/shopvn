const fs = require('fs');
let c = fs.readFileSync('src/ShopApp.tsx.bak','utf8').replace(/\r\n/g,'\n');

function findAfter(haystack, needle, from=0){
  const i = haystack.indexOf(needle, from);
  if(i===-1) throw new Error('needle not found: '+JSON.stringify(needle));
  return i;
}

// emptyItem replace
{
  const start = findAfter(c,'const emptyItem = {');
  const marker = '\n\nconst placeholderImage';
  const mid = findAfter(c, marker, start);
  const repl = "const emptyItem = {\n  name: '',\n  game_category_id: '',\n  image: '',\n  short_description: '',\n  description: '',\n  price: '',\n}\n\nconst placeholderImage";
  c = c.slice(0,start) + repl + c.slice(mid + marker.length);
}

// itemPayload boundary
{
  const start = findAfter(c,'function itemPayload(');
  const bodyStart = findAfter(c,'{',start);
  let brace=0,end=-1;
  for(let i=bodyStart;i<c.length;i++){
    if(c[i]==='{') brace++;
    if(c[i]==='}') { brace--; if(brace===0){ end=i+1; break; } }
  }
  const repl = "function itemPayload(item: Record<string, unknown>) {\n  return {\n    name: String(item.name || '').trim(),\n    price: Number(item.price || 0),\n    game_category_id: item.game_category_id === '' || item.game_category_id === null || item.game_category_id === undefined ? null : Number(item.game_category_id),\n    image: String(item.image || '').trim(),\n    short_description: String(item.short_description || '').trim(),\n    description: String(item.description || '').trim(),\n  }\n}\n\n";
  c = c.slice(0,start)+repl+c.slice(end);
}

// CategoryIcon boundary
{
  const start = findAfter(c,'function CategoryIcon(');
  const bodyStart = findAfter(c,'{',start);
  let brace=0,end=-1;
  for(let i=bodyStart;i<c.length;i++){
    if(c[i]==='{') brace++;
    if(c[i]==='}') { brace--; if(brace===0){ end=i+1; break; } }
  }
  const repl = "function CategoryIcon({ category, fallbackLogo = false }: { category?: Pick<GameCategory, 'icon' | 'name'> | null; fallbackLogo?: boolean }) {\n  const icon = String(category?.icon || '').trim()\n  const label = String(category?.name || 'Game')\n  const [failed, setFailed] = useState(false)\n  const src = assetUrl((!failed && icon) ? icon : (fallbackLogo ? shopLogo : ''))\n  if (src) {\n    return <img className=\"category-icon-img\" src={src} alt={label} loading=\"lazy\" decoding=\"async\" referrerPolicy=\"no-referrer\" onError={() => setFailed(true)} />\n  }\n  return <span>{label.slice(0, 1).toUpperCase()}</span>\n}\n\n";
  c = c.slice(0,start)+repl+c.slice(end);
}

// BootScreen boundary
{
  const start = findAfter(c,'function BootScreen()');
  const bodyStart = findAfter(c,'{',start);
  let brace=0,end=-1;
  for(let i=bodyStart;i<c.length;i++){
    if(c[i]==='{') brace++;
    if(c[i]==='}') { brace--; if(brace===0){ end=i+1; break; } }
  }
  const repl = "function BootScreen({ progress, label }: { progress: number; label: string }) {\n  const pct = Math.max(0, Math.min(100, Math.round(progress)))\n  return (\n    <div className=\"boot-screen\" role=\"status\" aria-live=\"polite\">\n      <div className=\"boot-card\">\n        <div className=\"boot-track\" aria-label={label}>\n          <span style={{ width: `${pct}%` }} />\n          <div className=\"boot-dog\" style={{ left: `calc(${pct}% - 24px)` }} aria-hidden=\"true\">🐕</div>\n        </div>\n        <strong>{label}</strong>\n        <p>Shop đang tải dữ liệu cho bạn.</p>\n      </div>\n    </div>\n  )\n}\n\n";
  c = c.slice(0,start)+repl+c.slice(end);
}

// boot states and return
c = c.replace('const [booting, setBooting] = useState(true)', "const [booting, setBooting] = useState(true)\n  const [bootProgress, setBootProgress] = useState(0)\n  const [bootLabel, setBootLabel] = useState('Đang tải...')");
c = c.replace('if (booting) return <BootScreen />', 'if (booting) return <BootScreen progress={bootProgress} label={bootLabel} />');

// boot useEffect replace
{
  const startNeedle = "useEffect(() => {\n    let active = true";
  const start = findAfter(c,startNeedle);
  const end = findAfter(c,'  }, [])', start) + '  }, [])'.length;
  const repl = "useEffect(() => {\n    let active = true\n\n    ;(async () => {\n      setBootProgress(10)\n      setBootLabel('Đang kiểm tra đăng nhập...')\n      try {\n        const data = await api<{ user: User }>('/auth/me')\n        if (active) setUser(data.user)\n      } catch {\n        if (active) setUser(null)\n      }\n\n      setBootProgress(60)\n      setBootLabel('Đang tải cấu hình shop...')\n      try {\n        const data = await api<Settings>('/settings/public')\n        if (active) setSettings(data)\n      } catch {\n        // ignore\n      }\n\n      setBootProgress(100)\n      setBootLabel('Hoàn tất...')\n      if (active) setBooting(false)\n    })()\n\n    return () => {\n      active = false\n    }\n  }, [])";
  c = c.slice(0,start)+repl+c.slice(end);
}

// AdminItems boundary
{
  const start = findAfter(c,'function AdminItems({ setNotice }');
  const bodyStart = findAfter(c,'{',start);
  let brace=0,end=-1;
  for(let i=bodyStart;i<c.length;i++){
    if(c[i]==='{') brace++;
    if(c[i]==='}') { brace--; if(brace===0){ end=i+1; break; } }
  }
  const repl = "function AdminItems({ setNotice }: { setNotice: (message: string) => void }) {\n  const [items, setItems] = useState<Item[]>([])\n  const [categories, setCategories] = useState<GameCategory[]>([])\n  const [editing, setEditing] = useState<Record<string, unknown>>(emptyItem)\n  const [isEditing, setIsEditing] = useState(false)\n  const load = () => api<{ items: Item[] }>('/admin/items').then((data) => setItems(data.items))\n  const loadCategories = () => api<{ categories: GameCategory[] }>('/admin/game-categories').then((data) => setCategories(data.categories))\n  useEffect(() => {\n    load()\n    loadCategories()\n  }, [])\n\n  async function save(event: FormEvent) {\n    event.preventDefault()\n    const path = isEditing ? `/admin/items/${editing.id}` : '/admin/items'\n    try {\n      await api(path, { method: isEditing ? 'PATCH' : 'POST', body: JSON.stringify(itemPayload(editing)) })\n      setEditing(emptyItem)\n      setIsEditing(false)\n      load()\n    } catch (error) {\n      setNotice(messageFromError(error))\n    }\n  }\n\n  async function hide(item: Item) {\n    if (!window.confirm(`Xóa hoặc ẩn item \"${item.name}\"?`)) return\n    try {\n      const result = await api<{ softDeleted?: boolean }>(`/admin/items/${item.id}`, { method: 'DELETE' })\n      setNotice(result.softDeleted ? 'Item đã có trong đơn nên đã được ẩn.' : 'Đã xóa item.')\n      load()\n    } catch (error) {\n      setNotice(messageFromError(error))\n    }\n  }\n\n  return (\n    <>\n      <h1>Quản lý item</h1>\n      <form className=\"admin-form\" onSubmit={save}>\n        <label>Tên item<input required placeholder=\"Ví dụ: Light Fruit\" value={String(editing.name || '')} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label>\n        <label>Giá bán<input type=\"number\" placeholder=\"Ví dụ: 50000\" value={numberInputValue(editing.price)} onChange={(event) => setEditing({ ...editing, price: numberInputNext(event.target.value) })} /></label>\n        <label>Game category<select value={String(editing.game_category_id || '')} onChange={(event) => setEditing({ ...editing, game_category_id: event.target.value })}><option value=\"\">Chưa phân loại</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>\n        <label>Link ảnh<input placeholder=\"Dán link ảnh\" value={String(editing.image || '')} onChange={(event) => setEditing({ ...editing, image: event.target.value })} /></label>\n        <label>Mô tả ngắn<textarea placeholder=\"Mô tả ngắn\" value={String(editing.short_description || '')} onChange={(event) => setEditing({ ...editing, short_description: event.target.value })} /></label>\n        <label>Mô tả chi tiết<textarea placeholder=\"Mô tả chi tiết\" value={String(editing.description || '')} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></label>\n        <button className=\"primary\">{isEditing ? 'Cập nhật item' : 'Thêm item'}</button>\n        {isEditing && <button type=\"button\" onClick={() => { setEditing(emptyItem); setIsEditing(false) }}>Hủy sửa</button>}\n      </form>\n      <TablePage title=\"Danh sách item\" headers={['Tên', 'Game', 'Giá', 'Trạng thái', 'Thao tác']} rows={items.map((item) => [item.name, item.game_category_name || 'Chưa phân loại', money(item.current_price || item.price), item.status, <span className=\"actions\"><button onClick={() => { setEditing(item); setIsEditing(true) }}>Sửa</button><button onClick={() => hide(item)}>Xóa/ẩn</button></span>])} />\n    </>\n  )\n}\n\n";
  c = c.slice(0,start)+repl+c.slice(end);
}

fs.writeFileSync('src/ShopApp.tsx', c.replace(/\n/g,'\r\n'), 'utf8');
console.log('front ok');