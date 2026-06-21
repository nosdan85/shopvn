const express = require('express');
const mongoose = require('mongoose');
const TaiKhoan = require('../models/TaiKhoan');
const Order = require('../models/Order');
const WalletTransaction = require('../models/WalletTransaction');
const { xacThuc } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Middleware to check if user is admin
async function xacThucAdmin(req, res, next) {
    await xacThuc(req, res, async (err) => {
        if (err) return next(err);
        
        const taiKhoan = await TaiKhoan.findById(req.userId || req.nguoiDung?._id);
        if (!taiKhoan || taiKhoan.vaiTro !== 'quan_tri') {
            return res.status(403).json({ thongBao: 'Khong co quyen truy cap' });
        }
        next();
    });
}

// Lấy danh sách tài khoản web
router.get('/', xacThucAdmin, async (req, res) => {
    try {
        const accounts = await TaiKhoan.find().sort({ ngayTao: -1 }).lean();
        
        // Remove password hashes, return discordTenHienThi instead of discordId
        const sanitizedAccounts = accounts.map(acc => {
            const { matKhauHash, refreshTokenHash, ...safeData } = acc;
            return {
                ...safeData,
                discordTenHienThi: acc.discordTenHienThi || '',
                discordId: acc.discordId || ''
            };
        });

        res.json({ thanhCong: true, data: sanitizedAccounts });
    } catch (error) {
        console.error('[ADMIN_ACCOUNTS] Lỗi lấy danh sách:', error);
        res.status(500).json({ thongBao: 'Lỗi server' });
    }
});

// Lấy danh sách đơn hàng của một tài khoản web
router.get('/:accountId/don-hang', xacThucAdmin, async (req, res) => {
    try {
        const { accountId } = req.params;
        const orders = await Order.find({ userId: accountId }).sort({ createdAt: -1 }).lean();
        
        // Map to include VND prices
        const mapped = orders.map(o => ({
            _id: o._id,
            orderId: o.orderId,
            items: (o.items || []).map(item => ({
                name: item.name || '',
                quantity: item.quantity || 1,
                priceVnd: item.priceVnd || item.price || 0,
                lineTotalVnd: item.lineTotalVnd || ((item.priceVnd || item.price || 0) * (item.quantity || 1))
            })),
            subtotalVnd: o.subtotalVnd || 0,
            discountVnd: o.discountVnd || 0,
            totalVnd: o.totalVnd || o.totalAmount || 0,
            totalAmount: o.totalVnd || o.totalAmount || 0,
            status: o.status,
            paymentStatus: o.paymentStatus,
            ticketStatus: o.ticketStatus,
            createdAt: o.createdAt
        }));
        
        res.json({ thanhCong: true, data: mapped });
    } catch (error) {
        console.error('[ADMIN_ACCOUNTS] Lỗi lấy đơn hàng:', error);
        res.status(500).json({ thongBao: 'Lỗi server' });
    }
});

// Cập nhật mật khẩu cho tài khoản
router.post('/:accountId/doi-mat-khau', xacThucAdmin, async (req, res) => {
    try {
        const { accountId } = req.params;
        const { newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ thongBao: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }

        const taiKhoan = await TaiKhoan.findById(accountId);
        if (!taiKhoan) {
            return res.status(404).json({ thongBao: 'Tài khoản không tồn tại' });
        }

        taiKhoan.matKhauHash = newPassword; // Mongoose pre-save hook will hash it
        await taiKhoan.save();

        res.json({ thanhCong: true, thongBao: 'Cập nhật mật khẩu thành công' });
    } catch (error) {
        console.error('[ADMIN_ACCOUNTS] Lỗi đổi mật khẩu:', error);
        res.status(500).json({ thongBao: 'Lỗi server' });
    }
});

// Cộng tiền vào tài khoản
router.post('/:accountId/cong-tien', xacThucAdmin, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { accountId } = req.params;
        const amountVnd = Number(req.body.amount);
        const { reason } = req.body;
        
        if (!amountVnd || amountVnd <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ thongBao: 'Số tiền cộng phải lớn hơn 0' });
        }

        const taiKhoan = await TaiKhoan.findById(accountId).session(session);
        if (!taiKhoan) {
            await session.abortTransaction();
            return res.status(404).json({ thongBao: 'Tài khoản không tồn tại' });
        }

        const oldBalance = Number(taiKhoan.soDuVnd) || 0;
        const newBalance = oldBalance + amountVnd;

        taiKhoan.soDuVnd = newBalance;
        await taiKhoan.save({ session });

        await WalletTransaction.create([{
            userId: accountId,
            tenDangNhap: taiKhoan.tenDangNhap,
            discordId: taiKhoan.discordId,
            type: 'adjustment',
            direction: 'credit',
            amountVnd: amountVnd,
            method: 'admin',
            status: 'completed',
            adminNotes: reason || 'Admin cộng tiền thủ công',
            balanceAfterVnd: newBalance
        }], { session });

        await session.commitTransaction();
        res.json({ thanhCong: true, thongBao: `Đã cộng ${amountVnd.toLocaleString('vi-VN')} VND thành công`, soDuMoi: newBalance });
    } catch (error) {
        await session.abortTransaction();
        console.error('[ADMIN_ACCOUNTS] Lỗi cộng tiền:', error);
        res.status(500).json({ thongBao: 'Lỗi server' });
    } finally {
        session.endSession();
    }
});

// Xóa tài khoản
router.delete('/:accountId', xacThucAdmin, async (req, res) => {
    try {
        const { accountId } = req.params;
        
        const taiKhoan = await TaiKhoan.findById(accountId);
        if (!taiKhoan) {
            return res.status(404).json({ thongBao: 'Tài khoản không tồn tại' });
        }
        
        // Không cho phép xóa tài khoản admin
        if (taiKhoan.vaiTro === 'quan_tri') {
            return res.status(400).json({ thongBao: 'Không thể xóa tài khoản admin' });
        }
        
        await TaiKhoan.findByIdAndDelete(accountId);
        
        res.json({ thanhCong: true, thongBao: `Đã xóa tài khoản ${taiKhoan.tenDangNhap}` });
    } catch (error) {
        console.error('[ADMIN_ACCOUNTS] Lỗi xóa tài khoản:', error);
        res.status(500).json({ thongBao: 'Lỗi server' });
    }
});

module.exports = router;
