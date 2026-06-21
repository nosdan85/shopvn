const test = require('node:test');
const assert = require('node:assert/strict');

const { buildOwnedOrdersQuery, resolveCheckoutAccountIdentity } = require('../utils/orderOwnership');

test('owned order history includes current user id and legacy Discord-linked orders', () => {
    assert.deepEqual(
        buildOwnedOrdersQuery({ userId: 'account-1', discordId: '1146730730060271736' }),
        {
            $or: [
                { userId: 'account-1' },
                { discordId: '1146730730060271736' }
            ]
        }
    );
});

test('owned order history never queries an empty Discord id', () => {
    assert.deepEqual(
        buildOwnedOrdersQuery({ userId: 'account-1', discordId: '   ' }),
        { userId: 'account-1' }
    );
});

test('checkout falls back to the linked website account Discord identity', () => {
    assert.deepEqual(resolveCheckoutAccountIdentity({
        tokenDiscordId: '',
        taiKhoan: {
            _id: 'account-1',
            tenDangNhap: 'buyer',
            discordId: '1146730730060271736',
            discordTenHienThi: 'Buyer Display'
        }
    }), {
        userId: 'account-1',
        tenDangNhap: 'buyer',
        discordId: '1146730730060271736',
        discordTenHienThi: 'Buyer Display'
    });
});
