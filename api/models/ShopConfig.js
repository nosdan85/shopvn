const mongoose = require('mongoose');

const shopConfigSchema = new mongoose.Schema({
    _id: { type: String, default: 'singleton' },
    banners: [{ type: String }],
    bestSellerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    featuredProductIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    luckyWheel: {
        enabled: { type: Boolean, default: false },
        title: { type: String, default: 'Lucky Wheel Event' },
        message: { type: String, default: 'We are running a limited lucky wheel event.' },
        slices: [{
            label: { type: String, default: '' },
            type: { type: String, enum: ['empty', 'discount'], default: 'empty' },
            discountPercent: { type: Number, default: 0 }
        }]
    }
}, { timestamps: true });

shopConfigSchema.statics.getConfig = async function () {
    let config = await this.findById('singleton');
    if (!config) {
        config = await this.create({ _id: 'singleton', banners: [], bestSellerIds: [], featuredProductIds: [] });
    }
    return config;
};

module.exports = mongoose.model('ShopConfig', shopConfigSchema);
