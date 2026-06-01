const LEGACY_COMBO_KEYS = new Set(['combox2luck+drop', 'combox2luckdrop']);
const COMBO_LUCK_KEY = 'x2luck';
const COMBO_DROP_KEY = 'x2drop';

const normalizeText = (value) => String(value || '').trim().toLowerCase();
const normalizeKeyText = (value) => normalizeText(value).replace(/\s+/g, '');

const getForcedCatalogPrice = (product) => {
    const category = normalizeText(product?.category);
    const name = normalizeText(product?.name);
    const keyName = normalizeKeyText(product?.name);

    if (category === 'sets') {
        return name === 'madoka' ? 8 : 2;
    }
    if (category === 'combo' && (keyName === COMBO_LUCK_KEY || keyName === COMBO_DROP_KEY)) {
        return 3;
    }
    return null;
};

const normalizeBasePrice = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return n;
};

const getEffectiveProductPrice = (product) => {
    const forced = getForcedCatalogPrice(product);
    if (Number.isFinite(forced) && forced > 0) return forced;
    return normalizeBasePrice(product?.price);
};

const applyPriceOverridesForClient = (product) => {
    const forced = getForcedCatalogPrice(product);
    const finalPrice = Number.isFinite(forced) && forced > 0 ? forced : null;
    if (!Number.isFinite(finalPrice) || finalPrice <= 0) return product;

    return {
        ...product,
        price: finalPrice,
        originalPriceString: `$${finalPrice}/1`,
        bulkPrice: null,
        bulkPriceString: ''
    };
};

const isLegacyComboProduct = (product) => {
    const category = normalizeText(product?.category);
    const keyName = normalizeKeyText(product?.name);
    return category === 'combo' && LEGACY_COMBO_KEYS.has(keyName);
};

module.exports = {
    applyPriceOverridesForClient,
    getEffectiveProductPrice,
    isLegacyComboProduct,
    normalizeBasePrice,
    normalizeKeyText,
    normalizeText
};
