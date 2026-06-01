const mongoose = require('mongoose');

const deviceFingerprintSchema = new mongoose.Schema({
    discordId: { type: String, required: true, index: true },
    fingerprintHash: { type: String, required: true, index: true },
    orderCount: { type: Number, default: 0 },
    firstOrderAt: { type: Date, default: null },
    referralGiven: { type: Boolean, default: false },
    flags: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

deviceFingerprintSchema.index({ discordId: 1, fingerprintHash: 1 }, { unique: true });

module.exports = mongoose.model('DeviceFingerprint', deviceFingerprintSchema);
