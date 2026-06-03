const jwt = require('jsonwebtoken');
const TaiKhoan = require('../models/TaiKhoan');

const JWT_SECRET = process.env.JWT_SECRET || 'nosmarket_jwt_secret_key';
const JWT_EXPIRES_IN = '7d';

/**
 * Tao token JWT cho tai khoan
 * @param {Object} taiKhoan - Document TaiKhoan
 * @returns {string} JWT token
 */
function taoTokenJWT(taiKhoan) {
    const payload = {
        userId: taiKhoan._id,
        tenDangNhap: taiKhoan.tenDangNhap,
        vaiTro: taiKhoan.vaiTro
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Xac thuc va giai ma token JWT
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload hoac null neu khong hop le
 */
function xacthucToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

/**
 * Dang ky tai khoan moi
 * @param {Object} param0 - { tenDangNhap, email, matKhau }
 * @returns {Promise<{ taiKhoan: Object, token: string }>}
 */
async function dangKy({ tenDangNhap, email, matKhau }) {
    // Validate ten dang nhap: 3-30 ky tu, chi alphanumeric va dau gach duoi
    if (!tenDangNhap || typeof tenDangNhap !== 'string') {
        throw new Error('Ten dang nhap khong duoc de trong');
    }
    const trimmedUsername = tenDangNhap.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
        throw new Error('Ten dang nhap phai tu 3 den 30 ky tu');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
        throw new Error('Ten dang nhap chi duoc chua chu cai, so va dau gach duoi');
    }

    // Validate mat khau: toi thieu 6 ky tu
    if (!matKhau || typeof matKhau !== 'string') {
        throw new Error('Mat khau khong duoc de trong');
    }
    if (matKhau.length < 6) {
        throw new Error('Mat khau phai co it nhat 6 ky tu');
    }

    // Kiem tra ten dang nhap da ton tai
    const existingUser = await TaiKhoan.findOne({
        tenDangNhap: { $regex: new RegExp('^' + trimmedUsername + '$', 'i') }
    });
    if (existingUser) {
        throw new Error('Ten dang nhap da duoc su dung');
    }

    // Tao tai khoan moi (pre-save hook tu hash mat khau)
    const taiKhoan = new TaiKhoan({
        tenDangNhap: trimmedUsername,
        email: email ? email.trim().toLowerCase() : '',
        matKhauHash: matKhau
    });

    await taiKhoan.save();

    const token = taoTokenJWT(taiKhoan);

    return { taiKhoan, token };
}

/**
 * Dang nhap tai khoan
 * @param {Object} param0 - { tenDangNhap, matKhau }
 * @returns {Promise<{ taiKhoan: Object, token: string }>}
 */
async function dangNhap({ tenDangNhap, matKhau }) {
    if (!tenDangNhap || typeof tenDangNhap !== 'string') {
        throw new Error('Ten dang nhap khong duoc de trong');
    }
    if (!matKhau || typeof matKhau !== 'string') {
        throw new Error('Mat khau khong duoc de trong');
    }

    // Tim tai khoan theo ten dang nhap (khong phan biet hoa thuong)
    const taiKhoan = await TaiKhoan.findOne({
        tenDangNhap: { $regex: new RegExp('^' + tenDangNhap.trim() + '$', 'i') }
    });

    if (!taiKhoan) {
        throw new Error('Ten dang nhap hoac mat khau khong dung');
    }

    if (!taiKhoan.dangHoatDong) {
        throw new Error('Tai khoan da bi khoa');
    }

    const hopLe = await taiKhoan.kiemTraMatKhau(matKhau);
    if (!hopLe) {
        throw new Error('Ten dang nhap hoac mat khau khong dung');
    }

    const token = taoTokenJWT(taiKhoan);

    return { taiKhoan, token };
}

/**
 * Lay thong tin tai khoan (khong bao gom mat khau)
 * @param {string} userId - ID tai khoan
 * @returns {Promise<Object|null>}
 */
async function layThongTinTaiKhoan(userId) {
    const taiKhoan = await TaiKhoan.findById(userId).select('-matKhauHash -refreshTokenHash');
    if (!taiKhoan) {
        throw new Error('Khong tim thay tai khoan');
    }
    return taiKhoan;
}

/**
 * Cap nhat lien ket Discord cho tai khoan
 * @param {string} userId - ID tai khoan
 * @param {string} discordId - Discord user ID
 * @param {string} discordTenHienThi - Ten hien thi tren Discord
 * @returns {Promise<Object>}
 */
async function capNhatLienKetDiscord(userId, discordId, discordTenHienThi) {
    const taiKhoan = await TaiKhoan.findById(userId);
    if (!taiKhoan) {
        throw new Error('Khong tim thay tai khoan');
    }

    taiKhoan.discordId = discordId;
    taiKhoan.discordTenHienThi = discordTenHienThi;
    taiKhoan.discordDaLienKetLuc = new Date();

    await taiKhoan.save();

    return taiKhoan;
}

/**
 * Kiem tra tai khoan da lien ket Discord chua
 * @param {string} userId - ID tai khoan
 * @returns {Promise<{ daLienKet: boolean, discordId: string, discordTenHienThi: string }>}
 */
async function kiemTraLienKetDiscord(userId) {
    const taiKhoan = await TaiKhoan.findById(userId).select('discordId discordTenHienThi');
    if (!taiKhoan) {
        throw new Error('Khong tim thay tai khoan');
    }

    const daLienKet = taiKhoan.daLienKetDiscord();

    return {
        daLienKet,
        discordId: daLienKet ? taiKhoan.discordId : '',
        discordTenHienThi: daLienKet ? taiKhoan.discordTenHienThi : ''
    };
}

module.exports = {
    dangKy,
    dangNhap,
    taoTokenJWT,
    xacthucToken,
    layThongTinTaiKhoan,
    capNhatLienKetDiscord,
    kiemTraLienKetDiscord
};
