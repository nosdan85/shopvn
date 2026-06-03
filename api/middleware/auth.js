const jwt = require('jsonwebtoken');
const TaiKhoan = require('../models/TaiKhoan');

let taiKhoanService;
try {
    taiKhoanService = require('../services/taiKhoanService');
} catch (e) {
    taiKhoanService = null;
}

function layToken(req) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice('Bearer '.length).trim();
    }
    return req.header('x-auth-token') || '';
}

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

    if (taiKhoanService?.xacthucToken) {
        const serviceDecoded = await taiKhoanService.xacthucToken(token);
        if (serviceDecoded) {
            decoded = serviceDecoded;
        }
    }

    const userId = decoded?._id || decoded?.userId;
    const tenDangNhap = decoded?.tenDangNhap;

    if (!userId && !tenDangNhap) {
        return res.status(401).json({ thongBao: 'Token không hợp lệ' });
    }

    const dieuKienTim = [];
    if (userId) {
        dieuKienTim.push({ _id: userId });
    }
    if (tenDangNhap) {
        dieuKienTim.push({ tenDangNhap });
    }

    const taiKhoan = await TaiKhoan.findOne({ $or: dieuKienTim });

    if (!taiKhoan) {
        return res.status(401).json({ thongBao: 'Tài khoản không tồn tại' });
    }

    if (!taiKhoan.dangHoatDong) {
        return res.status(401).json({ thongBao: 'Tài khoản đã bị khóa' });
    }

    req.nguoiDung = taiKhoan;
    next();
}

module.exports = { layToken, xacThuc };
