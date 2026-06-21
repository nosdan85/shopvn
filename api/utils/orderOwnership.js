const buildOwnedOrdersQuery = ({ userId, discordId } = {}) => {
    const cleanDiscordId = String(discordId || '').trim();
    if (!cleanDiscordId) return { userId };
    return {
        $or: [
            { userId },
            { discordId: cleanDiscordId }
        ]
    };
};

const resolveCheckoutAccountIdentity = ({ tokenDiscordId, taiKhoan } = {}) => ({
    userId: taiKhoan?._id || null,
    tenDangNhap: String(taiKhoan?.tenDangNhap || '').trim(),
    discordId: String(tokenDiscordId || taiKhoan?.discordId || '').trim(),
    discordTenHienThi: String(taiKhoan?.discordTenHienThi || '').trim()
});

module.exports = { buildOwnedOrdersQuery, resolveCheckoutAccountIdentity };
