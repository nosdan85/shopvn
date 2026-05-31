const test = require('node:test')
const assert = require('node:assert/strict')
const { buildCompatAdminDashboard } = require('../server/compat/admin.cjs')

test('buildCompatAdminDashboard returns card totals and recent rows', () => {
  const dashboard = buildCompatAdminDashboard({
    users: 12,
    orders: 7,
    revenue: 900000,
    pendingDeposits: 2,
    recentOrders: [{ id: 1, order_code: 'SP100', username: 'demo', total_amount: 50000, status: 'pending', created_at: '2026-05-31 10:00:00' }],
    topProducts: [{ id: 3, name: 'Fruit Pack', revenue: 150000, quantitySold: 4 }],
    proofStats: {
      totalProofs: 8,
      pendingProofs: 1,
      recentProofs: [{ id: 9, username: 'demo', itemName: 'Fruit Pack', status: 'approved', createdAt: '2026-05-31 11:00:00' }],
    },
    moduleConfig: {
      luckyWheelEnabled: true,
      referralEnabled: false,
      proofsEnabled: true,
      luckyWheelTitle: 'Lucky Wheel Event',
    },
  })

  assert.equal(dashboard.cards[0].value, 12)
  assert.equal(dashboard.recentOrders[0].orderCode, 'SP100')
  assert.equal(dashboard.topProducts[0].quantitySold, 4)
  assert.equal(dashboard.proofStats.totalProofs, 8)
  assert.equal(dashboard.modules.luckyWheelEnabled, true)
  assert.equal(dashboard.modules.luckyWheelTitle, 'Lucky Wheel Event')
})
