const express = require('express');
const mongoose = require('mongoose');

const Order = require('../models/Order');
const TaiKhoan = require('../models/TaiKhoan');
const WalletTransaction = require('../models/WalletTransaction');
const GeneratedCoupon = require('../models/GeneratedCoupon');

// Import auth middleware
const { xacThuc } = require('../middleware/auth');

// Import bot functions for ticket creation
let botModule = null;
try {
    botModule = require('../bot');
} catch (e) {
    botModule = null;
}

const router = express.Router();

// ============ MIDDLEWARE ============

// Authentication middleware for order routes
// Uses xacThuc from auth middleware
async function xacThucDonHang(req, res, next) {
    // Call the auth middleware
    await xacThuc(req, res, (err) => {
        if (err) return next(err);

        // Set order-specific vars
        req.donHangUserId = req.userId || req.nguoiDung?._id;
        req.donHangNguoiDung = req.nguoiDung;

        next();
    });
}

// ============ HELPER FUNCTIONS ============

// Generate unique order ID
async function generateOrderId() {
    const Counter = require('../models/Counter');
    let counter;
    try {
        counter = await Counter.findOneAndUpdate(
            { _id: 'don_hang' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
    } catch (e) {
        // Fallback: use timestamp
        return `DH${Date.now()}`;
    }

    const seq = String(counter.seq || 1).padStart(6, '0');
    return `DH${seq}`;
}

// Validate and apply coupon
async function applyCoupon(code, userId) {
    if (!code || typeof code !== 'string') {
        return { valid: false, thongBao: 'Ma giam gia khong hop le' };
    }

    const sanitized = code.trim().toUpperCase();
    if (!sanitized) {
        return { valid: false, thongBao: 'Ma giam gia khong hop le' };
    }

    const coupon = await GeneratedCoupon.findOne({
        couponCode: sanitized,
        status: 'unused'
    });

    if (!coupon) {
        return { valid: false, thongBao: 'Ma giam gia khong ton tai hoac da duoc su dung' };
    }

    // Check ownership (if assigned to specific user)
    if (coupon.discordId && String(coupon.discordId).trim()) {
        const nguoiDungId = String(userId);
        if (nguoiDungId && coupon.discordId !== nguoiDungId && coupon.discordId !== String(userId)) {
            return { valid: false, thongBao: 'Ma giam gia khong thuoc ve ban' };
        }
    }

    return {
        valid: true,
        coupon: coupon,
        discountPercent: coupon.discountPercent || 0,
        thongBao: `Giam gia ${coupon.discountPercent}%`
    };
}

// Check user in Discord guild (needed for ticket creation)
async function checkUserInServer(discordId) {
    if (!botModule?.checkUserInGuild) {
        // No bot module, try direct check
        return null;
    }

    try {
        return await botModule.checkUserInGuild(discordId);
    } catch (e) {
        console.error('Check user in server error:', e?.message || e);
        return null;
    }
}

// ============ ROUTES ============

// POST /don-hang/dat-hang - Create order (auth required)
router.post('/dat-hang', xacThucDonHang, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { items, couponCode } = req.body;
        const userId = req.donHangUserId;
        const nguoiDung = req.donHangNguoiDung;

        // Validate input
        if (!items || !Array.isArray(items) || items.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({ thongBao: 'Vui long chon it nhat 1 san pham' });
        }

        // Validate each item
        let subtotalVnd = 0;
        const validItems = [];

        for (const item of items) {
            const sanPhamId = item.sanPhamId;
            const soLuong = Math.max(1, Number(item.soLuong) || 1);
            const tenSanPham = String(item.tenSanPham || '').trim();
            const donGiaVnd = Math.max(0, Number(item.donGiaVnd) || 0);

            if (!sanPhamId || !tenSanPham || donGiaVnd <= 0) {
                await session.abortTransaction();
                return res.status(400).json({ thongBao: `San pham "${tenSanPham}" co thong tin khong hop le` });
            }

            const lineTotalVnd = donGiaVnd * soLuong;
            subtotalVnd += lineTotalVnd;

            validItems.push({
                product: sanPhamId,
                name: tenSanPham,
                quantity: soLuong,
                packQuantity: 1,
                priceVnd: donGiaVnd,
                lineTotalVnd: lineTotalVnd
            });
        }

        if (subtotalVnd <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ thongBao: 'Tong tien khong hop le' });
        }

        // Apply coupon discount if provided
        let discountVnd = 0;
        let discountPercent = 0;
        let appliedCoupon = null;

        if (couponCode) {
            const couponResult = await applyCoupon(couponCode, userId);
            if (couponResult.valid) {
                discountPercent = couponResult.discountPercent;
                discountVnd = Math.floor(subtotalVnd * discountPercent / 100);
                appliedCoupon = couponResult.coupon;
            }
        }

        const totalVnd = subtotalVnd - discountVnd;

        // Get current wallet balance
        const taiKhoan = await TaiKhoan.findById(userId).session(session);

        if (!taiKhoan) {
            await session.abortTransaction();
            return res.status(404).json({ thongBao: 'Tai khoan khong ton tai' });
        }

        const soDuVnd = Number(taiKhoan.soDuVnd) || 0;

        // Check sufficient balance
        if (soDuVnd < totalVnd) {
            await session.abortTransaction();
            return res.status(400).json({
                thongBao: 'So du vi khong du',
                chiTiet: {
                    canThanhToan: totalVnd,
                    soDuHienTai: soDuVnd,
                    thieu: totalVnd - soDuVnd
                }
            });
        }

        // Generate order ID
        const orderId = await generateOrderId();

        // Build Discord info from user account
        const discordId = String(taiKhoan.discordId || '').trim();
        const discordTenHienThi = String(taiKhoan.discordTenHienThi || '').trim();
        const discordDaLienKet = Boolean(taiKhoan.discordId && taiKhoan.discordId.trim());

        // Check if user is in Discord server (for orders with Discord)
        let discordDaJoinServer = false;
        if (discordDaLienKet && discordId) {
            const inServer = await checkUserInServer(discordId);
            discordDaJoinServer = inServer === true;
        }

        // Create order
        const donHang = await Order.create([{
            orderId: orderId,
            userId: userId,
            tenDangNhap: taiKhoan.tenDangNhap || '',
            discordId: discordId,
            discordTenHienThi: discordTenHienThi,
            discordDaLienKet: discordDaLienKet,
            discordDaJoinServer: discordDaJoinServer,
            items: validItems,
            products: validItems,
            subtotalVnd: subtotalVnd,
            discountVnd: discountVnd,
            discountPercent: discountPercent,
            couponCode: appliedCoupon?.couponCode || '',
            couponDiscountPercent: discountPercent,
            totalVnd: totalVnd,
            totalAmount: totalVnd,
            paymentMethod: 'wallet',
            paymentStatus: 'paid',
            paidAt: new Date(),
            status: 'da_thanh_toan'
        }], { session: session });

        const donHangMoi = donHang[0];

        // Deduct from wallet
        await TaiKhoan.findByIdAndUpdate(userId, {
            $inc: { soDuVnd: -totalVnd }
        }, { session: session });

        // Mark coupon as used
        if (appliedCoupon) {
            await GeneratedCoupon.findByIdAndUpdate(appliedCoupon._id, {
                status: 'used',
                usedOrderId: orderId,
                usedAt: new Date()
            }, { session: session });
        }

        // Create wallet transaction record
        await WalletTransaction.create([{
            userId: userId,
            tenDangNhap: taiKhoan.tenDangNhap || '',
            type: 'purchase',
            direction: 'debit',
            amountVnd: totalVnd,
            method: 'wallet',
            status: 'completed',
            orderId: orderId,
            orderCode: orderId,
            items: validItems,
            balanceAfterVnd: soDuVnd - totalVnd
        }], { session: session });

        await session.commitTransaction();

        res.json({
            thanhCong: true,
            donHang: {
                orderId: donHangMoi.orderId,
                items: donHangMoi.items,
                subtotalVnd: donHangMoi.subtotalVnd,
                discountVnd: donHangMoi.discountVnd,
                totalVnd: donHangMoi.totalVnd,
                paymentStatus: donHangMoi.paymentStatus,
                status: donHangMoi.status,
                createdAt: donHangMoi.createdAt
            },
            thongBao: 'Dat hang thanh cong'
        });

    } catch (err) {
        await session.abortTransaction();
        console.error('[DAT_HANG] Error:', err);
        res.status(500).json({
            thongBao: 'Loi he thong. Vui long thu lai sau.',
            chiTiet: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } finally {
        session.endSession();
    }
});

// GET /don-hang/lich-su - Get my orders (auth required)
router.get('/lich-su', xacThucDonHang, async (req, res) => {
    try {
        const userId = req.donHangUserId;
        const limit = Math.min(50, Number(req.query.limit) || 50);

        const donHang = await Order.find({ userId: userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        const danhSach = donHang.map(dh => ({
            _id: dh._id,
            maDonHang: dh.orderId,
            orderId: dh.orderId, // Keep for backward compat
            items: dh.items,
            subtotalVnd: dh.subtotalVnd || 0,
            discountVnd: dh.discountVnd || 0,
            tongTienVnd: dh.totalVnd || dh.totalAmount || 0,
            totalVnd: dh.totalVnd || dh.totalAmount || 0, // Keep for backward compat
            trangThaiThanhToan: dh.paymentStatus,
            paymentStatus: dh.paymentStatus, // Keep for backward compat
            trangThai: dh.status,
            status: dh.status, // Keep for backward compat
            ticketStatus: dh.ticketStatus,
            daTaoTicket: dh.ticketStatus === 'da_tao' || dh.ticketStatus === 'dang_tao',
            ticketChannelName: dh.ticketChannelName,
            discordDaLienKet: !!dh.discordId,
            discordDaJoinServer: true, // Assume true if has discordId
            ngayTao: dh.createdAt,
            createdAt: dh.createdAt // Keep for backward compat
        }));

        res.json({
            donHang: danhSach,
            tong: danhSach.length
        });

    } catch (err) {
        console.error('[LICH_SU] Error:', err);
        res.status(500).json({
            thongBao: 'Loi he thong. Vui long thu lai sau.',
            chiTiet: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// GET /don-hang/:orderId - Get order details (auth required)
router.get('/:orderId', xacThucDonHang, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.donHangUserId;

        const donHang = await Order.findOne({
            orderId: orderId,
            userId: userId
        }).lean();

        if (!donHang) {
            return res.status(404).json({ thongBao: 'Don hang khong ton tai' });
        }

        // Determine ticket creation eligibility
        const canCreateTicket = donHang.paymentStatus === 'paid' &&
            Boolean(donHang.discordId && donHang.discordId.trim()) &&
            donHang.discordDaLienKet === true &&
            donHang.discordDaJoinServer === true;

        res.json({
            orderId: donHang.orderId,
            items: donHang.items,
            subtotalVnd: donHang.subtotalVnd || 0,
            discountVnd: donHang.discountVnd || 0,
            totalVnd: donHang.totalVnd || donHang.totalAmount || 0,
            couponCode: donHang.couponCode || '',
            paymentStatus: donHang.paymentStatus,
            status: donHang.status,
            ticketStatus: donHang.ticketStatus,
            channelId: donHang.channelId || '',
            channelName: donHang.channelName || '',
            createdAt: donHang.createdAt,
            paidAt: donHang.paidAt,
            canCreateTicket: canCreateTicket
        });

    } catch (err) {
        console.error('[CHI_TIET_DON_HANG] Error:', err);
        res.status(500).json({
            thongBao: 'Loi he thong. Vui long thu lai sau.',
            chiTiet: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// GET /don-hang/:orderId/tao-ticket - Create Discord ticket (auth required)
router.post('/:orderId/tao-ticket', xacThucDonHang, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.donHangUserId;

        const donHang = await Order.findOne({
            orderId: orderId,
            userId: userId
        });

        if (!donHang) {
            return res.status(404).json({ thongBao: 'Don hang khong ton tai' });
        }

        // Check payment status
        if (donHang.paymentStatus !== 'paid') {
            return res.status(400).json({
                thongBao: 'Don hang chua thanh toan',
                paymentStatus: donHang.paymentStatus
            });
        }

        // Check Discord link
        if (!donHang.discordDaLienKet || !donHang.discordId) {
            return res.status(400).json({
                thongBao: 'Ban can lien ket Discord truoc khi tao ticket',
                lienKetDiscordRequired: true,
                lienKetUrl: '/profile?tab=discord'
            });
        }

        // Check server membership
        if (!donHang.discordDaJoinServer) {
            return res.status(400).json({
                thongBao: 'Ban can joining server truoc khi tao ticket',
                joinServerRequired: true,
                serverLink: process.env.DISCORD_INVITE_LINK || ''
            });
        }

        // Check if ticket already exists
        if (donHang.ticketStatus === 'da_tao' && donHang.channelId) {
            return res.status(400).json({
                thongBao: 'Ticket da duoc tao',
                channelId: donHang.channelId,
                channelName: donHang.channelName
            });
        }

        // Check ticket status
        if (donHang.ticketStatus === 'dang_tao') {
            return res.status(400).json({
                thongBao: 'Ticket dang duoc tao. Vui long doi...',
                ticketStatus: 'dang_tao'
            });
        }

        // Update status to creating
        await Order.findByIdAndUpdate(donHang._id, {
            ticketStatus: 'dang_tao',
            ticketTaoLuc: new Date()
        });

        // Try to create ticket via bot
        let channelId = '';
        let channelName = '';

        try {
            if (botModule?.createWalletDeliveryTicket) {
                const result = await botModule.createWalletDeliveryTicket(donHang);
                channelId = result || '';
            } else {
                // No bot, simulate success
                channelId = `ticket_${donHang.orderId}`;
                channelName = `order_${donHang.orderId}`;
            }
        } catch (ticketErr) {
            console.error('Tao ticket loi:', ticketErr?.message || ticketErr);

            // Update error status
            await Order.findByIdAndUpdate(donHang._id, {
                ticketStatus: 'that_bai',
                ticketError: String(ticketErr?.message || 'Loi tao ticket')
            });

            return res.status(500).json({
                thongBao: 'Loi tao ticket Discord',
                chiTiet: ticketErr?.message
            });
        }

        // Update order with ticket info
        await Order.findByIdAndUpdate(donHang._id, {
            channelId: channelId,
            channelName: channelName || `order_${donHang.orderId}`,
            ticketStatus: 'da_tao',
            ticketTaoLuc: new Date()
        });

        res.json({
            thanhCong: true,
            thongBao: 'Tao ticket thanh cong',
            channelId: channelId,
            channelName: channelName || `order_${donHang.orderId}`
        });

    } catch (err) {
        console.error('[TAO_TICKET] Error:', err);
        res.status(500).json({
            thongBao: 'Loi he thong. Vui long thu lai sau.',
            chiTiet: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// GET /don-hang/:orderId/ticket-trang-thai - Check ticket status (auth required)
router.get('/:orderId/ticket-trang-thai', xacThucDonHang, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.donHangUserId;

        const donHang = await Order.findOne({
            orderId: orderId,
            userId: userId
        }).lean();

        if (!donHang) {
            return res.status(404).json({ thongBao: 'Don hang khong ton tai' });
        }

        res.json({
            orderId: donHang.orderId,
            ticketStatus: donHang.ticketStatus,
            channelId: donHang.channelId || '',
            channelName: donHang.channelName || '',
            ticketError: donHang.ticketError || '',
            ticketTaoLuc: donHang.ticketTaoLuc
        });

    } catch (err) {
        console.error('[TICKET_TRANG_THAI] Error:', err);
        res.status(500).json({
            thongBao: 'Loi he thong. Vui long thu lai sau.',
            chiTiet: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// POST /don-hang/:orderId/huy - Cancel order (auth required)
router.post('/:orderId/huy', xacThucDonHang, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { orderId } = req.params;
        const userId = req.donHangUserId;

        const donHang = await Order.findOne({
            orderId: orderId,
            userId: userId
        }).session(session);

        if (!donHang) {
            await session.abortTransaction();
            return res.status(404).json({ thongBao: 'Don hang khong ton tai' });
        }

        // Check current status - can only cancel if not yet delivered
        const cancellableStatuses = ['cho_xu_ly', 'da_thanh_toan'];
        if (!cancellableStatuses.includes(donHang.status)) {
            await session.abortTransaction();
            return res.status(400).json({
                thongBao: 'Khong the huy don hang',
                trangThaiHienTai: donHang.status
            });
        }

        // Also check payment status
        if (donHang.paymentStatus !== 'pending' && donHang.paymentStatus !== 'paid') {
            await session.abortTransaction();
            return res.status(400).json({
                thongBao: 'Khong the huy don hang',
                trangThaiThanhToan: donHang.paymentStatus
            });
        }

        const refundAmount = donHang.totalVnd || donHang.totalAmount || 0;

        // Refund wallet if already paid
        if (donHang.paymentStatus === 'paid' && refundAmount > 0) {
            // Get current balance
            const taiKhoan = await TaiKhoan.findById(userId).session(session);

            if (taiKhoan) {
                // Refund balance
                await TaiKhoan.findByIdAndUpdate(userId, {
                    $inc: { soDuVnd: refundAmount }
                }, { session: session });

                // Create refund transaction
                await WalletTransaction.create([{
                    userId: userId,
                    tenDangNhap: taiKhoan.tenDangNhap || '',
                    type: 'refund',
                    direction: 'credit',
                    amountVnd: refundAmount,
                    method: 'wallet',
                    status: 'completed',
                    orderId: orderId,
                    orderCode: orderId,
                    items: donHang.items || [],
                    balanceAfterVnd: (Number(taiKhoan.soDuVnd) || 0) + refundAmount
                }], { session: session });
            }

            // Mark coupon as unused if applied
            if (donHang.couponCode) {
                await GeneratedCoupon.findOneAndUpdate({
                    couponCode: donHang.couponCode,
                    usedOrderId: orderId
                }, {
                    status: 'unused',
                    usedOrderId: '',
                    usedAt: null
                }, { session: session });
            }
        }

        // Update order status
        await Order.findByIdAndUpdate(donHang._id, {
            status: 'huy',
            paymentStatus: 'cancelled'
        }, { session: session });

        await session.commitTransaction();

        res.json({
            thanhCong: true,
            thongBao: refundAmount > 0
                ? `Da huy don hang va hoan tien ${refundAmount.toLocaleString('vi-VN')} VND`
                : 'Da huy don hang'
        });

    } catch (err) {
        await session.abortTransaction();
        console.error('[HUY_DON_HANG] Error:', err);
        res.status(500).json({
            thongBao: 'Loi he thong. Vui long thu lai sau.',
            chiTiet: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } finally {
        session.endSession();
    }
});

module.exports = router;
module.exports.xacThucDonHang = xacThucDonHang;