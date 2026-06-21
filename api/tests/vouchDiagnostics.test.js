const test = require('node:test');
const assert = require('node:assert/strict');

const {
    describeVouchFailure,
    formatVouchFailureReply,
    getVouchChannelPermissionFailure
} = require('../utils/vouchDiagnostics');

test('Discord missing permissions error is translated into an actionable vouch reason', () => {
    const failure = describeVouchFailure(Object.assign(new Error('Missing Permissions'), {
        code: 50013
    }), {
        stage: 'channel_fetch',
        vouchChannelId: '1403791430396285089'
    });

    assert.deepEqual(failure, {
        code: 'MISSING_PERMISSIONS',
        stage: 'channel_fetch',
        reason: 'Bot khong co du quyen tren kenh vouch.',
        discordCode: '50013',
        vouchChannelId: '1403791430396285089'
    });
});

test('vouch reply includes diagnostic code, reason, stage and target channel', () => {
    const reply = formatVouchFailureReply({
        code: 'CHANNEL_NOT_FOUND',
        stage: 'channel_fetch',
        reason: 'Bot khong tim thay kenh vouch.',
        discordCode: '10003',
        vouchChannelId: '1403791430396285089'
    });

    assert.match(reply, /CHANNEL_NOT_FOUND/);
    assert.match(reply, /channel_fetch/);
    assert.match(reply, /1403791430396285089/);
    assert.match(reply, /10003/);
});

test('channel permission diagnostics distinguish missing view and send permissions', () => {
    assert.deepEqual(
        getVouchChannelPermissionFailure({ canView: false, canSend: false }),
        { code: 'MISSING_VIEW_CHANNEL', reason: 'Bot khong co quyen View Channel tren kenh vouch.' }
    );
    assert.deepEqual(
        getVouchChannelPermissionFailure({ canView: true, canSend: false }),
        { code: 'MISSING_SEND_MESSAGES', reason: 'Bot khong co quyen Send Messages tren kenh vouch.' }
    );
    assert.equal(getVouchChannelPermissionFailure({ canView: true, canSend: true }), null);
});
