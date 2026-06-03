const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const TaiKhoan = require('../models/TaiKhoan');
const WalletTransaction = require('../models/WalletTransaction');
const sepayService = require('../services/sepayService');
const dichVuGachThe = require('../services/dichVuGachThe');

const router = express.Router();

// ============ MIDDLEWARE ============

/**
 * Middleware xac thuc cho cac route vi
 * - Lay Bearer token tu Authorization header
 * - Verify JWT
 * - Tim TaiKhoan tu payload
 * - Kiem tra vaiTro
 * - Gan req.nguoiDung va req.userId
 */
async function xacThucViet(req, res, next) {
    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ thongBao: 'Server chua cau hinh xac thuc' });
    }

    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ thongBao: 'Vui long dang nhap de tiep tuc' });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
        return res.status(401).json({ thongBao: 'Vui long dang nhap de tiep tuc' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ thongBao: 'Token khong hop le hoac da het han' });
    }

    // Tim tai khoan theo _id trong payload
    const userId = decoded._id || decoded.userId;
    if (!userId) {
        return res.status(401).json({ thongBao: 'Token khong hop le' });
    }

    let taiKhoan;
    try {
        taiKhoan = await TaiKhoan.findById(userId);
    } catch (err) {
        return res.status(401).json({ thongBao: 'Tai khoan khong ton tai' });
    }

    if (!taiKhoan) {
        return res.status(401).json({ thongBao: 'Tai khoan khong ton tai' });
    }

    if (!taiKhoan.dangHoatDong) {
        return res.status(401).json({ thongBao: 'Tai khoan da bi khoa' });
    }

    if (!taiKhoan.vaiTro) {
        return res.status(401).json({ thongBao: 'Tai khoan khong co quyen truy cap' });
    }

    req.nguoiDung = taiKhoan;
    req.userId = taiKhoan._id;

    next();
}

/**
 * Middleware kiem tra quyen quan tri
 */
function yeuCauQuanTri(req, res, next) {
    if (!req.nguoiDung || req.nguoiDung.vaiTro !== 'quan_tri') {
        return res.status(403).json({ thongBao: 'Ban khong co quyen thuc hien hanh dong nay' });
    }
    next();
}

// ============ NAP TIEN - THONG TIN VI ============

// GET /vi/nap-tien/thong-tin - Lay thong tin vi (can xac thuc)
router.get('/nap-tien/thong-tin', xacThucViet, async (req, res) => {
    try {
        const taiKhoan = req.nguoiDung;

        const daLienKetDiscord = Boolean(taiKhoan.discordId && taiKhoan.discordId.trim());

        res.json({
            soDuVnd: taiKhoan.soDuVnd || 0,
            daLienKetDiscord: daLienKetDiscord,
            discordId: daLienKetDiscord ? taiKhoan.discordId : null,
            discordTenHienThi: daLienKetDiscord ? taiKhoan.discordTenHienThi : null
        });
    } catch (err) {
        console.error('Loi lay thong tin vi:', err);
        res.status(500).json({ thongBao: 'Loi he thong. Vui long thu lai sau.' });
    }
});

// ============ NAP TIEN - CHUYEN KHOAN ============

// POST /vi/nap-tien/chuyen-khoan/tao - Tao giao dich chuyen khoan (can xac thuc)
router.post('/nap-tien/chuyen-khoan/tao', xacThucViet, async (req, res) => {
    try {
        const { soTienVnd } = req.body;
        const userId = req.userId;
        const tenDangNhap = req.nguoiDung.tenDangNhap;

        if (!soTienVnd) {
            return res.status(400).json({ thongBao: 'Vui long nhap so tien can nap' });
        }

        const soTien = Number(soTienVnd);
        if (isNaN(soTien) || soTien < 10000) {
            return res.status(400).json({ thongBao: 'So tien nap toi thieu la 10,000 VND' });
        }

        const ketQua = await sepayService.taoMaNapTien({
            userId: userId,
            tenDangNhap: tenDangNhap,
            soTienVnd: soTien
        });

        if (!ketQua.thanhCong) {
            return res.status(400).json({ thongBao: ketQua.thongBao });
        }

        res.json({
            thanhCong: true,
            maGiaoDich: ketQua.maGiaoDich,
            soTien: ketQua.soTien,
            noiDungChuyenKhoan: ketQua.noiDungChuyenKhoan,
            qrCodeUrl: ketQua.qrCodeUrl || null,
            thongTinNganHang: ketQua.thongTinNganHang
        });
    } catch (err) {
        console.error('Loi tao giao dich chuyen khoan:', err);
        res.status(500).json({ thongBao: 'Loi he thong. Vui long thu lai sau.' });
    }
});

// GET /vi/nap-tien/chuyen-khoan/:maGiaoDich - Kiem tra trang thai chuyen khoan
router.get('/nap-tien/chuyen-khoan/:maGiaoDich', async (req, res) => {
    try {
        const { maGiaoDich } = req.params;

        if (!maGiaoDich) {
            return res.status(400).json({ thongBao: 'Ma giao dich khong hop le' });
        }

        const ketQua = await sepayService.layThongTinNapTien(maGiaoDich);

        if (!ketQua.thanhCong) {
            return res.status(404).json({ thongBao: ketQua.thongBao });
        }

        res.json({
            thanhCong: true,
            maGiaoDich: ketQua.maGiaoDich,
            soTien: ketQua.soTien,
            trangThai: ketQua.trangThai,
            phuongThuc: ketQua.phuongThuc,
            ngayTao: ketQua.ngayTao,
            ngayCapNhat: ketQua.ngayCapNhat,
            soDuVnd: ketQua.soDuVnd
        });
    } catch (err) {
        console.error('Loi kiem tra trang thai chuyen khoan:', err);
        res.status(500).json({ thongBao: 'Loi he thong. Vui long thu lai sau.' });
    }
});

// POST /vi/nap-tien/chuyen-khoan/webhook - SePay webhook handler
router.post('/nap-tien/chuyen-khoan/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        let payload;
        let signature = '';

        // Lay raw body cho viec xac thuc chu ky
        if (Buffer.isBuffer(req.body)) {
            try {
                payload = JSON.parse(req.body.toString());
            } catch (e) {
                return res.status(400).json({ thongBao: 'Du lieu khong hop le' });
            }
        } else {
            payload = req.body;
        }

        // Lay chu ky tu header
        signature = req.headers['x-sepay-signature'] || req.headers['sepay-signature'] || '';

        const ketQua = await sepayService.xuLyWebhook(payload, signature);

        if (!ketQua.thanhCong) {
            console.warn('SePay webhook that bai:', ketQua.thongBao);
            return res.status(400).json({ thongBao: ketQua.thongBao });
        }

        res.json({ thanhCong: true, thongBao: ketQua.thongBao });
    } catch (err) {
        console.error('Loi xu ly webhook SePay:', err);
        res.status(500).json({ thongBao: 'Loi he thong' });
    }
});

// ============ NAP TIEN - THE CAO ============

// POST /vi/nap-tien/the-cao - Nap tien bang the cao (can xac thuc)
router.post('/nap-tien/the-cao', xacThucViet, async (req, res) => {
    try {
        const { nhaMang, menhGia, serial, maThe } = req.body;
        const userId = req.userId;

        if (!nhaMang || !menhGia || !serial || !maThe) {
            return res.status(400).json({
                thongBao: 'Vui long dien day du thong tin the cao',
                chiTiet: {
                    nhaMang: !nhaMang ? 'Bat buoc' : undefined,
                    menhGia: !menhGia ? 'Bat buoc' : undefined,
                    serial: !serial ? 'Bat buoc' : undefined,
                    maThe: !maThe ? 'Bat buoc' : undefined
                }
            });
        }

        const ketQua = await dichVuGachThe.gachThe({
            userId: userId,
            nhaMang: nhaMang,
            menhGia: menhGia,
            serial: serial,
            maThe: maThe
        });

        if (!ketQua.thanhCong) {
            return res.status(400).json({
                thanhCong: false,
                thongBao: ketQua.thongBao,
                maGiaoDich: ketQua.maGiaoDich,
                soTien: ketQua.soTien
            });
        }

        res.json({
            thanhCong: true,
            thongBao: ketQua.thongBao,
            maGiaoDich: ketQua.maGiaoDich,
            soTien: ketQua.soTien
        });
    } catch (err) {
        console.error('Loi nap tien the cao:', err);
        res.status(500).json({ thongBao: 'Loi he thong. Vui long thu lai sau.' });
    }
});

// GET /vi/nap-tien/the-cao/:maGiaoDich/trang-thai - Kiem tra trang thai the cao
router.get('/nap-tien/the-cao/:maGiaoDich/trang-thai', async (req, res) => {
    try {
        const { maGiaoDich } = req.params;

        if (!maGiaoDich) {
            return res.status(400).json({ thongBao: 'Ma giao dich khong hop le' });
        }

        const ketQua = await dichVuGachThe.kiemTraTrangThai(maGiaoDich);

        if (!ketQua.thanhCong && ketQua.trangThai === 'not_found') {
            return res.status(404).json({
                thanhCong: false,
                thongBao: ketQua.thongBao
            });
        }

        res.json(ketQua);
    } catch (err) {
        console.error('Loi kiem tra trang thai the cao:', err);
        res.status(500).json({ thongBao: 'Loi he thong. Vui long thu lai sau.' });
    }
});

// GET /vi/nap-tien/the-cao/menh-gia - Lay danh sach menh gia ho tro
router.get('/nap-tien/the-cao/menh-gia', async (req, res) => {
    try {
        const ketQua = dichVuGachThe.layDanhSachMenhGia();
        res.json(ketQua);
    } catch (err) {
        console.error('Loi lay danh sach menh gia:', err);
        res.status(500).json({ thongBao: 'Loi he thong. Vui long thu lai sau.' });
    }
});

// ============ LICH SU GIAO DICH ============

// GET /vi/lich-su - Lay lich su giao dich vi (can xac thuc)
router.get('/lich-su', xacThucViet, async (req, res) => {
    try {
        const userId = req.userId;
        const userIdString = userId.toString();

        // Tim giao dich theo userId hoac discordId (ho tro backward compatibility)
        const giaoDich = await WalletTransaction.find({
            $or: [
                { userId: userId },
                { discordId: userIdString }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(80)
            .lean();

        res.json({
            giaoDich: giaoDich
        });
    } catch (err) {
        console.error('Loi lay lich su giao dich:', err);
        res.status(500).json({ thongBao: 'Loi he thong. Vui long thu lai sau.' });
    }
});

// ============ ADMIN ============

// GET /vi/admin/vi - Admin: lay danh sach giao dich cho xu ly (can xac thuc + quan_tri)
router.get('/admin/vi', xacThucViet, yeuCauQuanTri, async (req, res) => {
    try {
        // Lay cac giao dich pending (cho xu ly)
        const giaoDichCho = await WalletTransaction.find({
            status: 'pending'
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        // Lay cac giao dich gan day
        const giaoDichGanDay = await WalletTransaction.find({
            status: { $ne: 'pending' }
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.json({
            thanhCong: true,
            giaoDichCho: giaoDichCho,
            giaoDichGanDay: giaoDichGanDay
        });
    } catch (err) {
        console.error('Loi lay du lieu admin vi:', err);
        res.status(500).json({ thongBao: 'Loi he thong. Vui long thu lai sau.' });
    }
});

// POST /vi/admin/vi/cong-tien - Admin: cong tien vao vi (can xac thuc + quan_tri)
router.post('/admin/vi/cong-tien', xacThucViet, yeuCauQuanTri, async (req, res) => {
    try {
        const { taiKhoanId, soTienVnd, ghiChu } = req.body;

        if (!taiKhoanId || !soTienVnd) {
            return res.status(400).json({
                thongBao: 'Vui long dien day du thong tin',
                chiTiet: {
                    taiKhoanId: !taiKhoanId ? 'Bat buoc' : undefined,
                    soTienVnd: !soTienVnd ? 'Bat buoc' : undefined
                }
            });
        }

        const soTien = Number(soTienVnd);
        if (isNaN(soTien) || soTien <= 0) {
            return res.status(400).json({ thongBao: 'So tien khong hop le' });
        }

        // Tim tai khoan can cong tien
        const taiKhoan = await TaiKhoan.findById(taiKhoanId);
        if (!taiKhoan) {
            return res.status(404).json({ thongBao: 'Khong tim thay tai khoan' });
        }

        // Cong tien vao vi
        const taiKhoanCapNhat = await TaiKhoan.findByIdAndUpdate(
            taiKhoanId,
            { $inc: { soDuVnd: soTien } },
            { new: true }
        );

        // Tao giao dich wallet
        const giaoDich = new WalletTransaction({
            userId: taiKhoanId,
            discordId: taiKhoanId.toString(),
            discordUsername: taiKhoan.tenDangNhap || '',
            tenDangNhap: taiKhoan.tenDangNhap || '',
            type: 'topup',
            direction: 'credit',
            amountVnd: soTien,
            currency: 'VND',
            method: 'admin',
            status: 'completed',
            referenceCode: 'ADMIN_CONG_' + Date.now(),
            provider: 'admin',
            providerPaymentId: '',
            balanceAfterVnd: taiKhoanCapNhat.soDuVnd,
            adminNotes: ghiChu || 'Admin cong tien thu cong',
            reviewedBy: req.nguoiDung.tenDangNhap || req.nguoiDung._id.toString(),
            reviewedAt: new Date()
        });

        await giaoDich.save();

        res.json({
            thanhCong: true,
            thongBao: 'Cong tien thanh cong',
            soDuMoi: taiKhoanCapNhat.soDuVnd
        });
    } catch (err) {
        console.error('Loi cong tien admin:', err);
        res.status(500).json({ thongBao: 'Loi he thong. Vui long thu lai sau.' });
    }
});

// POST /vi/admin/vi/tru-tien - Admin: tru tien khoi vi (can xac thuc + quan_tri)
router.post('/admin/vi/tru-tien', xacThucViet, yeuCauQuanTri, async (req, res) => {
    try {
        const { taiKhoanId, soTienVnd, ghiChu } = req.body;

        if (!taiKhoanId || !soTienVnd) {
            return res.status(400).json({
                thongBao: 'Vui long dien day du thong tin',
                chiTiet: {
                    taiKhoanId: !taiKhoanId ? 'Bat buoc' : undefined,
                    soTienVnd: !soTienVnd ? 'Bat buoc' : undefined
                }
            });
        }

        const soTien = Number(soTienVnd);
        if (isNaN(soTien) || soTien <= 0) {
            return res.status(400).json({ thongBao: 'So tien khong hop le' });
        }

        // Tim tai khoan can tru tien
        const taiKhoan = await TaiKhoan.findById(taiKhoanId);
        if (!taiKhoan) {
            return res.status(404).json({ thongBao: 'Khong tim thay tai khoan' });
        }

        // Kiem tra so du du de tru
        if ((taiKhoan.soDuVnd || 0) < soTien) {
            return res.status(400).json({
                thongBao: 'So du khong du. So du hien tai: ' + (taiKhoan.soDuVnd || 0) + ' VND'
            });
        }

        // Tru tien khoi vi
        const taiKhoanCapNhat = await TaiKhoan.findByIdAndUpdate(
            taiKhoanId,
            { $inc: { soDuVnd: -soTien } },
            { new: true }
        );

        // Tao giao dich wallet
        const giaoDich = new WalletTransaction({
            userId: taiKhoanId,
            discordId: taiKhoanId.toString(),
            discordUsername: taiKhoan.tenDangNhap || '',
            tenDangNhap: taiKhoan.tenDangNhap || '',
            type: 'adjustment',
            direction: 'debit',
            amountVnd: soTien,
            currency: 'VND',
            method: 'admin',
            status: 'completed',
            referenceCode: 'ADMIN_TRU_' + Date.now(),
            provider: 'admin',
            providerPaymentId: '',
            balanceAfterVnd: taiKhoanCapNhat.soDuVnd,
            adminNotes: ghiChu || 'Admin tru tien thu cong',
            reviewedBy: req.nguoiDung.tenDangNhap || req.nguoiDung._id.toString(),
            reviewedAt: new Date()
        });

        await giaoDich.save();

        res.json({
            thanhCong: true,
            thongBao: 'Tru tien thanh cong',
            soDuMoi: taiKhoanCapNhat.soDuVnd
        });
    } catch (err) {
        console.error('Loi tru tien admin:', err);
        res.status(500).json({ thongBao: 'Loi he thong. Vui long thu lai sau.' });
    }
});

module.exports = router;
module.exports.xacThucViet = xacThucViet;
module.exports.yeuCauQuanTri = yeuCauQuanTri;
