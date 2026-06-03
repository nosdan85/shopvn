const mongoose = require('mongoose');

/**
 * Giao dich vi - Ledger-based wallet transactions
 * Su dung don vi VND (integer, khong phai cents)
 */
const walletTransactionSchema = new mongoose.Schema({
    // ID tai khoan TaiKhoan (web account)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaiKhoan', default: null, index: true },
    // ID Discord (de ho tro backward compatibility)
    discordId: { type: String, default: '', index: true },
    // Ten dang nhap ho tro hien thi
    tenDangNhap: { type: String, default: '', trim: true },
    discordUsername: { type: String, default: '' },

    // Loai giao dich
    type: {
        type: String,
        enum: ['topup', 'purchase', 'refund', 'adjustment'],
        required: true,
        index: true
    },
    // Huong: credit (cong tien) / debit (tru tien)
    direction: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
    },
    // So tien VND (integer, khong phai cents)
    amountVnd: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'VND', trim: true },

    // Phuong thuc giao dich
    method: {
        type: String,
        enum: [
            // Nap tien
            'sepay_mb_bank',    // Chuyen khoan MB Bank qua SePay
            'gachthefast',       // Gach the cao (viettel/vina/mobifone)
            'admin',             // Admin cong tien thu cong
            // Thanh toan
            'wallet'             // Thanh toan bang vi (mua hang)
        ],
        required: true,
        index: true
    },

    // Trang thai giao dich
    status: {
        type: String,
        enum: ['pending', 'completed', 'rejected', 'cancelled'],
        default: 'pending',
        index: true
    },

    // Ma giao dich / noi dung chuyen khoan
    referenceCode: { type: String, default: '', trim: true, index: true },
    memoExpected: { type: String, default: '', trim: true },

    // Thong tin nha cung cap
    provider: { type: String, default: '', trim: true, index: true },
    providerPaymentId: { type: String, default: '', trim: true, index: true },

    // Thong tin the (neu la gach the)
    cardTelco: { type: String, default: '', trim: true },
    cardSerial: { type: String, default: '', trim: true },
    cardAmount: { type: Number, default: null },

    // Thong tin don hang (neu la purchase)
    orderId: { type: String, default: '', trim: true, index: true },
    orderCode: { type: String, default: '', trim: true },
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },

    // So du sau giao dich
    balanceAfterVnd: { type: Number, default: null },

    // Ghi chu admin
    adminNotes: { type: String, default: '', trim: true },
    reviewedBy: { type: String, default: '', trim: true },
    reviewedAt: { type: Date, default: null },

    // Hash de idempotent webhook
    webhookHash: { type: String, default: '', index: true }
}, { timestamps: true });

// Compound indexes cho query nhanh
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ status: 1, type: 1, createdAt: -1 });
walletTransactionSchema.index({ providerPaymentId: 1, status: 1 });

// Tao webhook hash de chan xu ly trung lap
walletTransactionSchema.pre('save', function(next) {
    if (this.providerPaymentId && this.status === 'completed') {
        this.webhookHash = this._createWebhookHash();
    }
    next();
});

walletTransactionSchema.methods._createWebhookHash = function() {
    const crypto = require('crypto');
    const data = `${this.providerPaymentId}:${this.referenceCode}:${this.amountVnd}`;
    return crypto.createHash('sha256').update(data).digest('hex');
};

// Chuyen doi amountVnd thanh string format VND
walletTransactionSchema.methods.formatAmount = function() {
    return `${(this.amountVnd || 0).toLocaleString('vi-VN')} VND`;
};

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);