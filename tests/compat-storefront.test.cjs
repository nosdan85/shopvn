const test = require('node:test')
const assert = require('node:assert/strict')
const { buildCompatStorefrontSummary } = require('../server/compat/storefront.cjs')

test('buildCompatStorefrontSummary maps categories, products, and ticker rows', () => {
  const summary = buildCompatStorefrontSummary({
    banners: ['/uploads/banner.png'],
    bestSellerIds: [3],
    categories: [{ id: 9, name: 'Blox Fruits', slug: 'blox-fruits', icon: '/uploads/g1.png' }],
    items: [{ id: 3, name: 'Fruit Pack', slug: 'fruit-pack', current_price: 150000, image: '/uploads/p1.png', short_description: 'Top seller' }],
    recentOrders: [{ order_code: 'SP001', username: 'tester', item_names: 'Fruit Pack', created_at: '2026-05-31 10:00:00' }],
    proofs: [{ id: 7, username: 'proof-user', item_name: 'Fruit Pack', content: 'Fast delivery', created_at: '2026-05-31 10:10:00' }],
    analytics: { totalOrders: 28, totalRevenue: 4200000, linkedDiscordUsers: 12 },
    modules: {
      luckyWheelEnabled: true,
      referralEnabled: true,
      proofsEnabled: true,
      luckyWheelTitle: 'Lucky Wheel Event',
      luckyWheelMessage: 'Spin for coupons',
      luckyWheelTickets: 3,
      referralHeadline: 'Invite friends',
      referralDetails: 'Inviter earns perks after the first completed order.',
    },
  })

  assert.equal(summary.categories[0].slug, 'blox-fruits')
  assert.equal(summary.products[0].price, 150000)
  assert.equal(summary.recentPurchases[0].orderCode, 'SP001')
  assert.equal(summary.modules.luckyWheel.enabled, true)
  assert.equal(summary.modules.luckyWheel.tickets, 3)
  assert.equal(summary.modules.referral.headline, 'Invite friends')
  assert.equal(summary.proofs[0].username, 'proof-user')
  assert.equal(summary.analytics.totalRevenue, 4200000)
})
