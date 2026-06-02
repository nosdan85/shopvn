const mongoose = require('mongoose');

const generatedCouponSchema = new mongoose.Schema({
    couponCode: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    discountPercent: { type: Number, required: true, min: 1, max: 100 },
    discordId: { type: String, default: '', trim: true, index: true },
    source: { type: String, default: 'lucky_wheel', trim: true },
    status: { type: String, enum: ['unused', 'used', 'replaced'], default: 'unused', index: true },
    usedOrderId: { type: String, default: '', trim: true },
    usedAt: { type: Date, default: null },
    replacedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('GeneratedCoupon', generatedCouponSchema);
