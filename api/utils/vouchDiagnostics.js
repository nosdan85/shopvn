const DISCORD_ERROR_REASONS = {
    '10003': {
        code: 'CHANNEL_NOT_FOUND',
        reason: 'Bot khong tim thay kenh vouch.'
    },
    '50001': {
        code: 'MISSING_ACCESS',
        reason: 'Bot khong co quyen truy cap kenh vouch.'
    },
    '50013': {
        code: 'MISSING_PERMISSIONS',
        reason: 'Bot khong co du quyen tren kenh vouch.'
    }
};

const createVouchError = ({ code, reason, stage, cause = null }) => {
    const error = new Error(reason);
    error.name = 'VouchError';
    error.vouchCode = code;
    error.vouchStage = stage;
    error.cause = cause || undefined;
    if (cause?.code !== undefined) error.code = cause.code;
    return error;
};

const describeVouchFailure = (error, { stage = 'unknown', vouchChannelId = '' } = {}) => {
    const sourceError = error?.cause || error || {};
    const discordCode = String(sourceError?.code ?? error?.code ?? '').trim();
    const knownDiscordError = DISCORD_ERROR_REASONS[discordCode];
    const code = String(error?.vouchCode || knownDiscordError?.code || 'VOUCH_SEND_FAILED');
    const reason = String(
        error?.vouchCode
            ? error.message
            : knownDiscordError?.reason || error?.message || 'Khong the gui vouch do loi khong xac dinh.'
    );

    return {
        code,
        stage: String(error?.vouchStage || stage || 'unknown'),
        reason,
        discordCode,
        vouchChannelId: String(vouchChannelId || '')
    };
};

const formatVouchFailureReply = (failure) => {
    const lines = [
        `Vouch that bai [${failure?.code || 'UNKNOWN'}]`,
        `Ly do: ${failure?.reason || 'Khong ro ly do.'}`,
        `Buoc loi: ${failure?.stage || 'unknown'}`,
        `Kenh vouch: ${failure?.vouchChannelId || 'chua cau hinh'}`
    ];
    if (failure?.discordCode) lines.push(`Discord code: ${failure.discordCode}`);
    return lines.join('\n').slice(0, 1900);
};

const getVouchChannelPermissionFailure = ({ canView, canSend } = {}) => {
    if (!canView) {
        return {
            code: 'MISSING_VIEW_CHANNEL',
            reason: 'Bot khong co quyen View Channel tren kenh vouch.'
        };
    }
    if (!canSend) {
        return {
            code: 'MISSING_SEND_MESSAGES',
            reason: 'Bot khong co quyen Send Messages tren kenh vouch.'
        };
    }
    return null;
};

module.exports = {
    createVouchError,
    describeVouchFailure,
    formatVouchFailureReply,
    getVouchChannelPermissionFailure
};
