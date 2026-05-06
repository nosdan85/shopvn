const bcrypt = require('bcryptjs');
const { db, setSetting } = require('./db.cjs');

const now = new Date().toISOString();

const settings = {
  site_name: 'Sailor Piece Item Shop',
  slogan: 'Shop item Sailor Piece Roblox uy tín, giao nhanh, hỗ trợ tận tâm.',
  support_email: 'support@sailorpiece.local',
  support_phone: '0900 000 000',
  zalo_url: 'https://zalo.me/0900000000',
  discord_url: 'https://discord.gg/sailorpiece',
  facebook_url: 'https://facebook.com/sailorpieceshop',
  maintenance_mode: 'false',
  registration_enabled: 'true',
  deposit_enabled: 'true',
  purchase_enabled: 'true',
  bank_name: 'MB Bank',
  bank_account_name: 'SAILOR PIECE SHOP',
  bank_account_number: '0123456789',
  bank_qr_url: '',
  smtp_enabled: 'false',
  homepage_notice: 'Khuyến mãi khai trương: nhiều item Sailor Piece giảm giá trong tuần này.',
  hero_banner: 'Săn item Sailor Piece Roblox chỉ trong vài phút.',
};

for (const [key, value] of Object.entries(settings)) {
  setSetting(key, value);
}

function insertUser(user) {
  const exists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(user.username, user.email);
  if (exists) return exists.id;
  const passwordHash = bcrypt.hashSync(user.password, 12);
  const result = db.prepare(`
    INSERT INTO users (username, email, password_hash, balance, role, status, full_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
  `).run(user.username, user.email, passwordHash, user.balance, user.role, user.fullName, now, now);
  return result.lastInsertRowid;
}

const adminId = insertUser({
  username: 'admin',
  email: 'admin@sailorpiece.local',
  password: 'Admin@123456',
  balance: 0,
  role: 'admin',
  fullName: 'Quản trị viên',
});

const demoUserId = insertUser({
  username: 'demo',
  email: 'demo@sailorpiece.local',
  password: 'Demo@123456',
  balance: 1500000,
  role: 'user',
  fullName: 'Khách mẫu',
});

const items = [
  {
    name: 'Legendary Saber',
    slug: 'legendary-saber',
    item_code: 'SP-SABER-LGD',
    image: 'https://images.unsplash.com/photo-1598520106830-8c45c2035460?auto=format&fit=crop&w=900&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1598520106830-8c45c2035460?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80',
    ],
    short_description: 'Kiếm hiếm cho lối chơi cận chiến tốc độ cao.',
    description: 'Legendary Saber phù hợp người chơi thích sát thương ổn định, combo nhanh và ngoại hình nổi bật trong Sailor Piece.',
    price: 850000,
    original_price: 1000000,
    sale_price: 850000,
    stock: 8,
    sold_count: 42,
    is_featured: 1,
    is_best_seller: 1,
    is_sale: 1,
    sort_order: 1,
  },
  {
    name: 'Dragon Fruit',
    slug: 'dragon-fruit',
    item_code: 'SP-FRUIT-DRAGON',
    image: 'https://images.unsplash.com/photo-1604079628040-94301bb21b91?auto=format&fit=crop&w=900&q=80',
    gallery: ['https://images.unsplash.com/photo-1604079628040-94301bb21b91?auto=format&fit=crop&w=900&q=80'],
    short_description: 'Trái ác quỷ mạnh, hiệu ứng đẹp, cực hiếm.',
    description: 'Dragon Fruit dành cho người chơi muốn tăng sức mạnh nhanh và nổi bật khi farm boss hoặc PvP.',
    price: 2200000,
    original_price: 2600000,
    sale_price: 2200000,
    stock: 3,
    sold_count: 25,
    is_featured: 1,
    is_best_seller: 1,
    is_sale: 1,
    sort_order: 2,
  },
  {
    name: 'Observation Haki Scroll',
    slug: 'observation-haki-scroll',
    item_code: 'SP-HKI-OBS',
    image: 'https://images.unsplash.com/photo-1563201515-adbe35c669c9?auto=format&fit=crop&w=900&q=80',
    gallery: ['https://images.unsplash.com/photo-1563201515-adbe35c669c9?auto=format&fit=crop&w=900&q=80'],
    short_description: 'Vật phẩm hỗ trợ nâng cấp Haki quan sát.',
    description: 'Scroll giúp người chơi tối ưu hành trình nâng cấp nhân vật và săn boss hiệu quả hơn.',
    price: 450000,
    original_price: 450000,
    sale_price: null,
    stock: 15,
    sold_count: 64,
    is_featured: 0,
    is_best_seller: 1,
    is_sale: 0,
    sort_order: 3,
  },
  {
    name: 'Phoenix Wing',
    slug: 'phoenix-wing',
    item_code: 'SP-WING-PHX',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=900&q=80',
    gallery: ['https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=900&q=80'],
    short_description: 'Phụ kiện hiếm cho build linh hoạt.',
    description: 'Phoenix Wing tăng độ nổi bật cho nhân vật và phù hợp các bộ outfit phong cách hải tặc.',
    price: 650000,
    original_price: 780000,
    sale_price: 650000,
    stock: 0,
    sold_count: 31,
    is_featured: 1,
    is_best_seller: 0,
    is_sale: 1,
    sort_order: 4,
  },
  {
    name: 'Sea King Core',
    slug: 'sea-king-core',
    item_code: 'SP-CORE-SEAKING',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    gallery: ['https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80'],
    short_description: 'Nguyên liệu boss hiếm để nâng cấp trang bị.',
    description: 'Sea King Core thường dùng cho nâng cấp item cấp cao, số lượng có hạn và giao nhanh sau khi đặt.',
    price: 320000,
    original_price: 320000,
    sale_price: null,
    stock: 22,
    sold_count: 97,
    is_featured: 0,
    is_best_seller: 1,
    is_sale: 0,
    sort_order: 5,
  },
  {
    name: 'Captain Bundle',
    slug: 'captain-bundle',
    item_code: 'SP-BUNDLE-CAPTAIN',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80',
    gallery: ['https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80'],
    short_description: 'Combo item tiết kiệm cho người mới.',
    description: 'Bundle gồm nhiều vật phẩm Sailor Piece phổ biến, giúp người mới bắt đầu nhanh hơn với chi phí tối ưu.',
    price: 1200000,
    original_price: 1500000,
    sale_price: 1200000,
    stock: 7,
    sold_count: 18,
    is_featured: 1,
    is_best_seller: 0,
    is_sale: 1,
    sort_order: 6,
  },
];

for (const item of items) {
  const exists = db.prepare('SELECT id FROM items WHERE slug = ?').get(item.slug);
  if (!exists) {
    db.prepare(`
      INSERT INTO items (
        name, slug, item_code, image, gallery, short_description, description, price, original_price, sale_price,
        stock, sold_count, is_featured, is_best_seller, is_sale, status, sort_order, seo_title, seo_description, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
    `).run(
      item.name,
      item.slug,
      item.item_code,
      item.image,
      JSON.stringify(item.gallery),
      item.short_description,
      item.description,
      item.price,
      item.original_price,
      item.sale_price,
      item.stock,
      item.sold_count,
      item.is_featured,
      item.is_best_seller,
      item.is_sale,
      item.sort_order,
      `${item.name} - Sailor Piece Item Shop`,
      item.short_description,
      now,
      now,
    );
  }
}

const completedOrder = db.prepare('SELECT id FROM orders WHERE order_code = ?').get('SP-DEMO-001');
if (!completedOrder) {
  const orderResult = db.prepare(`
    INSERT INTO orders (order_code, user_id, total_amount, status, roblox_username, roblox_profile, roblox_display_name, customer_note, admin_note, completed_at)
    VALUES ('SP-DEMO-001', ?, 450000, 'completed', 'DemoRobloxUser', 'https://www.roblox.com/users/1/profile', 'DemoPlayer', 'Giao buổi tối giúp mình', 'Đã giao item qua server riêng', CURRENT_TIMESTAMP)
  `).run(demoUserId);
  const item = db.prepare('SELECT id, name FROM items WHERE slug = ?').get('observation-haki-scroll');
  db.prepare('INSERT INTO order_items (order_id, item_id, item_name, quantity, price, total_price) VALUES (?, ?, ?, 1, 450000, 450000)')
    .run(orderResult.lastInsertRowid, item.id, item.name);
  db.prepare(`
    INSERT INTO reviews (user_id, item_id, order_id, rating, content, status)
    VALUES (?, ?, ?, 5, 'Shop giao nhanh, tư vấn rõ ràng và item đúng như mô tả.', 'approved')
  `).run(demoUserId, item.id, orderResult.lastInsertRowid);
}

console.log('Seed completed');
console.log('Admin: admin / Admin@123456');
console.log('Demo user: demo / Demo@123456');
