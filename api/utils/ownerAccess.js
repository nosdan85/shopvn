const DEFAULT_OWNER_DISCORD_IDS = ['1146730730060271736', '1005326332001009784'];

const splitIds = (value) => String(value || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

const getOwnerDiscordIds = (env = process.env) => {
    const ids = [
        ...splitIds(env.DISCORD_OWNER_ID),
        ...splitIds(env.DISCORD_OWNER_IDS),
        ...DEFAULT_OWNER_DISCORD_IDS
    ];
    return new Set(ids);
};

const isOwnerDiscordId = (discordId, env = process.env) => {
    const cleanDiscordId = String(discordId || '').trim();
    if (!cleanDiscordId) return false;
    return getOwnerDiscordIds(env).has(cleanDiscordId);
};

const isOwnerOrAdminPayload = (payload, env = process.env) => {
    if (!payload) return false;
    if (payload.role === 'admin') return true;
    return isOwnerDiscordId(payload.discordId, env);
};

module.exports = {
    DEFAULT_OWNER_DISCORD_IDS,
    getOwnerDiscordIds,
    isOwnerDiscordId,
    isOwnerOrAdminPayload
};
