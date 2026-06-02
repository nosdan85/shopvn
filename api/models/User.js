const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    discordUsername: { type: String, required: true },

    // Lưu token OAuth để có thể auto-join server / migrate sang server mới
    accessToken: { type: String },
    refreshToken: { type: String },
    tokenExpiresAt: { type: Date }, // thời điểm hết hạn accessToken
    scopes: [{ type: String }],
    linkedActive: { type: Boolean, default: true, index: true },
    unlinkedAt: { type: Date, default: null },

    walletBalanceCents: { type: Number, default: 0, min: 0 },
    luckyWheelTickets: { type: Number, default: 0, min: 0 },
    luckyWheelFirstLinkAwardedAt: { type: Date, default: null },
    luckyWheelTicketsGrantedByAdmin: { type: Number, default: 0, min: 0 },

    linkToken: { type: String },
    linkTokenExpiresAt: { type: Date },

    cartItems: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, default: 1, min: 1 }
    }],
    cartUpdatedAt: { type: Date, default: null },
    ticketCreationLockUntil: { type: Date, default: null },

    referralCode: { type: String, default: '', trim: true, uppercase: true, index: true },
    referralAppliedCode: { type: String, default: '', trim: true, uppercase: true, index: true },
    referralAppliedAt: { type: Date, default: null },
    referralSelfCouponCode: { type: String, default: '', trim: true, uppercase: true },

    joinedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
