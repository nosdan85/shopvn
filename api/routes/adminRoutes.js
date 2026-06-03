const express = require('express');
const router = express.Router();
const {
    getStats,
    getAllOrders,
    updateOrderStatus,
    markOrderPaidManually,
    recheckOrderIpn
} = require('../controllers/adminController');
const jwt = require('jsonwebtoken');
const { adminLoginLimiter } = require('../middleware/rateLimit');
const { requireOwnerOrAdmin } = require('../middleware/ownerAuth');

const getAdminJwtSecret = () => process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET || '';

router.post('/login', adminLoginLimiter, (req, res) => {
    try {
        const { password } = req.body;
        const adminJwtSecret = getAdminJwtSecret();
        if (!adminJwtSecret) return res.status(500).json({ message: 'JWT admin secret missing' });
        if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ message: 'ADMIN_PASSWORD missing' });

        // ADD VALIDATION:
        if (!password) {
            return res.status(400).json({ error: 'Mật khẩu là bắt buộc' });
        }

        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ error: 'Mật khẩu không hợp lệ' });
        }

        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(400).json({ message: 'Wrong Password' });
        }

        const token = jwt.sign({ role: 'admin', type: 'admin' }, adminJwtSecret, { expiresIn: '1d' });
        return res.json({ token });
    } catch (err) {
        console.error('[ADMIN_LOGIN] Error:', err);
        res.status(500).json({
            message: 'Login failed',
            chiTiet: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

router.use(requireOwnerOrAdmin);

router.get('/stats', async (req, res) => {
    try {
        await getStats(req, res);
    } catch (err) {
        console.error('[ADMIN_STATS] Error:', err);
        res.status(500).json({
            message: 'Failed to fetch stats',
            chiTiet: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

router.get('/orders', async (req, res) => {
    try {
        await getAllOrders(req, res);
    } catch (err) {
        console.error('[ADMIN_GET_ORDERS] Error:', err);
        res.status(500).json({
            message: 'Failed to fetch orders',
            chiTiet: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

router.put('/order/:id', async (req, res) => {
    try {
        await updateOrderStatus(req, res);
    } catch (err) {
        console.error('[ADMIN_UPDATE_ORDER] Error:', err);
        res.status(500).json({
            message: 'Failed to update order',
            chiTiet: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

router.post('/order/:id/mark-paid', async (req, res) => {
    try {
        await markOrderPaidManually(req, res);
    } catch (err) {
        console.error('[ADMIN_MARK_PAID] Error:', err);
        res.status(500).json({
            message: 'Failed to mark order paid',
            chiTiet: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

router.post('/order/:id/recheck-ipn', async (req, res) => {
    try {
        await recheckOrderIpn(req, res);
    } catch (err) {
        console.error('[ADMIN_RECHECK_IPN] Error:', err);
        res.status(500).json({
            message: 'Failed to recheck IPN',
            chiTiet: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

module.exports = router;
