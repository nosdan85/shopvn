const toPublicProof = (proof, { imageUrlForIndex } = {}) => ({
    id: String(proof?._id || ''),
    totalAmount: Number(proof?.totalAmount || 0),
    discordUsername: String(proof?.discordUsername || ''),
    items: (Array.isArray(proof?.items) ? proof.items : []).map((item) => ({
        name: String(item?.name || ''),
        packQuantity: Math.max(1, Number(item?.packQuantity) || 1),
        quantity: Math.max(1, Number(item?.quantity) || 1),
        deliveredLabel: String(item?.deliveredLabel || ''),
        lineTotal: Math.max(0, Number(item?.lineTotal || 0))
    })),
    imageUrls: (Array.isArray(proof?.imageUrls) ? proof.imageUrls : []).map((_, index) => (
        typeof imageUrlForIndex === 'function' ? imageUrlForIndex(index) : ''
    )).filter(Boolean)
});

const mergeProofItemsForUpdate = (requestedItems, existingItems) => (
    (Array.isArray(requestedItems) ? requestedItems : [])
        .slice(0, 50)
        .map((item, index) => ({
            name: String(item?.name || '').trim().slice(0, 120),
            packQuantity: Math.max(1, Number(item?.packQuantity) || 1),
            quantity: Math.max(1, Number(item?.quantity) || 1),
            deliveredLabel: String(item?.deliveredLabel || '').trim().slice(0, 40),
            lineTotal: item?.lineTotal === undefined
                ? Math.max(0, Number(existingItems?.[index]?.lineTotal || 0))
                : Math.max(0, Number(item.lineTotal || 0))
        }))
        .filter((item) => item.name)
);

module.exports = { mergeProofItemsForUpdate, toPublicProof };
