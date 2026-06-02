const mongoose = require('mongoose');

const visitorNoticeSchema = new mongoose.Schema({
    ipHash: { type: String, required: true, unique: true, index: true },
    firstSeenAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('VisitorNotice', visitorNoticeSchema);
