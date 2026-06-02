const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    referrerDiscordId: { type: String, required: true, index: true },
    refereeDiscordId: { type: String, required: true, index: true },
    refereeFingerprintHash: { type: String, required: true },
    refereeFirstOrderId: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'rewarded', 'flagged'], default: 'pending', index: true },
    rewardCouponCode: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

referralSchema.index({ referrerDiscordId: 1, refereeDiscordId: 1 }, { unique: true });

module.exports = mongoose.model('Referral', referralSchema);
