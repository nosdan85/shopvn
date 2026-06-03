const normalizeDiscordRedirectUri = (value) => String(value || '').trim().replace(/\/+$/, '');

const resolveDiscordRedirectUri = ({
    requestRedirectUri = '',
    configuredRedirectUri = ''
} = {}) => {
    const requested = normalizeDiscordRedirectUri(requestRedirectUri);
    if (requested) return requested;
    return normalizeDiscordRedirectUri(configuredRedirectUri);
};

module.exports = {
    normalizeDiscordRedirectUri,
    resolveDiscordRedirectUri
};
