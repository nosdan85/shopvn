const rateLimit = require('express-rate-limit');

const buildLimiterKey = (req) => {
    const discordId = String(req.user?.discordId || '').trim();
    if (discordId) return `discord:${discordId}`;

    const authHeader = String(req.headers?.authorization || '').trim();
    if (authHeader) return `auth:${authHeader.slice(0, 120)}`;

    return req.ip;
};

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP. Please try again later.' }
});

const checkoutLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many checkout attempts. Please try again later.' }
});

const discordAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many Discord login attempts. Please try again later.' }
});

const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many admin login attempts. Please try again later.' }
});

const ticketCreateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: buildLimiterKey,
    message: { error: 'Too many ticket creation attempts. Please try again later.' }
});

const cartSyncLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: buildLimiterKey,
    message: { error: 'Too many cart sync requests. Please slow down.' }
});

module.exports = {
    apiLimiter,
    checkoutLimiter,
    discordAuthLimiter,
    adminLoginLimiter,
    ticketCreateLimiter,
    cartSyncLimiter
};
