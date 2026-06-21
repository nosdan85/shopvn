const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const TaiKhoan = require('../models/TaiKhoan');
const User = require('../models/User');
const { xacThuc } = require('../middleware/auth');
const { resolveDiscordRedirectUri } = require('../utils/discordOauth');
const { isOwnerDiscordId } = require('../utils/ownerAccess');

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
        message: { thongBao: 'Quá số lần yêu cầu. Vui lòng thử lại sau 1 giờ.' }
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
        message: { thongBao: 'Quá số lần thử đăng nhập. Vui lòng thử lại sau 15 phút.' }
    });
})();

const router = express.Router();

// ============ ROUTES ============

// POST /dang-ky - Dang ki tai khoan moi
router.post('/dang-ky', signupLimiter, async (req, res) => {
    try {
        const { tenDangNhap, email, matKhau, xacNhanMatKhau } = req.body;

        // Kiem tra cac truong bat buoc
        if (!tenDangNhap || !email || !matKhau || !xacNhanMatKhau) {
            return res.status(400).json({
                thongBao: 'Vui lòng điền đầy đủ thông tin',
                chiTiet: {
                    tenDangNhap: !tenDangNhap ? 'Bắt buộc' : undefined,
                    email: !email ? 'Bắt buộc' : undefined,
                    matKhau: !matKhau ? 'Bắt buộc' : undefined,
                    xacNhanMatKhau: !xacNhanMatKhau ? 'Bắt buộc' : undefined
                }
            });
        }

        // Kiem tra dinh dang ten dang nhap
        const tenDangNhapClean = String(tenDangNhap).trim();
        if (tenDangNhapClean.length < 3 || tenDangNhapClean.length > 30) {
            return res.status(400).json({ thongBao: 'Tên đăng nhập phải từ 3 đến 30 ký tự' });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(tenDangNhapClean)) {
            return res.status(400).json({
                thongBao: 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới'
            });
        }

        // Kiem tra mat khau khong trung nhau
        if (matKhau !== xacNhanMatKhau) {
            return res.status(400).json({ thongBao: 'Mật khẩu không khớp' });
        }

        // Kiem tra do dai mat khau
        if (matKhau.length < 6) {
            return res.status(400).json({ thongBao: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }

        // Kiem tra email hop le
        const emailClean = String(email).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
            return res.status(400).json({ thongBao: 'Email không hợp lệ' });
        }

        // Kiem tra ten dang nhap da ton tai
        const tonTai = await TaiKhoan.findOne({ tenDangNhap: tenDangNhapClean });
        if (tonTai) {
            return res.status(400).json({ thongBao: 'Tên đăng nhập đã tồn tại' });
        }

        // Kiem tra email da ton tai
        const emailTonTai = await TaiKhoan.findOne({ email: emailClean });
        if (emailTonTai) {
            return res.status(400).json({ thongBao: 'Email đã được sử dụng' });
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
                soDuVnd: 0,
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
            soDuVnd: taiKhoanMoi.soDuVnd || 0,
            vaiTro: taiKhoanMoi.vaiTro,
            referralCode: taiKhoanMoi.referralCode || '',
            daLienKetDiscord: Boolean(taiKhoanMoi.discordId && taiKhoanMoi.discordId.trim()),
            discordTenHienThi: taiKhoanMoi.discordTenHienThi || '',
            ngayTao: taiKhoanMoi.ngayTao
        };

        res.status(201).json({
            thongBao: 'Đăng ký thành công',
            user: thongTin,
            token: token
        });

    } catch (err) {
        console.error('Loi dang ky:', err);
        res.status(500).json({ thongBao: 'Lỗi hệ thống. Vui lòng thử lại sau.' });
    }
});

// POST /dang-nhap - Dang nhap tai khoan
router.post('/dang-nhap', loginLimiter, async (req, res) => {
    try {
        const { tenDangNhap, matKhau } = req.body;

        // Kiem tra cac truong bat buoc
        if (!tenDangNhap || !matKhau) {
            return res.status(400).json({
                thongBao: 'Vui lòng điền đầy đủ thông tin',
                chiTiet: {
                    tenDangNhap: !tenDangNhap ? 'Bắt buộc' : undefined,
                    matKhau: !matKhau ? 'Bắt buộc' : undefined
                }
            });
        }

        // Tim tai khoan
        const tenDangNhapClean = String(tenDangNhap).trim();
        const taiKhoan = await TaiKhoan.findOne({ tenDangNhap: tenDangNhapClean });

        if (!taiKhoan) {
            return res.status(401).json({ thongBao: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }

        // Kiem tra mat khau
        const matKhauDung = await taiKhoan.kiemTraMatKhau(matKhau);
        if (!matKhauDung) {
            return res.status(401).json({ thongBao: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }

        // Kiem tra tai khoan con hoat dong
        if (!taiKhoan.dangHoatDong) {
            return res.status(401).json({ thongBao: 'Tài khoản đã bị khóa' });
        }

        // Goi service neu co
        if (taiKhoanService?.dangNhap) {
            const ketQua = await taiKhoanService.dangNhap({
                tenDangNhap: tenDangNhapClean,
                matKhau: matKhau
            });

            return res.json({
                thongBao: 'Đăng nhập thành công',
                user: ketQua.taiKhoan,
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
            soDuVnd: taiKhoan.soDuVnd || 0,
            vaiTro: taiKhoan.vaiTro,
            referralCode: taiKhoan.referralCode || '',
            daLienKetDiscord: Boolean(taiKhoan.discordId && taiKhoan.discordId.trim()),
            discordTenHienThi: taiKhoan.discordTenHienThi || '',
            ngayTao: taiKhoan.ngayTao
        };

        res.json({
            thongBao: 'Đăng nhập thành công',
            user: thongTin,
            token: token
        });

    } catch (err) {
        console.error('Loi dang nhap:', err);
        res.status(500).json({ thongBao: 'Lỗi hệ thống. Vui lòng thử lại sau.' });
    }
});

// GET /thong-tin - Lay thong tin tai khoan hien tai
router.get('/thong-tin', xacThuc, async (req, res) => {
    try {
        // Da duoc xac thuc boi middleware
        if (!req.nguoiDung) {
            return res.status(401).json({ thongBao: 'Không lấy được thông tin tài khoản' });
        }

        const taiKhoan = req.nguoiDung;

        res.json({
            _id: taiKhoan._id,
            tenDangNhap: taiKhoan.tenDangNhap,
            email: taiKhoan.email,
            soDuVnd: taiKhoan.soDuVnd || 0,
            vaiTro: taiKhoan.vaiTro,
            referralCode: taiKhoan.referralCode || '',
            daLienKetDiscord: Boolean(taiKhoan.discordId && taiKhoan.discordId.trim()),
            discordTenHienThi: taiKhoan.discordTenHienThi || '',
            ngayTao: taiKhoan.ngayTao
        });

    } catch (err) {
        console.error('Loi lay thong tin:', err);
        res.status(500).json({ thongBao: 'Lỗi hệ thống. Vui lòng thử lại sau.' });
    }
});

// POST /lien-ket-discord - Lien ket tai khoan voi Discord
router.post('/lien-ket-discord', xacThuc, async (req, res) => {
    try {
        const { maDiscord, code, redirect_uri: requestRedirectUri } = req.body;
        const authCode = typeof code === 'string' && code.trim()
            ? code.trim()
            : (typeof maDiscord === 'string' ? maDiscord.trim() : '');

        if (!authCode) {
            return res.status(400).json({ thongBao: 'Vui lòng cung cấp mã xác thực Discord' });
        }

        // Client gui authorization code tu Discord OAuth
        // Can goi Discord API de lay thong tin user

        const {
            DISCORD_CLIENT_ID,
            DISCORD_CLIENT_SECRET,
            DISCORD_REDIRECT_URI,
            DISCORD_LINK_REDIRECT_URI
        } = process.env;

        if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
            return res.status(500).json({ thongBao: 'Chưa cấu hình Discord OAuth' });
        }

        let discordUserInfo = null;
        const redirectUri = resolveDiscordRedirectUri({
            requestRedirectUri,
            configuredRedirectUri: DISCORD_LINK_REDIRECT_URI || DISCORD_REDIRECT_URI
        });

        try {
            const tokenResponse = await axios.post('https://discord.com/api/oauth2/token',
                new URLSearchParams({
                    client_id: DISCORD_CLIENT_ID,
                    client_secret: DISCORD_CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    code: authCode,
                    redirect_uri: redirectUri
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
            return res.status(400).json({ thongBao: 'Mã xác thực không hợp lệ hoặc đã hết hạn' });
        }

        if (!discordUserInfo || !discordUserInfo.id) {
            return res.status(400).json({ thongBao: 'Không lấy được thông tin Discord' });
        }

        // Kiem tra Discord da duoc lien ket voi tai khoan khac chua
        const daCo = await TaiKhoan.findOne({
            discordId: discordUserInfo.id,
            _id: { $ne: req.nguoiDung._id }
        });

        if (daCo) {
            return res.status(400).json({
                thongBao: 'Discord này đã được liên kết với tài khoản khác'
            });
        }

        // Cap nhat thong tin lien ket Discord
        let taiKhoanCapNhat;

        if (taiKhoanService?.capNhatLienKetDiscord) {
            const ketQua = await taiKhoanService.capNhatLienKetDiscord(req.nguoiDung._id, {
                discordId: discordUserInfo.id,
                discordTenHienThi: discordUserInfo.username || discordUserInfo.global_name,
                vaiTro: isOwnerDiscordId(discordUserInfo.id) ? 'quan_tri' : undefined
            });
            taiKhoanCapNhat = ketQua.taiKhoan;
        } else {
            const updatePayload = {
                discordId: discordUserInfo.id,
                discordTenHienThi: discordUserInfo.username || discordUserInfo.global_name,
                discordDaLienKetLuc: new Date()
            };

            if (isOwnerDiscordId(discordUserInfo.id)) {
                updatePayload.vaiTro = 'quan_tri';
            }

            taiKhoanCapNhat = await TaiKhoan.findByIdAndUpdate(
                req.nguoiDung._id,
                updatePayload,
                { new: true }
            );
        }

        // SYNC: Đồng bộ sang User model (legacy) để bot hoạt động
        try {
            const User = require('../models/User');
            await User.findOneAndUpdate(
                { discordId: discordUserInfo.id },
                {
                    discordId: discordUserInfo.id,
                    discordUsername: discordUserInfo.username || discordUserInfo.global_name || 'Unknown',
                    taiKhoanId: req.nguoiDung._id.toString(), // Link to TaiKhoan
                    tenDangNhap: taiKhoanCapNhat.tenDangNhap,
                    balance: taiKhoanCapNhat.soDuVnd || 0,
                    joinedAt: new Date()
                },
                { upsert: true, new: true }
            );
            console.log(`[SYNC] Synced TaiKhoan → User for Discord ${discordUserInfo.id}`);
        } catch (syncErr) {
            console.warn('[SYNC] Failed to sync to User model:', syncErr.message);
            // Don't fail the request if sync fails
        }

        res.json({
            thongBao: 'Liên kết Discord thành công',
            daLienKetDiscord: true,
            discordTenHienThi: taiKhoanCapNhat.discordTenHienThi
        });

    } catch (err) {
        console.error('Loi lien ket Discord:', err);
        res.status(500).json({ thongBao: 'Lỗi hệ thống. Vui lòng thử lại sau.' });
    }
});

// GET /kiem-tra-discord - Kiem tra trang thai lien ket Discord
router.get('/kiem-tra-discord', xacThuc, async (req, res) => {
    try {
        const taiKhoan = req.nguoiDung;

        const daLienKet = Boolean(taiKhoan.discordId && taiKhoan.discordId.trim());

        res.json({
            daLienKet: daLienKet,
            daLienKetDiscord: daLienKet,
            discordId: daLienKet ? taiKhoan.discordId : null,
            discordTenHienThi: daLienKet ? taiKhoan.discordTenHienThi : null
        });

    } catch (err) {
        console.error('Loi kiem tra Discord:', err);
        res.status(500).json({ thongBao: 'Lỗi hệ thống. Vui lòng thử lại sau.' });
    }
});

// POST /huy-lien-ket-discord - Huy lien ket Discord
router.post('/huy-lien-ket-discord', xacThuc, async (req, res) => {
    try {
        const taiKhoan = req.nguoiDung;

        if (!taiKhoan.discordId) {
            return res.status(400).json({
                thongBao: 'Tài khoản chưa liên kết Discord'
            });
        }

        // Remove Discord link
        await TaiKhoan.findByIdAndUpdate(
            taiKhoan._id,
            {
                discordId: '',
                discordTenHienThi: '',
                discordDaLienKetLuc: null
            }
        );

        // SYNC: Also remove from User model
        try {
            await User.findOneAndUpdate(
                { discordId: taiKhoan.discordId },
                {
                    taiKhoanId: '',
                    tenDangNhap: ''
                }
            );
            console.log(`[SYNC] Removed link from User model for Discord ${taiKhoan.discordId}`);
        } catch (syncErr) {
            console.warn('[SYNC] Failed to unlink User model:', syncErr.message);
        }

        res.json({
            thongBao: 'Đã hủy liên kết Discord',
            daLienKetDiscord: false
        });

    } catch (err) {
        console.error('Loi huy lien ket Discord:', err);
        res.status(500).json({ thongBao: 'Lỗi hệ thống. Vui lòng thử lại sau.' });
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

        res.json({ thongBao: 'Đăng xuất thành công' });

    } catch (err) {
        console.error('Loi dang xuat:', err);
        res.json({ thongBao: 'Dang xuat thanhcong' });
    }
});

module.exports = router;
