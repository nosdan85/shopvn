const mongoose = require('mongoose');

/**
 * Don hang - Refactored for Vietnamese shop
 * Thanh toan bang vi VNĐ, khong co lich giao hang, khong co PayPal/LTC/CashApp
 */
const orderSchema = new mongoose.Schema({
    // Ma don hang (hien thi)
    orderId: { type: String, unique: true, index: true },

    // === TAI KHOAN WEB ===
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaiKhoan', default: null, index: true },
    tenDangNhap: { type: String, default: '', trim: true, index: true },

    // === DISCORD (bat buoc de tao ticket, co the chua co luc dat hang) ===
    discordId: { type: String, default: '', trim: true, index: true },
    discordTenHienThi: { type: String, default: '', trim: true },
    discordDaLienKet: { type: Boolean, default: false },
    discordDaJoinServer: { type: Boolean, default: false },

    // === THONG TIN ROBLOX ===
    robloxUserId: { type: String, default: '', trim: true, index: true },
    robloxUsername: { type: String, default: '', trim: true },
    robloxDisplayName: { type: String, default: '', trim: true },
    robloxDaXacThuc: { type: Boolean, default: false, index: true },
    robloxXacThucLuc: { type: Date, default: null },

    // === SAN PHAM ===
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        quantity: Number,
        packQuantity: { type: Number, default: 1 },
        price: Number,        // Don gia ban dau
        priceVnd: Number,     // Don gia VND
        lineTotalVnd: Number  // Tong dong VND
    }],
    products: { type: [mongoose.Schema.Types.Mixed], default: [] },

    // === GIA & GIAM GIA (VND) ===
    subtotalVnd: { type: Number, default: 0 },
    discountVnd: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    couponDiscountPercent: { type: Number, default: 0 },
    referralCode: { type: String, default: '', trim: true, uppercase: true, index: true },
    referralDiscountPercent: { type: Number, default: 0 },
    // Cac field cu giu lai nhung se khong con su dung trong luong moi
    subtotalAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // === THANH TOAN (chi con vi) ===
    paymentMethod: { type: String, default: 'wallet', enum: ['wallet'] },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'cancelled', 'refunded'],
        default: 'pending',
        index: true
    },
    paidAt: { type: Date, default: null },
    txnId: { type: String, default: '', trim: true, index: true },

    // === TRANG THAI DON HANG ===
    status: {
        type: String,
        enum: ['cho_xu_ly', 'da_thanh_toan', 'da_tao_ticket', 'dang_giao', 'hoan_thanh', 'huy'],
        default: 'cho_xu_ly',
        index: true
    },

    // === TICKET DISCORD ===
    // Yeu cau tao ticket: can discordId + discordDaLienKet + discordDaJoinServer
    channelId: { type: String, default: '' },
    channelName: { type: String, default: '' },
    ticketStatus: {
        type: String,
        enum: ['chua_yeu_cau', 'dang_tao', 'da_tao', 'that_bai', 'dong'],
        default: 'chua_yeu_cau',
        index: true
    },
    ticketLockUntil: { type: Date, default: null },
    ticketError: { type: String, default: '' },
    ticketTaoLuc: { type: Date, default: null },

    // === GIAO HANG (don gian, khong co lich giao) ===
    deliveredAt: { type: Date, default: null },
    deliveryNote: { type: String, default: '', trim: true },

    // === THONG TIN LIEN HE ===
    customerEmail: { type: String, default: '', trim: true, lowercase: true },

    // === REWARD (co the giu lai neu can) ===
    newUserRewardSent: { type: Boolean, default: false },
    referralRewardSent: { type: Boolean, default: false },
    referredByDiscordId: { type: String, default: '', trim: true, index: true },

    // === ANTI-ABUSE ===
    clientIp: { type: String, default: '', index: true }
}, { timestamps: true });

// === INDEXES ===
orderSchema.index({ createdAt: -1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, paymentStatus: 1, createdAt: -1 });
orderSchema.index({ discordId: 1, ticketStatus: 1 });
// referralCode already indexed at field level

// Performance indexes
orderSchema.index({ discordId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });

// Sync cac field cu sang gia tri moi (backward compatibility)
orderSchema.pre('validate', function syncPaymentAliases(next) {
    // Neu co totalAmount (USD cu) thi tinh lai subtotalAmount/total (convert hoac giu nguyen)
    if (!Number.isFinite(Number(this.subtotalVnd)) || Number(this.subtotalVnd) <= 0) {
        this.subtotalVnd = this.subtotalAmount || this.total || this.totalAmount || 0;
    }
    if (!Array.isArray(this.products) || this.products.length === 0) {
        this.products = Array.isArray(this.items)
            ? this.items.map((item) => ({
                product: item.product,
                name: item.name,
                quantity: item.quantity,
                packQuantity: item.packQuantity,
                price: item.price
            }))
            : [];
    }
    // Sync trang thai
    if (this.status === 'hoan_thanh') this.paymentStatus = 'paid';
    if (this.status === 'huy') this.paymentStatus = 'cancelled';
    if (this.paymentStatus === 'paid') this.status = 'da_thanh_toan';
    if (this.paymentStatus === 'cancelled') this.status = 'huy';
    if (this.paymentStatus === 'refunded') this.status = 'huy';
    next();
});

// Format tien VND
orderSchema.methods.formatTotal = function() {
    return `${(this.totalVnd || 0).toLocaleString('vi-VN')} VND`;
};

// Kiem tra co the tao ticket khong
orderSchema.methods.coTheTaoTicket = function() {
    return (
        this.paymentStatus === 'paid' &&
        Boolean(this.discordId && this.discordId.trim()) &&
        this.discordDaLienKet === true &&
        this.discordDaJoinServer === true
    );
};

module.exports = mongoose.model('Order', orderSchema);
