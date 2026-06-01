const buildCashAppPaymentInstructions = (order, options = {}) => {
    const cashAppHandle = String(options.cashAppHandle || '').trim();
    return {
        type: 'cashapp',
        cashAppTag: cashAppHandle,
        cashtag: cashAppHandle,
        memoExpected: order?.memoExpected || String(order?.orderId || ''),
        paymentStatus: order?.paymentStatus || 'pending'
    };
};

module.exports = {
    buildCashAppPaymentInstructions
};
