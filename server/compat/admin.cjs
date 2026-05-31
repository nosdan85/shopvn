function buildCompatAdminDashboard({
  users,
  orders,
  revenue,
  pendingDeposits,
  recentOrders,
  topProducts = [],
  proofStats = {},
  moduleConfig = {},
  referralStats = {},
}) {
  return {
    cards: [
      { key: 'users', label: 'Users', value: users },
      { key: 'orders', label: 'Orders', value: orders },
      { key: 'revenue', label: 'Revenue', value: revenue },
      { key: 'pendingDeposits', label: 'Pending deposits', value: pendingDeposits },
    ],
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderCode: order.order_code,
      username: order.username,
      totalAmount: order.total_amount,
      status: order.status,
      createdAt: order.created_at,
    })),
    topProducts: topProducts.map((product) => ({
      id: product.id,
      name: product.name,
      revenue: Number(product.revenue || 0),
      quantitySold: Number(product.quantity_sold || product.quantitySold || 0),
    })),
    proofStats: {
      totalProofs: Number(proofStats.totalProofs || 0),
      pendingProofs: Number(proofStats.pendingProofs || 0),
      recentProofs: (proofStats.recentProofs || []).map((proof) => ({
        id: proof.id,
        username: proof.username || 'Anonymous',
        itemName: proof.item_name || proof.itemName || '',
        status: proof.status || 'approved',
        createdAt: proof.created_at || proof.createdAt || '',
      })),
    },
    modules: {
      luckyWheelEnabled: Boolean(moduleConfig.luckyWheelEnabled),
      referralEnabled: Boolean(moduleConfig.referralEnabled),
      proofsEnabled: Boolean(moduleConfig.proofsEnabled),
      luckyWheelTitle: moduleConfig.luckyWheelTitle || 'Lucky Wheel Event',
      luckyWheelMessage: moduleConfig.luckyWheelMessage || '',
    },
    referralStats: {
      totalRewards: Number(referralStats.totalRewards || 0),
      totalPaid: Number(referralStats.totalPaid || 0),
      pendingReversals: Number(referralStats.pendingReversals || 0),
    },
  }
}

module.exports = { buildCompatAdminDashboard }
