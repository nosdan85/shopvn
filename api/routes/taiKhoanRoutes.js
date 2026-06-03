const express = require('express');
const jwt = require('jsonwebtoken');

const TaiKhoan = require('../models/TaiKhoan');

// Service chua ton tai - se duoc Tao sau
let taiKhoanService;
try {
    taiKhoanService = require('../services/taiKhoanService');
} catch (e) {
    taiKhoanService = null;
}

// Rate limiter cho dang ky
const signupLimiter = (() => {
    const rateLimit = require('express-rate-limit');
    return rateLimit({
        windowMs: 60 * 60 * 1000, // 1 gio
        max: 5, // 5 lan dang ky moi IP trong 1 gio
        standardHeaders: true,
        legacyHeaders: false,
        message: { thongBao: 'Qua so lan yeu cau. Vui long thu lai sau 1 gio.' }
    });
})();

// Rate limiter cho dang nhap
const loginLimiter = (() => {
    const rateLimit = require('express-rate-limit');
    return rateLimit({
        windowMs: 15 * 60 * 1000, // 15 phut
        max: 10, // 10 lan thu trong 15 phut
        standardHeaders: true,
        legacyHeaders: false,
        message: { thongBao: 'Qua so lan thu dang nhap. Vui long thu lai sau 15 phut.' }
    });
})();

const router = express.Router();

// ============ AUTH MIDDLEWARE ============
// Lay Bearer token tu Authorization header
function layToken(req) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice('Bearer '.length).trim();
    }
    return req.header('x-auth-token') || '';
}

// Xu ly xac thuc - middleware function
async function xacThuc(req, res, next) {
    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ thongBao: 'Server chua cau hinh xac thuc' });
    }

    const token = layToken(req);
    if (!token) {
        return res.status(401).json({ thongBao: 'Vui long dang nhap de tiep tuc' });
    }

    let decoded = null;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ thongBao: 'Token khong hop le hoac da het han' });
    }

    // Kiem tra co taiKhoanService khong
    if (taiKhoanService?.xacthucToken) {
        const ketQua = await taiKhoanService.xacthucToken(token);
        if (!ketQua || !ketQua.hopLe) {
            return res.status(401).json({ thongBao: 'Token khong hop le hoac da het han' });
        }
        req.nguoiDung = ketQua.taiKhoan;
    } else {
        // Fallback: tim kiem theo thong tin trong token
        if (!decoded?._id && !decoded?.tenDangNhap) {
            return res.status(401).json({ thongBao: 'Token khong hop le' });
        }

        // Tim tai khoan trong database
        const taiKhoan = await TaiKhoan.findOne({
            $or: [
                { _id: decoded._id },
                { tenDangNhap: decoded.tenDangNhap }
            ]
        });

        if (!taiKhoan) {
            return res.status(401).json({ thongBao: 'Tai khoan khong ton tai' });
        }

        if (!taiKhoan.dangHoatDong) {
            return res.status(401).json({ thongBao: 'Tai khoan da bi khoa' });
        }

        req.nguoiDung = taiKhoan;
    }

    next();
}

// ============ ROUTES ============

// POST /dang-ky - Dang ki tai khoan moi
router.post('/dang-ky', signupLimiter, async (req, res) => {
    try {
        const { tenDangNhap, email, matKhau, xacNhanMatKhau } = req.body;

        // Kiem tra cac truong bat buoc
        if (!tenDangNhap || !email || !matKhau || !xacNhanMatKhau) {
            return res.status(400).json({
                thongBao: 'Vui long dien day du thong tin',
                chiTiet: {
                    tenDangNhap: !tenDangNhap ? 'Bat buoc' : undefined,
                    email: !email ? 'Bat buoc' : undefined,
                    matKhau: !matKhau ? 'Bat buoc' : undefined,
                    xacNhanMatKhau: !xacNhanMatKhau ? 'Bat buoc' : undefined
                }
            });
        }

        // Kiem tra dinh dang ten dang nhap
        const tenDangNhapClean = String(tenDangNhap).trim();
        if (tenDangNhapClean.length < 3 || tenDangNhapClean.length > 30) {
            return res.status(400).json({ thongBao: 'Ten dang nhap phai tu 3 den 30 ky tu' });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(tenDangNhapClean)) {
            return res.status(400).json({
                thongBao: 'Ten dang nhap chi duoc chua chu cai, so va dau gach duoi'
            });
        }

        // Kiem tra mat khau khong trung nhau
        if (matKhau !== xacNhanMatKhau) {
            return res.status(400).json({ thongBao: 'Mat khau khong khop' });
        }

        // Kiem tra do dai mat khau
        if (matKhau.length < 6) {
            return res.status(400).json({ thongBao: 'Mat khau phai co it nhat 6 ky tu' });
        }

        // Kiem tra email hop le
        const emailClean = String(email).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
            return res.status(400).json({ thongBao: 'Email khong hop le' });
        }

        // Kiem tra ten dang nhap da ton tai
        const tonTai = await TaiKhoan.findOne({ tenDangNhap: tenDangNhapClean });
        if (tonTai) {
            return res.status(400).json({ thongBao: 'Ten dang nhap da ton tai' });
        }

        // Kiem tra email da ton tai
        const emailTonTai = await TaiKhoan.findOne({ email: emailClean });
        if (emailTonTai) {
            return res.status(400).json({ thongBao: 'Email da duoc su dung' });
        }

        // Goi service neu co
        let taiKhoanMoi;
        if (taiKhoanService?.dangKy) {
            const ketQua = await taiKhoanService.dangKy({
                tenDangNhap: tenDangNhapClean,
                email: emailClean,
                matKhau: matKhau
            });
            taiKhoanMoi = ketQua.taiKhoan;
        } else {
            // Tao tai khoan truc tiep
            taiKhoanMoi = await TaiKhoan.create({
                tenDangNhap: tenDangNhapClean,
                email: emailClean,
                matKhauHash: matKhau,
                soDuVi: 0,
                vaiTro: 'khach_hang'
            });
        }

        // Tao JWT token
        const token = jwt.sign(
            {
                _id: taiKhoanMoi._id,
                tenDangNhap: taiKhoanMoi.tenDangNhap,
                vaiTro: taiKhoanMoi.vaiTro
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Tra ve thong tin (khong co mat khau)
        const thongTin = {
            _id: taiKhoanMoi._id,
            tenDangNhap: taiKhoanMoi.tenDangNhap,
            email: taiKhoanMoi.email,
            soDuVi: taiKhoanMoi.soDuVi || 0,
            vaiTro: taiKhoanMoi.vaiTro,
            ngayTao: taiKhoanMoi.ngayTao
        };

        res.status(201).json({
            thongBao: 'Dang ky thanh cong',
            taiKhoan: thongTin,
            token: token
        });

    } catch (err) {
        console.error('Loi dang ky:', err);
        res.status(500).json({ thongBao: 'Loi he thong. Vui long thu lai sau.' });
    }
});

// POST /dang-nhap - Dang nhap tai khoan
router.post('/dang-nhap', loginLimiter, async (req, res) => {
    try {
        const { tenDangNhap, matKhau } = req.body;

        // Kiem tra cac truong bat buoc
        if (!tenDangNhap || !matKhau) {
            return res.status(400).json({
                thongBao: 'Vui long dien day du thong tin',
                chiTiet: {
                    tenDangNhap: !tenDangNhap ? 'Bat buoc' : undefined,
                    matKhau: !matKhau ? 'Bat buoc' : undefined
                }
            });
        }

        // Tim tai khoan
        const tenDangNhapClean = String(tenDangNhap).trim();
        const taiKhoan = await TaiKhoan.findOne({ tenDangNhap: tenDangNhapClean });

        if (!taiKhoan) {
            return res.status(401).json({ thongBao: 'Ten dang nhap hoac mat khau khong dung' });
        }

        // Kiem tra mat khau
        const matKhauDung = await taiKhoan.kiemTraMatKhau(matKhau);
        if (!matKhauDung) {
            return res.status(401).json({ thongBao: 'Ten dang nhap hoac mat khau khong dung' });
        }

        // Kiem tra tai khoan con hoat dong
        if (!taiKhoan.dangHoatDong) {
            return res.status(401).json({ thongBao: 'Tai khoan da bi khoa' });
        }

        // Goi service neu co
        if (taiKhoanService?.dangNhap) {
            const ketQua = await taiKhoanService.dangNhap({
                tenDangNhap: tenDangNhapClean,
                matKhau: matKhau
            });

            return res.json({
                thongBao: 'Dang nhap thanh cong',
                taiKhoan: ketQua.taiKhoan,
                token: ketQua.token
            });
        }

        // Tao JWT token
        const token = jwt.sign(
            {
                _id: taiKhoan._id,
                tenDangNhap: taiKhoan.tenDangNhap,
                vaiTro: taiKhoan.vaiTro
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Tra ve thong tin
        const thongTin = {
            _id: taiKhoan._id,
            tenDangNhap: taiKhoan.tenDangNhap,
            email: taiKhoan.email,
            soDuVi: taiKhoan.soDuVi || 0,
            vaiTro: taiKhoan.vaiTro,
            ngayTao: taiKhoan.ngayTao
        };

        res.json({
            thongBao: 'Dang nhap thanh cong',
            taiKhoan: thongTin,
            token: token
        });

    } catch (err) {
        console.error('Loi dang nhap:', err);
        res.status(500).json({ thongBao: 'Loi he thong. Vui long thu lai sau.' });
    }
});

// GET /thong-tin - Lay thong tin tai khoan hien tai
router.get('/thong-tin', xacThuc, async (req, res) => {
    try {
        // Da duoc xac thuc boi middleware
        if (!req.nguoiDung) {
            return res.status(401).json({ thongBao: 'Khong lay duoc thong tin tai khoan' });
        }

        const taiKhoan = req.nguoiDung;

        res.json({
            _id: taiKhoan._id,
            tenDangNhap: taiKhoan.tenDangNhap,
            email: taiKhoan.email,
            soDuVi: taiKhoan.soDuVi || 0,
            vaiTro: taiKhoan.vaiTro,
            daLienKetDiscord: Boolean(taiKhoan.discordId && taiKhoan.discordId.trim()),
            discordTenHienThi: taiKhoan.discordTenHienThi || '',
            ngayTao: taiKhoan.ngayTao
        });

    } catch (err) {
        console.error('Loi lay thong tin:', err);
        res.status(500).json({ thongBao: 'Loi he thong. Vui long thu lai sau.' });
    }
});

// POST /lien-ket-discord - Lien ket tai khoan voi Discord
router.post('/lien-ket-discord', xacThuc, async (req, res) => {
    try {
        const { maDiscord } = req.body;

        if (!maDiscord || typeof maDiscord !== 'string') {
            return res.status(400).json({ thongBao: 'Vui long cung cap ma xac thuc Discord' });
        }

        // Client gui authorization code tu Discord OAuth
        // Can goi Discord API de lay thong tin user

        const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI, JWT_SECRET } = process.env;

        if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
            return res.status(500).json({ thongBao: 'Chua cau hinh Discord OAuth' });
        }

        // DOI: doi authorization code lay access token
        const axios = require('axios');

        let discordUserInfo = null;

        try {
            const tokenResponse = await axios.post('https://discord.com/api/oauth2/token',
                new URLSearchParams({
                    client_id: DISCORD_CLIENT_ID,
                    client_secret: DISCORD_CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    code: maDiscord,
                    redirect_uri: DISCORD_REDIRECT_URI || 'http://localhost:3000/callback/discord'
                }), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            const accessToken = tokenResponse.data.access_token;

            // Lay thong tin user tu Discord API
            const userResponse = await axios.get('https://discord.com/api/users/@me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            discordUserInfo = userResponse.data;

        } catch (err) {
            console.error('Loi lay Discord token:', err.response?.data || err.message);
            return res.status(400).json({ thongBao: 'Ma xac thuc khong hop le hoac da het han' });
        }

        if (!discordUserInfo || !discordUserInfo.id) {
            return res.status(400).json({ thongBao: 'Khong lay duoc thong tin Discord' });
        }

        // Kiem tra Discord da duoc lien ket voi tai khoan khac chua
        const daCo = await TaiKhoan.findOne({
            discordId: discordUserInfo.id,
            _id: { $ne: req.nguoiDung._id }
        });

        if (daCo) {
            return res.status(400).json({
                thongBao: 'Discord nay da duoc lien ket voi tai khoan khac'
            });
        }

        // Cap nhat thong tin lien ket Discord
        let taiKhoanCapNhat;

        if (taiKhoanService?.capNhatLienKetDiscord) {
            const ketQua = await taiKhoanService.capNhatLienKetDiscord(req.nguoiDung._id, {
                discordId: discordUserInfo.id,
                discordTenHienThi: discordUserInfo.username || discordUserInfo.global_name
            });
            taiKhoanCapNhat = ketQua.taiKhoan;
        } else {
            taiKhoanCapNhat = await TaiKhoan.findByIdAndUpdate(
                req.nguoiDung._id,
                {
                    discordId: discordUserInfo.id,
                    discordTenHienThi: discordUserInfo.username || discordUserInfo.global_name,
                    discordDaLienKetLuc: new Date()
                },
                { new: true }
            );
        }

        res.json({
            thongBao: 'Lien ket Discord thanh cong',
            discordTenHienThi: taiKhoanCapNhat.discordTenHienThi
        });

    } catch (err) {
        console.error('Loi lien ket Discord:', err);
        res.status(500).json({ thongBao: 'Loi he thong. Vui long thu lai sau.' });
    }
});

// GET /kiem-tra-discord - Kiem tra trang thai lien ket Discord
router.get('/kiem-tra-discord', xacThuc, async (req, res) => {
    try {
        const taiKhoan = req.nguoiDung;

        const daLienKet = Boolean(taiKhoan.discordId && taiKhoan.discordId.trim());

        res.json({
            daLienKet: daLienKet,
            discordId: daLienKet ? taiKhoan.discordId : null,
            discordTenHienThi: daLienKet ? taiKhoan.discordTenHienThi : null
        });

    } catch (err) {
        console.error('Loi kiem tra Discord:', err);
        res.status(500).json({ thongBao: 'Loi he thong. Vui long thu lai sau.' });
    }
});

// POST /dang-xuat - Dang xuat (xoa token tren client)
router.post('/dang-xuat', xacThuc, async (req, res) => {
    // Chu yeu la xoa token tren client
    // Co the them logic xoa refresh token trong database neu can

    try {
        // Xoa refresh token neu co
        if (req.nguoiDung?.refreshTokenHash) {
            await TaiKhoan.findByIdAndUpdate(req.nguoiDung._id, {
                refreshTokenHash: ''
            });
        }

        res.json({ thongBao: 'Dang xuat thanh cong' });

    } catch (err) {
        console.error('Loi dang xuat:', err);
        res.json({ thongBao: 'Dang xuat thanhcong' });
    }
});

module.exports = router;
module.exports.xacThuc = xacThuc;