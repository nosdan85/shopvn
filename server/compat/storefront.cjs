function buildCompatStorefrontSummary({ banners, bestSellerIds, categories, items, recentOrders, proofs = [], analytics = {}, modules = {} }) {
  return {
    banners,
    bestSellerIds,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon || '',
    })),
    products: items.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: Number(item.current_price || item.price || 0),
      image: item.image || '',
      shortDescription: item.short_description || '',
      description: item.description || '',
      categorySlug: item.game_category_slug || '',
      categoryName: item.game_category_name || '',
    })),
    recentPurchases: recentOrders.map((order) => ({
      orderCode: order.order_code,
      username: order.username,
      itemNames: order.item_names || '',
      createdAt: order.created_at,
    })),
    proofs: proofs.map((proof) => ({
      id: proof.id,
      username: proof.username || 'Anonymous',
      itemName: proof.item_name || '',
      content: proof.content || '',
      rating: Number(proof.rating || 5),
      imageUrls: proof.image ? [proof.image] : [],
      totalAmount: Number(proof.total_amount || 0),
      createdAt: proof.created_at || '',
    })),
    analytics: {
      totalOrders: Number(analytics.totalOrders || 0),
      totalRevenue: Number(analytics.totalRevenue || 0),
      linkedDiscordUsers: Number(analytics.linkedDiscordUsers || 0),
    },
    modules: {
      luckyWheel: {
        enabled: Boolean(modules.luckyWheelEnabled),
        title: modules.luckyWheelTitle || 'Lucky Wheel Event',
        message: modules.luckyWheelMessage || 'Support campaign is running for linked Discord users.',
        tickets: Number(modules.luckyWheelTickets || 0),
      },
      referral: {
        enabled: Boolean(modules.referralEnabled),
        headline: modules.referralHeadline || 'Referral program',
        details: modules.referralDetails || 'Share your invite code and track Discord-linked buyers.',
      },
      proofs: {
        enabled: Boolean(modules.proofsEnabled),
        total: proofs.length,
        featuredCount: Math.min(proofs.length, 6),
      },
    },
  }
}

module.exports = { buildCompatStorefrontSummary }
