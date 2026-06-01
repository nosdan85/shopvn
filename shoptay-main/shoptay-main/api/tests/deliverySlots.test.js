const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildPublicDeliverySlotQuery,
    buildSelectableDeliverySlotQuery,
    buildHourlyChoicePoints,
    isFutureDeliverySlotRange,
    isValidLocalHourTime,
    normalizeDeliverySlotId,
    parseLocalDateTimeInZone,
    resolveSelectedDeliveryWindow,
    splitSlotForTimezone
} = require('../utils/deliverySlots');

test('parseLocalDateTimeInZone interprets Vietnam admin time independently of server timezone', () => {
    const parsed = parseLocalDateTimeInZone('2026-05-25', '08:00', 'Asia/Ho_Chi_Minh');

    assert.equal(parsed.toISOString(), '2026-05-25T01:00:00.000Z');
});

test('buildPublicDeliverySlotQuery returns all active future slots without owner filtering', () => {
    const now = new Date('2026-05-24T12:00:00.000Z');
    const query = buildPublicDeliverySlotQuery(now);

    assert.deepEqual(query, {
        active: true,
        endAt: { $gte: now }
    });
    assert.equal(Object.hasOwn(query, 'ownerDiscordId'), false);
});

test('isValidLocalHourTime accepts only whole-hour admin slot boundaries', () => {
    assert.equal(isValidLocalHourTime('00:00', { allowMidnightEnd: true }), true);
    assert.equal(isValidLocalHourTime('24:00', { allowMidnightEnd: true }), true);
    assert.equal(isValidLocalHourTime('24:00'), false);
    assert.equal(isValidLocalHourTime('23:00'), true);
    assert.equal(isValidLocalHourTime('23:30'), false);
    assert.equal(isValidLocalHourTime('25:00', { allowMidnightEnd: true }), false);
});

test('buildSelectableDeliverySlotQuery only allows active future slots without owner filtering', () => {
    const now = new Date('2026-05-24T12:00:00.000Z');
    const query = buildSelectableDeliverySlotQuery('507f1f77bcf86cd799439011', now);

    assert.deepEqual(query, {
        _id: '507f1f77bcf86cd799439011',
        active: true,
        endAt: { $gte: now }
    });
    assert.equal(Object.hasOwn(query, 'ownerDiscordId'), false);
});

test('isFutureDeliverySlotRange rejects slots whose end time has already passed', () => {
    const now = new Date('2026-05-24T16:45:00.000Z');

    assert.equal(isFutureDeliverySlotRange({
        startAt: new Date('2026-05-24T02:00:00.000Z'),
        endAt: new Date('2026-05-24T03:00:00.000Z')
    }, now), false);
    assert.equal(isFutureDeliverySlotRange({
        startAt: new Date('2026-05-24T17:00:00.000Z'),
        endAt: new Date('2026-05-24T18:00:00.000Z')
    }, now), true);
});

test('normalizeDeliverySlotId accepts customer segment ids from the calendar UI', () => {
    const slotId = '507f1f77bcf86cd799439011';

    assert.equal(normalizeDeliverySlotId(`${slotId}:2026-05-25:1`), slotId);
    assert.equal(normalizeDeliverySlotId(slotId), slotId);
    assert.equal(normalizeDeliverySlotId('not-a-slot:2026-05-25:1'), '');
});

test('buildHourlyChoicePoints exposes each selectable hour including the segment end', () => {
    const points = buildHourlyChoicePoints({
        startAt: new Date('2026-05-25T15:00:00.000Z'),
        endAt: new Date('2026-05-25T17:00:00.000Z')
    });

    assert.deepEqual(points, [
        '2026-05-25T15:00:00.000Z',
        '2026-05-25T16:00:00.000Z',
        '2026-05-25T17:00:00.000Z'
    ]);
});

test('resolveSelectedDeliveryWindow requires two selectable points inside the segment', () => {
    const result = resolveSelectedDeliveryWindow({
        segmentStartAt: '2026-05-25T15:00:00.000Z',
        segmentEndAt: '2026-05-25T17:00:00.000Z',
        requestedStartAt: '2026-05-25T16:00:00.000Z',
        requestedEndAt: '2026-05-25T15:00:00.000Z'
    });

    assert.equal(result.customerStartAt.toISOString(), '2026-05-25T15:00:00.000Z');
    assert.equal(result.customerEndAt.toISOString(), '2026-05-25T16:00:00.000Z');
});

test('resolveSelectedDeliveryWindow rejects non-hour points outside the selectable set', () => {
    const result = resolveSelectedDeliveryWindow({
        segmentStartAt: '2026-05-25T15:00:00.000Z',
        segmentEndAt: '2026-05-25T17:00:00.000Z',
        requestedStartAt: '2026-05-25T15:30:00.000Z',
        requestedEndAt: '2026-05-25T16:00:00.000Z'
    });

    assert.equal(result, null);
});

test('splitSlotForTimezone splits customer display at local midnight', () => {
    const segments = splitSlotForTimezone({
        id: 'slot-1',
        startAt: new Date('2026-05-25T06:00:00.000Z'),
        endAt: new Date('2026-05-25T08:00:00.000Z'),
        timezone: 'Asia/Bangkok'
    });

    assert.deepEqual(segments, [
        {
            id: 'slot-1:2026-05-25:0',
            slotId: 'slot-1',
            customerStartAt: '2026-05-25T06:00:00.000Z',
            customerEndAt: '2026-05-25T08:00:00.000Z',
            customerDateKey: '2026-05-25',
            customerDateLabel: 'Mon, May 25',
            customerTimeLabel: '1:00 PM - 3:00 PM'
        }
    ]);
});

test('splitSlotForTimezone places post-midnight segment on the next customer date', () => {
    const segments = splitSlotForTimezone({
        id: 'slot-2',
        startAt: new Date('2026-05-25T06:00:00.000Z'),
        endAt: new Date('2026-05-25T08:00:00.000Z'),
        timezone: 'America/Los_Angeles'
    });

    assert.deepEqual(segments, [
        {
            id: 'slot-2:2026-05-24:0',
            slotId: 'slot-2',
            customerStartAt: '2026-05-25T06:00:00.000Z',
            customerEndAt: '2026-05-25T07:00:00.000Z',
            customerDateKey: '2026-05-24',
            customerDateLabel: 'Sun, May 24',
            customerTimeLabel: '11:00 PM - 12:00 AM'
        },
        {
            id: 'slot-2:2026-05-25:1',
            slotId: 'slot-2',
            customerStartAt: '2026-05-25T07:00:00.000Z',
            customerEndAt: '2026-05-25T08:00:00.000Z',
            customerDateKey: '2026-05-25',
            customerDateLabel: 'Mon, May 25',
            customerTimeLabel: '12:00 AM - 1:00 AM'
        }
    ]);
});

test('splitSlotForTimezone keeps Asia/Seoul slots available when Vietnam hours cross local midnight', () => {
    const segments = splitSlotForTimezone({
        id: '507f1f77bcf86cd799439011',
        startAt: new Date('2026-05-25T14:00:00.000Z'),
        endAt: new Date('2026-05-25T16:00:00.000Z'),
        timezone: 'Asia/Seoul'
    });

    assert.deepEqual(segments, [
        {
            id: '507f1f77bcf86cd799439011:2026-05-25:0',
            slotId: '507f1f77bcf86cd799439011',
            customerStartAt: '2026-05-25T14:00:00.000Z',
            customerEndAt: '2026-05-25T15:00:00.000Z',
            customerDateKey: '2026-05-25',
            customerDateLabel: 'Mon, May 25',
            customerTimeLabel: '11:00 PM - 12:00 AM'
        },
        {
            id: '507f1f77bcf86cd799439011:2026-05-26:1',
            slotId: '507f1f77bcf86cd799439011',
            customerStartAt: '2026-05-25T15:00:00.000Z',
            customerEndAt: '2026-05-25T16:00:00.000Z',
            customerDateKey: '2026-05-26',
            customerDateLabel: 'Tue, May 26',
            customerTimeLabel: '12:00 AM - 1:00 AM'
        }
    ]);
});
