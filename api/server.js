require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { client } = require('./bot');
const { getDiscordGatewayStatus } = require('./config/discordGateway');
const { apiLimiter } = require('./middleware/rateLimit');
const { log, createRequestLogger, createErrorLogger, logEnvCheck } = require('./utils/loggingService');

const app = express();

// Log environment check on startup
logEnvCheck();

// Apply request logger
app.use(createRequestLogger());
const normalizeEnvValue = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    if (
        (text.startsWith('"') && text.endsWith('"'))
        || (text.startsWith("'") && text.endsWith("'"))
    ) {
        return text.slice(1, -1).trim();
    }
    return text;
};
const trustProxyRaw = String(process.env.TRUST_PROXY || '').trim().toLowerCase();
if (/^\d+$/.test(trustProxyRaw)) {
    app.set('trust proxy', Number(trustProxyRaw));
} else if (trustProxyRaw === 'true') {
    // express-rate-limit warns on boolean true because it's overly permissive for IP limiting.
    app.set('trust proxy', 1);
} else if (trustProxyRaw === 'false') {
    app.set('trust proxy', false);
} else {
    app.set('trust proxy', 1);
}
const { isVercelRuntime, gatewayEnabled: shouldEnableBotGateway } = getDiscordGatewayStatus();
const forceHttpListen = String(process.env.FORCE_HTTP_LISTEN || '').trim().toLowerCase() === 'true';

const configuredOrigins = (process.env.CLIENT_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const defaultDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = new Set([...configuredOrigins, ...defaultDevOrigins]);
const normalizeHostname = (hostname) => String(hostname || '').trim().toLowerCase().replace(/^www\./, '');
const isAllowedOrigin = (origin) => {
    if (!origin || allowedOrigins.size === 0 || allowedOrigins.has(origin)) {
        return true;
    }

    try {
        const requestUrl = new URL(origin);
        const requestProtocol = requestUrl.protocol;
        const requestPort = requestUrl.port || '';
        const requestHost = normalizeHostname(requestUrl.hostname);

        for (const allowedOrigin of allowedOrigins) {
            try {
                const allowedUrl = new URL(allowedOrigin);
                const allowedProtocol = allowedUrl.protocol;
                const allowedPort = allowedUrl.port || '';
                const allowedHost = normalizeHostname(allowedUrl.hostname);

                if (
                    requestProtocol === allowedProtocol &&
                    requestPort === allowedPort &&
                    requestHost === allowedHost
                ) {
                    return true;
                }
            } catch {
                // Ignore malformed env values and keep checking the rest.
            }
        }
    } catch {
        return false;
    }

    return false;
};

app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS_NOT_ALLOWED'));
    },
    credentials: true
}));

app.use(express.json({
    verify: (req, res, buffer) => {
        req.rawBody = buffer.toString();
    }
}));
app.use(express.urlencoded({
    extended: false,
    verify: (req, res, buffer) => {
        req.rawBody = buffer.toString();
    }
}));

// === ROUTES MOI - TIENG VIET ===
// Tai khoan web (dang ky/dang nhap/lien ket Discord)
app.use('/api/tai-khoan', require('./routes/taiKhoanRoutes'));
// Vi & nap tien (SePay MB Bank, the cao)
app.use('/api', require('./routes/viRoutes'));
// Don hang (dat hang, lich su, tao ticket)
app.use('/api/don-hang', require('./routes/donHangRoutes'));

// === ROUTES CU (giu lai de backward compat, se refactor sau) ===
app.use('/ipn.php', require('./routes/paypalIpnRoutes'));
app.use('/api/shop/paypal/ipn', require('./routes/paypalIpnRoutes'));
app.use('/api', apiLimiter);
app.use('/api/shop', require('./routes/shopRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/admin/analytics', require('./routes/analyticsRoutes'));

// Product image static serve
const path = require('path');
const fs = require('fs');
const PRODUCT_IMAGE_DIR = path.resolve(process.env.PRODUCT_IMAGE_DIR || './uploads/product-images');
try { fs.mkdirSync(PRODUCT_IMAGE_DIR, { recursive: true }); } catch (_) {}
// Serve uploaded images at /products/ (same path as client/public/products/)
app.use('/products', express.static(PRODUCT_IMAGE_DIR));
// Also keep /api/product-images for backward compatibility
app.use('/api/product-images', express.static(PRODUCT_IMAGE_DIR));

// Banner image static serve
const BANNER_DIR = path.resolve(process.env.BANNER_IMAGE_DIR || './uploads/banners');
try { fs.mkdirSync(BANNER_DIR, { recursive: true }); } catch (_) {}
app.use('/api/banners', express.static(BANNER_DIR));

app.get('/', (req, res) => res.status(200).json({ trangThai: 'ok', dichVu: 'nosmarket-shop-vi' }));

// Prometheus metrics endpoint
const { getMetrics, getContentType } = require('./metrics');
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', getContentType());
    res.end(await getMetrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// Health check endpoint
const redisCache = require('./cache/redis');

// Ticket queue - optional (comment out if not available)
let ticketQueue;
try {
    ticketQueue = require('./queue/ticketQueue');
    ticketQueue.getQueue();
} catch (err) {
    console.warn('[HEALTH] ticketQueue not available:', err.message);
    ticketQueue = {
        isAvailable: () => false,
        getQueue: () => null
    };
}

redisCache.getRedis();

app.get('/health', (req, res) => {
  res.json({
    trangThai: 'ok',
    thoiGian: new Date().toISOString(),
    redis: redisCache.isAvailable() ? 'da_ket_noi' : 'khong_kha_dung',
    queue: ticketQueue.isAvailable() ? 'san_sang' : 'khong_kha_dung',
  });
});

app.use((err, req, res, next) => {
    if (err?.message === 'CORS_NOT_ALLOWED') {
        return res.status(403).json({ loi: 'Origin khong duoc cho phep boi CORS policy' });
    }
    log.error('Loi server chua xu ly', {
        requestId: req.requestId,
        error: err?.message || err,
        stack: err?.stack,
        path: req.path,
        method: req.method
    });
    if (res.headersSent) {
        return next(err);
    }
    const status = Number(err?.status);
    const safeStatus = Number.isFinite(status) && status >= 400 && status <= 599 ? status : 500;
    return res.status(safeStatus).json({
        loi: safeStatus >= 500 ? 'Loi he thong. Vui long thu lai sau.' : String(err?.message || 'Yeu cau that bai')
    });
});

// Apply error logger
app.use(createErrorLogger());

const normalizedBotToken = normalizeEnvValue(process.env.DISCORD_BOT_TOKEN);
if (normalizedBotToken && shouldEnableBotGateway) {
    log.info('[DISCORD] Bot dang cho login...');
    client.login(normalizedBotToken).then(() => {
        log.info('[DISCORD] Bot login thanh cong');
    }).catch((err) => {
        log.error('[DISCORD] Bot login that bai', { error: err.message });
    });
    client.on('error', (err) => log.error('[DISCORD] Bot error', { error: err.message }));
    client.on('ready', () => log.info('[DISCORD] Bot da san sang', { tag: client.user?.tag }));
} else if (normalizedBotToken && !shouldEnableBotGateway) {
    log.warn('[DISCORD] Gateway login bi tat (DISCORD_ENABLE_GATEWAY=false hoac serverless runtime)');
} else {
    log.warn('[DISCORD] DISCORD_BOT_TOKEN thieu - bot bi tat');
}

const PORT = process.env.PORT || 5000;
const shouldStartHttpServer = !isVercelRuntime || forceHttpListen;
const connectMongo = async () => {
    if (!process.env.MONGO_URI) {
        log.error('[MONGODB] MONGO_URI chua duoc cau hinh');
        return false;
    }
    log.info('[MONGODB] Dang ket noi...', { uri: process.env.MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//[AN_TOAN]:[AN_TOAN]@') });
    try {
        await mongoose.connect(process.env.MONGO_URI);
        log.info('[MONGODB] Ket noi thanh cong');
        return true;
    } catch (err) {
        log.error('[MONGODB] Ket noi that bai', { error: err?.message || err });
        return false;
    }
};

const bootstrap = async () => {
    log.info('[KHOI_DONG] Bat dau khoi tao server...');
    const mongoConnected = await connectMongo();

    // Khởi động SePay Bot sau khi MongoDB connect
    if (mongoConnected && process.env.SEPAY_BOT_ENABLED === 'true') {
        try {
            const sepayBot = require('./bot/sepayPollingBot');
            sepayBot.start();
        } catch (err) {
            log.error('[SEPAY_BOT] Khong the khoi dong bot', { error: err.message });
        }
    }

    if (shouldStartHttpServer) {
        const requireDbBeforeListen = String(process.env.REQUIRE_DB_BEFORE_LISTEN || 'true').trim().toLowerCase() !== 'false';
        if (requireDbBeforeListen && !mongoConnected) {
            log.error('[KHOI_DONG] Database chua ket noi, dang thoat...');
            process.exit(1);
            return;
        }
        app.listen(PORT, () => {
            log.info('[SERVER] Dang lang nghe', { port: PORT, moiTruong: process.env.NODE_ENV || 'development' });
        });
    } else {
        log.info('[KHOI_DONG] Chay o che do serverless (khong co HTTP server)');
    }
};

void bootstrap();

module.exports = app;

