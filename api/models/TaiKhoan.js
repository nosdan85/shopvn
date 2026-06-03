const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { isOwnerDiscordId } = require('../utils/ownerAccess');

const taiKhoanSchema = new mongoose.Schema({
    tenDangNhap: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
        match: /^[a-zA-Z0-9_]+$/
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    matKhauHash: {
        type: String,
        required: true
    },
    // Renamed from soDuVi to soDuVnd for clarity (Vietnamese + currency unit)
    // amountVnd = amount in Vietnamese Dong (integer, not cents)
    soDuVnd: {
        type: Number,
        default: 0,
        min: 0
    },
    // Liên kết Discord
    discordId: {
        type: String,
        default: '',
        trim: true,
        index: true
    },
    discordTenHienThi: {
        type: String,
        default: '',
        trim: true
    },
    discordDaLienKetLuc: {
        type: Date,
        default: null
    },
    // Session / token
    refreshTokenHash: {
        type: String,
        default: ''
    },
    // Trạng thái
    dangHoatDong: {
        type: Boolean,
        default: true
    },
    vaiTro: {
        type: String,
        enum: ['khach_hang', 'quan_tri'],
        default: 'khach_hang'
    },
    // Thời gian
    ngayTao: {
        type: Date,
        default: Date.now
    },
    ngayCapNhat: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'tai_khoan'
});

// Hash mật khẩu trước khi lưu
taiKhoanSchema.pre('save', async function(next) {
    if (!this.isModified('matKhauHash')) return next();
    try {
        const salt = await bcrypt.genSalt(12);
        this.matKhauHash = await bcrypt.hash(this.matKhauHash, salt);
        return next();
    } catch (err) {
        return next(err);
    }
});

// So sánh mật khẩu
taiKhoanSchema.methods.kiemTraMatKhau = async function(matKhau) {
    return bcrypt.compare(matKhau, this.matKhauHash);
};

// Kiểm tra đã liên kết Discord chưa
taiKhoanSchema.methods.daLienKetDiscord = function() {
    return Boolean(this.discordId && this.discordId.trim());
};

// Kiểm tra có phải admin Discord không
taiKhoanSchema.methods.laAdminDiscord = function() {
    return isOwnerDiscordId(this.discordId);
};

// Auto-promote to admin nếu là admin Discord
taiKhoanSchema.pre('save', function(next) {
    if (this.laAdminDiscord() && this.vaiTro !== 'quan_tri') {
        this.vaiTro = 'quan_tri';
        console.log(`[AUTO_ADMIN] Promoted ${this.tenDangNhap} (${this.discordId}) to admin`);
    }
    next();
});

// Cập nhật ngày khi save
taiKhoanSchema.pre('save', function(next) {
    this.ngayCapNhat = new Date();
    next();
});

// Virtual field for backward compatibility: soDuVi → soDuVnd
taiKhoanSchema.virtual('soDuVi').get(function() {
    return this.soDuVnd;
}).set(function(value) {
    this.soDuVnd = value;
});

// Index
// discordId already indexed at field level
taiKhoanSchema.index({ email: 1 });
taiKhoanSchema.index({ discordId: 1 });
taiKhoanSchema.index({ tenDangNhap: 1 });

module.exports = mongoose.model('TaiKhoan', taiKhoanSchema);
