const test = require('node:test')
const assert = require('node:assert/strict')
const {
  extractShopDataLiteral,
  parseShoptaySeedCatalog,
  normalizeShoptayGame,
  normalizeShoptayProduct,
  selectImportedImagePath,
} = require('../server/import-shoptay-catalog.cjs')

test('extractShopDataLiteral and parseShoptaySeedCatalog parse source seed text', () => {
  const source = `
const SHOP_DATA = {
  Chest: [
    { name: 'Aura Crate', oneTimePrice: '$0.02/1', bulkPriceString: '$0.015/1', image: 'aura-chest.png' }
  ],
  Reroll: [
    { name: 'Trait Reroll', oneTimePrice: '$1/500k', bulkPriceString: '$1/600k', image: 'trait-reroll.png' }
  ]
};

const PRICE_PATTERN = /x/;
`
  const literal = extractShopDataLiteral(source)
  const parsed = parseShoptaySeedCatalog(source)
  assert.match(literal, /Chest/)
  assert.equal(parsed.groups.length, 2)
  assert.equal(parsed.products.length, 2)
  assert.equal(parsed.products[0].category, 'Chest')
})

test('normalizeShoptayGame maps source game into current category shape', () => {
  const game = normalizeShoptayGame({ name: 'Sailor Piece', slug: 'sailor-piece', image: '/products/logo.png', active: true })
  assert.equal(game.slug, 'sailor-piece')
  assert.equal(game.status, 'active')
})

test('normalizeShoptayProduct maps source product into current item shape', () => {
  const product = normalizeShoptayProduct({
    source: { name: 'Aura Crate', price: 10000, image: '/products/aura.png', desc: 'crate', category: 'Chest' },
    gameCategoryId: 3,
  })
  assert.equal(product.name, 'Aura Crate')
  assert.equal(product.game_category_id, 3)
  assert.equal(product.price, 10000)
})

test('selectImportedImagePath prefers exact image match and falls back safely', () => {
  const exact = selectImportedImagePath('aura-chest.png', ['aura-chest.png', 'aura.png'])
  const fallback = selectImportedImagePath('missing-file.png', ['aura.png'])
  assert.equal(exact, '/imports/shoptay/products/aura-chest.png')
  assert.equal(fallback, '/imports/shoptay/products/aura.png')
})
