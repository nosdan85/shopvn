const fs = require('fs');
const p = 'src/ShopApp.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1) emptyItem: replace with minimal fields
const eiStart = c.indexOf('const emptyItem = {');
const eiEnd = c.indexOf('}', eiStart) + 1;
const eiAfterSemi = c.indexOf(';', eiEnd) + 1;
const newEmptyItem = `const emptyItem = {
  name: '',
  game_category_id: '',
  image: '',
  short_description: '',
  description: '',
  price: '',
};

`;
c = c.slice(0, eiStart) + newEmptyItem + c.slice(eiAfterSemi);
console.log('1. emptyItem replaced');

// 2) itemPayload: keep only the 6 fields
const ppStart = c.indexOf('function itemPayload');
const ppEnd = c.indexOf('return {', ppStart);
const ppEndBrace = c.indexOf('}', ppEnd) + 1;
const newItemPayload = `function itemPayload(item: Record<string, unknown>) {
  return {
    name: String(item.name || '').trim(),
    price: Number(item.price || 0),
    game_category_id: item.game_category_id === '' || item.game_category_id == null ? null : Number(item.game_category_id),
    image: String(item.image || '').trim(),
    short_description: String(item.short_description || '').trim(),
    description: String(item.description || '').trim(),
  }
};
`;
c = c.slice(0, ppStart) + newItemPayload + c.slice(ppEndBrace);
console.log('2. itemPayload replaced');

// 3) AdminItems: find function start/end, replace with minimal form
const aiStart = c.indexOf('function AdminItems({ setNotice }');
let aiBrace = 0, aiStarted = false, aiEnd = -1;
for (let i = aiStart; i < c.length; i++) {
  if (c[i] === '{') { aiBrace++; aiStarted = true; }
  if (c[i] === '}') { aiBrace--; if (aiStarted && aiBrace === 0) { aiEnd = i + 1; break; } }
}
if (aiEnd === -1) { console.log('AdminItems end not found'); process.exit(1); }

const newAdminItems = `function AdminItems({ setNotice }: { setNotice: (message: string) => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<GameCategory[]>([])
  const [editing, setEditing] = useState<Record<string, unknown>>(emptyItem)
  const [isEditing, setIsEditing] = useState(false)
  const load = () => api<{ items: Item[] }>('/admin/items').then((data) => setItems(data.items))
  const loadCategories = () => api<{ categories: GameCategory[] }>('/admin/game-categories').then((data) => setCategories(data.categories))
  useEffect(() => { load(); loadCategories() }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    const path = isEditing ? \`/admin/items/\${editing.id}\` : '/admin/items'
    try {
      await api(path, { method: isEditing ? 'PATCH' : 'POST', body: JSON.stringify(itemPayload(editing)) })
      setEditing(emptyItem); setIsEditing(false); load()
    } catch (error) { setNotice(messageFromError(error)) }
  }

  async function hide(item: Item) {
    if (!window.confirm(\`Xoa hoac an item "\${item.name}"?\`)) return
    try {
      const result = await api<{ softDeleted?: boolean }>(\`/admin/items/\${item.id}\`, { method: 'DELETE' })
      setNotice(result.softDeleted ? 'Item da co trong don nen da duoc an.' : 'Da xoa item.')
      load()
    } catch (error) { setNotice(messageFromError(error)) }
  }

  return (
    <>
      <h1>Quan ly item</h1>
      <form className="admin-form" onSubmit={save}>
        <label>Ten item<input required placeholder="Vi du: Light Fruit" value={String(editing.name || '')} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
        <label>Gia ban<input type="number" placeholder="Vi du: 50000" value={numberInputValue(editing.price)} onChange={(e) => setEditing({ ...editing, price: numberInputNext(e.target.value) })} /></label>
        <label>Game category<select value={String(editing.game_category_id || '')} onChange={(e) => setEditing({ ...editing, game_category_id: e.target.value })}><option value="">Chua phan loai</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Anh dai dien<input placeholder="Dan link anh" value={String(editing.image || '')} onChange={(e) => setEditing({ ...editing, image: e.target.value })} /></label>
        <label>Mo ta ngan<textarea placeholder="Mo ta ngan hien thi tren card" value={String(editing.short_description || '')} onChange={(e) => setEditing({ ...editing, short_description: e.target.value })} /></label>
        <label>Mo ta chi tiet<textarea placeholder="Thong tin chi tiet cho trang san pham" lastVal={String(editing.description || '')} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
        <button className="primary">{isEditing ? 'Cap nhat item' : 'Them item'}</button>
        {isEditing && <button type="button" onClick={() => { setEditing(emptyItem); setIsEditing(false) }}>Huy sua</button>}
      </form>
      <TablePage title="Danh sach item" headers={['Ten', 'Game', 'Gia', 'Trang thai', 'Thao tac']} rows={items.map((item) => [item.name, item.game_category_name || 'Chua phan loai', money(item.price || 0), item.status, <span className="actions"><button onClick={() => { setEditing(item); setIsEditing(true) }}>Sua</button><button onClick={() => hide(item)}>Xoa/An</button></span>])} />
    </>
  )
}
`;
c = c.slice(0, aiStart) + newAdminItems + c.slice(aiEnd);
console.log('3. AdminItems replaced');

fs.writeFileSync(p, c, 'utf8');
console.log('PATCH DONE');