const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

function loadDbWithTempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shopvn-db-'));
  const dbFile = path.join(dir, 'test.sqlite');
  process.env.DATABASE_PATH = dbFile;
  process.env.DATA_DIR = dir;
  delete require.cache[require.resolve('../server/db.cjs')];
  const loaded = require('../server/db.cjs');
  return {
    ...loaded,
    cleanup() {
      loaded.db.close();
      delete process.env.DATABASE_PATH;
      delete process.env.DATA_DIR;
      delete require.cache[require.resolve('../server/db.cjs')];
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

test('database supports game categories assigned to items', () => {
  const { db, cleanup } = loadDbWithTempFile();
  try {
    const categoryColumns = db.prepare('PRAGMA table_info(game_categories)').all().map((column) => column.name);
    assert.deepEqual(
      ['id', 'name', 'slug', 'icon', 'description', 'status', 'sort_order', 'created_at', 'updated_at'].every((column) => categoryColumns.includes(column)),
      true,
    );

    const itemColumns = db.prepare('PRAGMA table_info(items)').all().map((column) => column.name);
    assert.equal(itemColumns.includes('game_category_id'), true);

    const category = db.prepare(`
      INSERT INTO game_categories (name, slug, icon, description, status, sort_order)
      VALUES ('Sailor Piece', 'sailor-piece', 'anchor', 'Default game', 'active', 1)
    `).run();
    const item = db.prepare(`
      INSERT INTO items (name, slug, game_category_id, image, gallery, short_description, description, price, stock, status)
      VALUES ('Test Item', 'test-item', ?, '', '[]', '', '', 1000, 5, 'active')
    `).run(category.lastInsertRowid);

    const joined = db.prepare(`
      SELECT items.id, game_categories.slug AS game_category_slug
      FROM items
      JOIN game_categories ON game_categories.id = items.game_category_id
      WHERE items.id = ?
    `).get(item.lastInsertRowid);
    assert.equal(joined.game_category_slug, 'sailor-piece');
  } finally {
    cleanup();
  }
});
