/**
 * Dich Vu Gach The - Tich hop gachthefast.com cho nap tien bang the cao
 */
const axios = require('axios');
const crypto = require('crypto');

const TaiKhoan = require('../models/TaiKhoan');
const WalletTransaction = require('../models/WalletTransaction');

// Cau hinh gachthefast
const GACHTHEFAST_API_URL = process.env.GACHTHEFAST_API_URL || 'https://api.gachthefast.com';
const GACHTHEFAST_PARTNER_ID = process.env.GACHTHEFAST_PARTNER_ID || '';
const GACHTHEFAST_API_KEY = process.env.GACHTHEFAST_API_KEY || '';

// Cac nha mang ho tro
const DANH_SACH_NHA_MANG = ['viettel', 'vina', 'mobifone'];

// Cac menh gia ho tro (VND)
const DANH_SACH_MENH_GIA = [10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000, 1000000];

/**
 * Map ma loi tu nha cung cap sang thong bao Tieng Viet
 * @param {string|number} maLoi - Ma loi tu provider
 * @returns {string} Thong bao tieng Viet
 */
function mapLoiNhaCungCap(maLoi) {
    const banThichDien = String(maLoi).toLowerCase().trim();

    const bangMap = {
        '1': 'Gạch thẻ thành công',
        'success': 'Gạch thẻ thành công',
        '2': 'Mã thẻ không hợp lệ',
        'invalid_card': 'Mã thẻ không hợp lệ',
        '3': 'Thẻ đã được sử dụng',
        'used_card': 'Thẻ đã được sử dụng',
        '4': 'Sai mệnh giá thẻ',
        'wrong_value': 'Sai mệnh giá thẻ',
        '5': 'Sai nhà mạng',
        'wrong_telco': 'Sai nhà mạng',
        '6': 'Lỗi hệ thống nhà cung cấp',
        'system_error': 'Lỗi hệ thống nhà cung cấp',
        '7': 'Thẻ đang được xử lý, vui lòng chờ',
        'timeout': 'Thẻ đang được xử lý, vui lòng chờ',
        '99': 'Hệ thống đang bảo trì',
        'maintenance': 'Hệ thống đang bảo trì'
    };

    return bangMap[banThichDien] || 'Lỗi không xác định';
}

/**
 * Lay danh sach menh gia ho tro
 * @returns {Object}
 */
function layDanhSachMenhGia() {
    return {
        nhaMang: DANH_SACH_NHA_MANG,
        menhGia: DANH_SACH_MENH_GIA
    };
}

/**
 * Validate thong tin the
 * @param {Object} params
 * @returns {Object} { hopLe: boolean, thongBao: string }
 */
function validateThe({ nhaMang, menhGia, serial, maThe }) {
    // Validate nha mang
    if (!nhaMang || !DANH_SACH_NHA_MANG.includes(nhaMang.toLowerCase())) {
        return {
            hopLe: false,
            thongBao: 'Nhà mạng không hợp lệ. Chỉ chấp nhận: viettel, vina, mobifone'
        };
    }

    // Validate menh gia
    const menhGiaSo = parseInt(menhGia, 10);
    if (isNaN(menhGiaSo) || !DANH_SACH_MENH_GIA.includes(menhGiaSo)) {
        return {
            hopLe: false,
            thongBao: 'Mệnh giá không hợp lệ. Các mệnh giá hỗ trợ: ' + DANH_SACH_MENH_GIA.join(', ')
        };
    }

    // Validate serial
    if (!serial || typeof serial !== 'string') {
        return {
            hopLe: false,
            thongBao: 'Serial thẻ không được để trống'
        };
    }
    const serialClean = serial.replace(/\s/g, '');
    if (serialClean.length < 10 || serialClean.length > 20) {
        return {
            hopLe: false,
            thongBao: 'Serial thẻ phải có độ dài 10-20 ký tự'
        };
    }
    if (!/^[a-zA-Z0-9]+$/.test(serialClean)) {
        return {
            hopLe: false,
            thongBao: 'Serial thẻ chỉ được chứa chữ cái và số'
        };
    }

    // Validate ma the
    if (!maThe || typeof maThe !== 'string') {
        return {
            hopLe: false,
            thongBao: 'Mã thẻ không được để trống'
        };
    }
    const maTheClean = maThe.replace(/\s/g, '');
    if (maTheClean.length < 10 || maTheClean.length > 20) {
        return {
            hopLe: false,
            thongBao: 'Mã thẻ phải có độ dài 10-20 ký tự'
        };
    }
    if (!/^[a-zA-Z0-9]+$/.test(maTheClean)) {
        return {
            hopLe: false,
            thongBao: 'Mã thẻ chỉ được chứa chữ cái và số'
        };
    }

    return { hopLe: true, thongBao: '' };
}

/**
 * Tao chu ky API cho gachthefast
 * @param {string} data - Du lieu can ky
 * @returns {string}
 */
function taoChuKyApi(data) {
    if (!GACHTHEFAST_API_KEY) {
        return '';
    }
    return crypto
        .createHmac('sha256', GACHTHEFAST_API_KEY)
        .update(data)
        .digest('hex');
}

/**
 * Nap tien bang the cao
 * @param {Object} params
 * @param {string} params.userId - ID tai khoan
 * @param {string} params.nhaMang - Nha mang (viettel, vina, mobifone)
 * @param {number} params.menhGia - Menh gia the
 * @param {string} params.serial - Serial the
 * @param {string} params.maThe - Ma the
 * @returns {Promise<Object>}
 */
async function gachThe({ userId, nhaMang, menhGia, serial, maThe }) {
    // Validate userId
    let taiKhoan;
    try {
        taiKhoan = await TaiKhoan.findById(userId);
    } catch (err) {
        return {
            thanhCong: false,
            thongBao: 'ID tài khoản không hợp lệ',
            maGiaoDich: '',
            soTien: 0
        };
    }

    if (!taiKhoan) {
        return {
            thanhCong: false,
            thongBao: 'Không tìm thấy tài khoản',
            maGiaoDich: '',
            soTien: 0
        };
    }

    // Validate thong tin the
    const ValidationResult = validateThe({ nhaMang, menhGia, serial, maThe });
    if (!ValidationResult.hopLe) {
        return {
            thanhCong: false,
            thongBao: ValidationResult.thongBao,
            maGiaoDich: '',
            soTien: 0
        };
    }

    const nhaMangChuan = nhaMang.toLowerCase();
    const menhGiaSo = parseInt(menhGia, 10);
    const serialClean = serial.replace(/\s/g, '').toUpperCase();
    const maTheClean = maThe.replace(/\s/g, '').toUpperCase();

    // Tao ma giao dich ngau nhien
    const maNgauNhien = crypto.randomBytes(4).toString('uppercase')
        .replace(/[^A-Z0-9]/g, () => '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[crypto.randomInt(36)]);
    const maGiaoDich = `GT${maNgauNhien}`;

    // Tao giao dich pending trong database
    const giaoDich = new WalletTransaction({
        discordId: taiKhoan._id.toString(),
        discordUsername: taiKhoan.tenDangNhap,
        type: 'topup',
        direction: 'credit',
        amountCents: menhGiaSo,
        currency: 'VND',
        method: 'gachthefast',
        status: 'pending',
        referenceCode: maGiaoDich,
        provider: 'gachthefast',
        providerPaymentId: '',
        txnId: '',
        memoExpected: `The:${nhaMangChuan}|${menhGiaSo}`
    });

    await giaoDich.save();

    // Kiem tra cau hinh API
    if (!GACHTHEFAST_API_URL || !GACHTHEFAST_PARTNER_ID) {
        // Tra ve loi neu chua cau hinh
        giaoDich.status = 'rejected';
        giaoDich.adminNotes = 'Chưa cấu hình gachthefast';
        await giaoDich.save();

        return {
            thanhCong: false,
            thongBao: 'Dịch vụ gạch thẻ đang bảo trì',
            maGiaoDich: maGiaoDich,
            soTien: menhGiaSo
        };
    }

    try {
        // Gui yeu cau den gachthefast
        const duLieuApi = {
            partner_id: GACHTHEFAST_PARTNER_ID,
            telco: nhaMangChuan,
            amount: menhGiaSo,
            serial: serialClean,
            pin: maTheClean,
            request_id: maGiaoDich
        };

        const chuKy = taoChuKyApi(JSON.stringify(duLieuApi));

        const response = await axios.post(
            `${GACHTHEFAST_API_URL}/charge`,
            duLieuApi,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': chuKy
                },
                timeout: 30000
            }
        );

        const data = response.data;
        const maLoi = data?.code || data?.error_code || data?.status || '0';
        const trangThaiProvider = data?.success || data?.status === 'success' || false;

        // Map loi va cap nhat trang thai
        if (trangThaiProvider || maLoi === '1' || maLoi === 'success') {
            // Thanh cong - tien ngay vao vi
            const updatedTaiKhoan = await TaiKhoan.findOneAndUpdate(
                {
                    _id: taiKhoan._id,
                    soDuVi: { $gte: 0 }
                },
                {
                    $inc: { soDuVi: menhGiaSo }
                },
                { new: true }
            );

            if (!updatedTaiKhoan) {
                giaoDich.status = 'rejected';
                giaoDich.adminNotes = 'Lỗi cộng tiền vào ví';
                await giaoDich.save();

                return {
                    thanhCong: false,
                    thongBao: 'Lỗi cộng tiền vào ví',
                    maGiaoDich: maGiaoDich,
                    soTien: menhGiaSo
                };
            }

            giaoDich.status = 'completed';
            giaoDich.providerPaymentId = data?.trans_id || data?.transaction_id || maGiaoDich;
            giaoDich.txnId = data?.trans_id || data?.transaction_id || maGiaoDich;
            giaoDich.balanceAfterCents = updatedTaiKhoan.soDuVi;
            giaoDich.reviewedAt = new Date();
            giaoDich.reviewedBy = 'gachthefast_auto';

            await giaoDich.save();

            return {
                thanhCong: true,
                thongBao: mapLoiNhaCungCap('1'),
                maGiaoDich: maGiaoDich,
                soTien: menhGiaSo
            };

        } else if (maLoi === '7' || maLoi === 'timeout') {
            // Dang xu ly - tra ve trang thai pending
            giaoDich.providerPaymentId = data?.trans_id || data?.transaction_id || '';
            giaoDich.adminNotes = 'Cho xu ly';
            await giaoDich.save();

            return {
                thanhCong: true,
                thongBao: mapLoiNhaCungCap(maLoi),
                maGiaoDich: maGiaoDich,
                soTien: menhGiaSo
            };

        } else {
            // Loi - that bai
            giaoDich.status = 'rejected';
            giaoDich.providerPaymentId = data?.trans_id || data?.transaction_id || '';
            giaoDich.adminNotes = mapLoiNhaCungCap(maLoi);
            giaoDich.reviewedAt = new Date();
            giaoDich.reviewedBy = 'gachthefast_auto';

            await giaoDich.save();

            return {
                thanhCong: false,
                thongBao: mapLoiNhaCungCap(maLoi),
                maGiaoDich: maGiaoDich,
                soTien: menhGiaSo
            };
        }

    } catch (err) {
        // Loi ket noi hoac loi he thong
        const maLoi = err.response?.data?.code || err.response?.data?.error_code || '6';

        giaoDich.status = 'rejected';
        giaoDich.adminNotes = 'Lỗi kết nối: ' + (err.message || mapLoiNhaCungCap(maLoi));
        giaoDich.reviewedAt = new Date();
        giaoDich.reviewedBy = 'gachthefast_error';

        await giaoDich.save();

        return {
            thanhCong: false,
            thongBao: mapLoiNhaCungCap(maLoi),
            maGiaoDich: maGiaoDich,
            soTien: menhGiaSo
        };
    }
}

/**
 * Kiem tra trang thai giao dich the
 * @param {string} maGiaoDich - Ma giao dich
 * @returns {Promise<Object>}
 */
async function kiemTraTrangThai(maGiaoDich) {
    // Tim giao dich trong database
    const giaoDich = await WalletTransaction.findOne({
        referenceCode: maGiaoDich
    });

    if (!giaoDich) {
        return {
            thanhCong: false,
            thongBao: 'Không tìm thấy giao dịch',
            trangThai: 'not_found',
            soTien: 0
        };
    }

    // Neu da hoan thanh thi tra ve ket qua
    if (giaoDich.status === 'completed') {
        return {
            thanhCong: true,
            thongBao: 'Giao dịch đã hoàn thành',
            trangThai: 'completed',
            soTien: giaoDich.amountCents,
            soDuVi: giaoDich.balanceAfterCents || 0
        };
    }

    // Neu bi huy thi tra ve ket qua
    if (giaoDich.status === 'rejected' || giaoDich.status === 'cancelled') {
        return {
            thanhCong: false,
            thongBao: giaoDich.adminNotes || 'Giao dịch bị từ chối',
            trangThai: giaoDich.status,
            soTien: giaoDich.amountCents
        };
    }

    // Neu van dang cho xu ly, kiem tra voi provider
    if (!GACHTHEFAST_API_URL || !GACHTHEFAST_PARTNER_ID || !giaoDich.providerPaymentId) {
        return {
            thanhCong: true,
            thongBao: 'Đang chờ xử lý',
            trangThai: 'pending',
            soTien: giaoDich.amountCents
        };
    }

    try {
        // Kiem tra trang thai voi provider
        const duLieuApi = {
            partner_id: GACHTHEFAST_PARTNER_ID,
            trans_id: giaoDich.providerPaymentId
        };

        const chuKy = taoChuKyApi(JSON.stringify(duLieuApi));

        const response = await axios.post(
            `${GACHTHEFAST_API_URL}/check`,
            duLieuApi,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': chuKy
                },
                timeout: 15000
            }
        );

        const data = response.data;
        const maLoi = data?.code || data?.status || '0';
        const trangThaiProvider = data?.success || data?.status === 'success' || false;

        if (trangThaiProvider || maLoi === '1' || maLoi === 'success') {
            // Thanh cong - tien ngay vao vi
            const updatedTaiKhoan = await TaiKhoan.findOneAndUpdate(
                {
                    _id: giaoDich.discordId,
                    soDuVi: { $gte: 0 }
                },
                {
                    $inc: { soDuVi: giaoDich.amountCents }
                },
                { new: true }
            );

            if (!updatedTaiKhoan) {
                return {
                    thanhCong: true,
                    thongBao: 'Đang chờ xử lý',
                    trangThai: 'pending',
                    soTien: giaoDich.amountCents
                };
            }

            giaoDich.status = 'completed';
            giaoDich.balanceAfterCents = updatedTaiKhoan.soDuVi;
            giaoDich.reviewedAt = new Date();
            giaoDich.reviewedBy = 'gachthefast_check';

            await giaoDich.save();

            return {
                thanhCong: true,
                thongBao: mapLoiNhaCungCap('1'),
                trangThai: 'completed',
                soTien: giaoDich.amountCents,
                soDuVi: updatedTaiKhoan.soDuVi
            };

        } else if (maLoi === '7' || maLoi === 'timeout') {
            // Van dang xu ly
            return {
                thanhCong: true,
                thongBao: mapLoiNhaCungCap(maLoi),
                trangThai: 'pending',
                soTien: giaoDich.amountCents
            };

        } else {
            // That bai
            giaoDich.status = 'rejected';
            giaoDich.adminNotes = mapLoiNhaCungCap(maLoi);
            giaoDich.reviewedAt = new Date();
            giaoDich.reviewedBy = 'gachthefast_check';

            await giaoDich.save();

            return {
                thanhCong: false,
                thongBao: mapLoiNhaCungCap(maLoi),
                trangThai: 'rejected',
                soTien: giaoDich.amountCents
            };
        }

    } catch (err) {
        // Loi ket noi - giu nguyen trang thai
        return {
            thanhCong: true,
            thongBao: 'Đang chờ xử lý',
            trangThai: 'pending',
            soTien: giaoDich.amountCents
        };
    }
}

module.exports = {
    gachThe,
    kiemTraTrangThai,
    mapLoiNhaCungCap,
    layDanhSachMenhGia,
    validateThe
};