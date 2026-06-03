const jwt = require('jsonwebtoken');
const TaiKhoan = require('../models/TaiKhoan');

let taiKhoanService;
try {
    taiKhoanService = require('../services/taiKhoanService');
} catch (e) {
    taiKhoanService = null;
}

/**
 * Extract Bearer token from Authorization header or x-auth-token header
 * @param {Object} req - Express request object
 * @returns {string} Token string or empty string if not found
 */
function layToken(req) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice('Bearer '.length).trim();
    }
    return req.header('x-auth-token') || '';
}

/**
 * Authentication middleware
 * Verifies JWT token and loads user info into req.nguoiDung
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function xacThuc(req, res, next) {
    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ thongBao: 'Server chưa cấu hình xác thực' });
    }

    const token = layToken(req);
    if (!token) {
        return res.status(401).json({ thongBao: 'Vui lòng đăng nhập để tiếp tục' });
    }

    let decoded = null;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ thongBao: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    // Check if taiKhoanService is available
    if (taiKhoanService?.xacthucToken) {
        const ketQua = await taiKhoanService.xacthucToken(token);
        if (!ketQua || !ketQua.hopLe) {
            return res.status(401).json({ thongBao: 'Token không hợp lệ hoặc đã hết hạn' });
        }
        req.nguoiDung = ketQua.taiKhoan;
    } else {
        // Fallback: find account by token info
        if (!decoded?._id && !decoded?.tenDangNhap) {
            return res.status(401).json({ thongBao: 'Token không hợp lệ' });
        }

        // Find account in database
        const taiKhoan = await TaiKhoan.findOne({
            $or: [
                { _id: decoded._id },
                { tenDangNhap: decoded.tenDangNhap }
            ]
        });

        if (!taiKhoan) {
            return res.status(401).json({ thongBao: 'Tài khoản không tồn tại' });
        }

        if (!taiKhoan.dangHoatDong) {
            return res.status(401).json({ thongBao: 'Tài khoản đã bị khóa' });
        }

        req.nguoiDung = taiKhoan;
    }

    next();
}

module.exports = { layToken, xacThuc };
