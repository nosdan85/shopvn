const { formatPurchasedUnitsLabel } = require('./itemQuantityDisplay');
const DEFAULT_VOUCH_CHANNEL_ID = '1403791430396285089';

const resolveVouchChannelId = (configuredId) => (
    String(configuredId || '').trim() || DEFAULT_VOUCH_CHANNEL_ID
);

const buildDiscordVouchContent = (order) => {
    const discordId = String(order?.discordId || '').trim();
    const displayName = String(
        order?.discordTenHienThi || order?.discordUsername || order?.tenDangNhap || 'Khach hang'
    ).trim();
    const customer = discordId ? `${displayName} (<@${discordId}>)` : displayName;
    const itemLines = (Array.isArray(order?.items) ? order.items : []).map((item) => {
        const name = String(item?.name || 'San pham').trim().toUpperCase();
        return `**${name} (${formatPurchasedUnitsLabel(item).toUpperCase()})**`;
    });

    const itemsText = itemLines.length > 0 ? itemLines.join('\n') : '**1X SAN PHAM KHONG BIET**';
    return `${customer}\n${itemsText}\nVui long danh gia cho chung toi`.slice(0, 1900);
};

module.exports = { buildDiscordVouchContent, resolveVouchChannelId };
