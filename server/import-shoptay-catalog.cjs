const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const { db, setSetting } = require('./db.cjs');

const IMPORT_PUBLIC_ROOT = path.join(__dirname, '..', 'public', 'imports', 'shoptay');
const IMPORT_PRODUCTS_ROOT = path.join(IMPORT_PUBLIC_ROOT, 'products');
const IMPORT_PICTURES_ROOT = path.join(IMPORT_PUBLIC_ROOT, 'pictures');
const IMPORT_PRODUCTS_WEB_PATH = '/imports/shoptay/products';
const IMPORT_PICTURES_WEB_PATH = '/imports/shoptay/pictures';

function normalizeSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `item-${Date.now()}`;
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toSafeFileName(value) {
  return String(value || '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function extractShopDataLiteral(sourceText) {
  const match = String(sourceText || '').match(/const\s+SHOP_DATA\s*=\s*({[\s\S]*?})\s*;\s*const\s+PRICE_PATTERN/m);
  if (!match) throw new Error('Could not find SHOP_DATA in seeder.js');
  return match[1];
}

function parseShoptaySeedCatalog(sourceText) {
  const literal = extractShopDataLiteral(sourceText);
  const data = vm.runInNewContext(`(${literal})`, {});
  const groups = Object.keys(data || {}).map((key) => ({
    key,
    slug: normalizeSlug(key),
    items: Array.isArray(data[key]) ? data[key] : [],
  }));
  const products = groups.flatMap((group) => group.items.map((item) => ({
    ...item,
    category: group.key,
    categorySlug: group.slug,
  })));
  return { groups, products };
}

function normalizeShoptayGame(source) {
  return {
    name: String(source.name || '').trim(),
    slug: normalizeSlug(source.slug || source.name),
    icon: String(source.image || '').trim(),
    status: source.active === false ? 'hidden' : 'active',
  };
}

function normalizeShoptayProduct({ source, gameCategoryId }) {
  return {
    name: String(source.name || '').trim(),
    slug: normalizeSlug(source.slug || source.name),
    game_category_id: gameCategoryId || null,
    image: String(source.image || '').trim(),
    short_description: String(source.category || '').trim(),
    description: String(source.desc || '').trim(),
    price: Number(source.price || 0),
    stock: Number(source.stock || 999999),
    status: 'active',
  };
}

function parseOneTimePrice(value) {
  const match = String(value || '').match(/\$?\s*([0-9]*\.?[0-9]+)/);
  if (!match) return 0;
  const usd = Number(match[1]);
  if (!Number.isFinite(usd)) return 0;
  return Math.round(usd * 26000);
}

function selectImportedImagePath(sourceImageName, availableFiles) {
  const names = Array.isArray(availableFiles) ? availableFiles : [];
  const requested = path.basename(String(sourceImageName || '')).toLowerCase();
  if (!names.length) return '';
  const exact = names.find((name) => name.toLowerCase() === requested);
  if (exact) return `${IMPORT_PRODUCTS_WEB_PATH}/${exact}`;

  const requestedSlug = normalizeSlug(requested.replace(/\.[^.]+$/, ''));
  const partial = names.find((name) => normalizeSlug(name.replace(/\.[^.]+$/, '')).includes(requestedSlug));
  if (partial) return `${IMPORT_PRODUCTS_WEB_PATH}/${partial}`;

  return `${IMPORT_PRODUCTS_WEB_PATH}/${names[0]}`;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function clearDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) fs.rmSync(entryPath, { recursive: true, force: true });
    else fs.unlinkSync(entryPath);
  }
}

function expandZipToTemp(zipPath) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shoptay-import-'));
  execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tempDir.replace(/'/g, "''")}' -Force`,
    ],
    { stdio: 'ignore' },
  );
  return tempDir;
}

function copyAssets(sourceDir, targetDir) {
  ensureDir(targetDir);
  clearDirectory(targetDir);
  if (!fs.existsSync(sourceDir)) return [];
  const copied = [];
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const safeName = toSafeFileName(entry.name);
    fs.copyFileSync(path.join(sourceDir, entry.name), path.join(targetDir, safeName));
    copied.push(safeName);
  }
  return copied.sort((left, right) => left.localeCompare(right));
}

function upsertCategory(category) {
  const existing = db.prepare('SELECT id FROM game_categories WHERE slug = ?').get(category.slug);
  if (existing) {
    db.prepare(`
      UPDATE game_categories
      SET name = ?, icon = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(category.name, category.icon, category.status, existing.id);
    return existing.id;
  }
  const result = db.prepare(`
    INSERT INTO game_categories (name, slug, icon, description, status, sort_order)
    VALUES (?, ?, ?, '', ?, 0)
  `).run(category.name, category.slug, category.icon, category.status);
  return Number(result.lastInsertRowid);
}

function upsertItem(item) {
  const existing = db.prepare('SELECT id FROM items WHERE slug = ?').get(item.slug);
  if (existing) {
    db.prepare(`
      UPDATE items
      SET name = ?, game_category_id = ?, image = ?, short_description = ?, description = ?, price = ?,
          stock = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      item.name,
      item.game_category_id,
      item.image,
      item.short_description,
      item.description,
      item.price,
      item.stock,
      item.status,
      existing.id,
    );
    return existing.id;
  }
  const result = db.prepare(`
    INSERT INTO items (
      name, slug, game_category_id, item_code, image, gallery, short_description, description,
      price, original_price, sale_price, stock, sold_count, is_featured, is_best_seller, is_sale,
      status, sort_order, seo_title, seo_description
    )
    VALUES (?, ?, ?, '', ?, '[]', ?, ?, ?, NULL, NULL, ?, 0, 0, 0, 0, ?, 0, ?, ?)
  `).run(
    item.name,
    item.slug,
    item.game_category_id,
    item.image,
    item.short_description,
    item.description,
    item.price,
    item.stock,
    item.status,
    item.name,
    item.short_description || item.description || item.name,
  );
  return Number(result.lastInsertRowid);
}

function importIntoSqlite({ groups, importedProductFiles, importedPictureFiles, dryRun }) {
  const bannerPath = importedPictureFiles.includes('banner.jpg')
    ? `${IMPORT_PICTURES_WEB_PATH}/banner.jpg`
    : importedPictureFiles.length
      ? `${IMPORT_PICTURES_WEB_PATH}/${importedPictureFiles[0]}`
      : '';

  const categoryMap = new Map();
  for (const group of groups) {
    const mapped = normalizeShoptayGame({
      name: group.key,
      slug: group.slug,
      image: '',
      active: true,
    });
    if (dryRun) {
      categoryMap.set(group.key, { id: categoryMap.size + 1, ...mapped });
      continue;
    }
    const id = upsertCategory(mapped);
    categoryMap.set(group.key, { id, ...mapped });
  }

  const importedItems = [];
  for (const group of groups) {
    for (const sourceItem of group.items) {
      const item = normalizeShoptayProduct({
        source: {
          name: sourceItem.name,
          slug: normalizeSlug(sourceItem.name),
          image: selectImportedImagePath(sourceItem.image, importedProductFiles),
          desc: [
            `Imported from shoptay`,
            sourceItem.oneTimePrice ? `One-time: ${sourceItem.oneTimePrice}` : '',
            sourceItem.bulkPriceString ? `Bulk: ${sourceItem.bulkPriceString}` : '',
          ].filter(Boolean).join(' | '),
          category: group.key,
          price: parseOneTimePrice(sourceItem.oneTimePrice),
          stock: 999999,
        },
        gameCategoryId: categoryMap.get(group.key)?.id || null,
      });
      importedItems.push(item);
    }
  }

  if (dryRun) {
    return {
      categories: Array.from(categoryMap.values()),
      items: importedItems,
      bannerPath,
    };
  }

  const bestSellerIds = [];
  for (const item of importedItems) {
    const id = upsertItem(item);
    if (bestSellerIds.length < 6) bestSellerIds.push(id);
  }

  if (bannerPath) setSetting('banners', JSON.stringify([bannerPath]));
  if (bestSellerIds.length) setSetting('best_seller_ids', JSON.stringify(bestSellerIds));
  setSetting('purchase_enabled', 'true');

  return {
    categories: Array.from(categoryMap.values()),
    items: importedItems,
    bannerPath,
    bestSellerIds,
  };
}

function readFileRequired(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing source file: ${filePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

function parseCliArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!String(value).startsWith('--')) continue;
    const next = argv[index + 1];
    args.set(value, next && !String(next).startsWith('--') ? next : '');
  }
  return {
    dryRun: argv.includes('--dry-run'),
    zipPath: args.get('--zip') || '',
  };
}

function importShoptayCatalog({ zipPath, dryRun = false }) {
  if (!zipPath) throw new Error('Missing --zip path for shoptay import.');
  const extractedRoot = expandZipToTemp(path.resolve(zipPath));
  const projectRoot = path.join(extractedRoot, 'shoptay-main');
  const seederPath = path.join(projectRoot, 'api', 'utils', 'seeder.js');
  const sourceText = readFileRequired(seederPath);
  const parsed = parseShoptaySeedCatalog(sourceText);

  const importedProductFiles = copyAssets(
    path.join(projectRoot, 'web', 'public', 'products'),
    IMPORT_PRODUCTS_ROOT,
  );
  const importedPictureFiles = copyAssets(
    path.join(projectRoot, 'web', 'public', 'pictures'),
    IMPORT_PICTURES_ROOT,
  );

  const imported = importIntoSqlite({
    groups: parsed.groups,
    importedProductFiles,
    importedPictureFiles,
    dryRun,
  });

  return {
    dryRun,
    zipPath: path.resolve(zipPath),
    groups: parsed.groups.length,
    products: parsed.products.length,
    importedProductFiles: importedProductFiles.length,
    importedPictureFiles: importedPictureFiles.length,
    bannerPath: imported.bannerPath,
    bestSellerIds: imported.bestSellerIds || [],
  };
}

if (require.main === module) {
  const { dryRun, zipPath } = parseCliArgs(process.argv.slice(2));
  const result = importShoptayCatalog({ zipPath, dryRun });
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  extractShopDataLiteral,
  importIntoSqlite,
  importShoptayCatalog,
  normalizeShoptayGame,
  normalizeShoptayProduct,
  normalizeSlug,
  parseCliArgs,
  parseShoptaySeedCatalog,
  parseOneTimePrice,
  selectImportedImagePath,
};
