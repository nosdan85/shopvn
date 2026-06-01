const express = require('express');
const Order = require('../models/Order');
const Proof = require('../models/Proof');
const { requireOwnerOrAdmin } = require('../middleware/ownerAuth');

const router = express.Router();

const getPeriodStarts = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    const day = todayStart.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    weekStart.setDate(todayStart.getDate() + diffToMonday);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return { todayStart, weekStart, monthStart };
};

const paidMatch = {
    $or: [{ status: 'Completed' }, { paymentStatus: 'paid' }]
};

const sumSales = async (startDate) => {
    const [result] = await Order.aggregate([
        { $match: { ...paidMatch, createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: null,
                revenue: { $sum: '$totalAmount' },
                orders: { $sum: 1 }
            }
        }
    ]);

    return {
        revenue: Number(result?.revenue || 0),
        orders: Number(result?.orders || 0)
    };
};

router.use(requireOwnerOrAdmin);

router.get('/sales', async (_req, res) => {
    try {
        const { todayStart, weekStart, monthStart } = getPeriodStarts();
        const [today, week, month, weekProofCount, recentProofs] = await Promise.all([
            sumSales(todayStart),
            sumSales(weekStart),
            sumSales(monthStart),
            Proof.countDocuments({ createdAt: { $gte: weekStart } }),
            Proof.find({})
                .sort({ createdAt: -1 })
                .limit(6)
                .select('orderId robloxUsername totalAmount items imageUrls createdAt')
                .lean()
        ]);

        return res.json({
            today,
            week: { ...week, proofs: weekProofCount },
            month,
            recentProofs
        });
    } catch {
        return res.status(500).json({ message: 'Failed to load sales analytics' });
    }
});

router.get('/recent-orders', async (req, res) => {
    try {
        const limit = Math.min(20, Math.max(1, Number(req.query?.limit) || 20));
        const orders = await Order.find({})
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('orderId discordUsername robloxUsername totalAmount status paymentStatus createdAt items')
            .lean();

        return res.json({ orders });
    } catch {
        return res.status(500).json({ message: 'Failed to load recent orders' });
    }
});

router.get('/top-products', async (req, res) => {
    try {
        const limit = Math.min(10, Math.max(1, Number(req.query?.limit) || 10));
        const { monthStart } = getPeriodStarts();
        const products = await Order.aggregate([
            { $match: { ...paidMatch, createdAt: { $gte: monthStart } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.name',
                    revenue: {
                        $sum: {
                            $multiply: [
                                { $ifNull: ['$items.quantity', 0] },
                                { $ifNull: ['$items.price', 0] }
                            ]
                        }
                    },
                    quantity: { $sum: { $ifNull: ['$items.quantity', 0] } },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { revenue: -1, quantity: -1 } },
            { $limit: limit },
            {
                $project: {
                    _id: 0,
                    name: '$_id',
                    revenue: 1,
                    quantity: 1,
                    orderCount: 1
                }
            }
        ]);

        return res.json({ products });
    } catch {
        return res.status(500).json({ message: 'Failed to load top products' });
    }
});


router.get("/proof-stats", async (req, res) => {
    try {
        const { weekStart } = getPeriodStarts();
        const [totalProofs, weekProofs, recentProofs] = await Promise.all([
            Proof.countDocuments(),
            Proof.countDocuments({ createdAt: { $gte: weekStart } }),
            Proof.find({})
                .sort({ createdAt: -1 })
                .limit(6)
                .select("orderId robloxUsername totalAmount imageUrls createdAt")
                .lean()
        ]);

        return res.json({
            totalProofs,
            weekProofs,
            recentProofs: recentProofs.map(p => ({
                id: p._id,
                orderId: p.orderId,
                robloxUsername: p.robloxUsername,
                totalAmount: p.totalAmount,
                imageUrls: p.imageUrls || []
            }))
        });
    } catch (err) {
        return res.status(500).json({ message: "Failed to load proof stats" });
    }
});


module.exports = router;
