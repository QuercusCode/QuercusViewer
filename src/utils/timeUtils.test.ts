import { describe, it, expect } from 'vitest';
import { formatTime, parseTimeString } from './timeUtils';

describe('formatTime', () => {
    it('formats 0 ms as 00:00', () => {
        expect(formatTime(0)).toBe('00:00');
    });

    it('formats 1000 ms (1 second) as 00:01', () => {
        expect(formatTime(1000)).toBe('00:01');
    });

    it('formats 61000 ms (1 minute 1 second) as 01:01', () => {
        expect(formatTime(61000)).toBe('01:01');
    });

    it('formats 600000 ms (10 minutes) as 10:00', () => {
        expect(formatTime(600000)).toBe('10:00');
    });

    it('does not cap/wrap minutes at 60: 3661000 ms -> 61:01', () => {
        // 3661000 ms = 3661 seconds.
        // minutes = floor(3661 / 60) = 61 (no modulo applied to minutes)
        // seconds = 3661 % 60 = 1
        // padStart(2, '0') only enforces a MINIMUM of 2 digits, so '61' is left as-is.
        expect(formatTime(3661000)).toBe('61:01');
    });

    it('floors partial seconds (truncates sub-second remainders) before formatting', () => {
        // 1999 ms -> Math.floor(1999 / 1000) = 1 second -> '00:01', not rounded up to 2.
        expect(formatTime(1999)).toBe('00:01');
    });

    it('pads single-digit minutes and seconds to 2 digits', () => {
        // 65000 ms = 65 seconds -> minutes=1, seconds=5
        expect(formatTime(65000)).toBe('01:05');
    });

    it('handles a value just under one minute', () => {
        // 59000 ms = 59 seconds -> minutes=0, seconds=59
        expect(formatTime(59000)).toBe('00:59');
    });
});

describe('parseTimeString', () => {
    it('parses "01:01" to 61000 ms', () => {
        expect(parseTimeString('01:01')).toBe(61000);
    });

    it('parses "00:00" to 0 ms', () => {
        expect(parseTimeString('00:00')).toBe(0);
    });

    it('parses "10:30" to 630000 ms', () => {
        // minutes=10, seconds=30 -> (10*60 + 30) * 1000 = 630000
        expect(parseTimeString('10:30')).toBe(630000);
    });

    it('returns 0 for malformed input with no colon', () => {
        // split(':') -> ['garbage'], length 1 !== 2
        expect(parseTimeString('garbage')).toBe(0);
    });

    it('returns 0 for malformed input with too many colon-separated parts', () => {
        // split(':') -> ['1', '2', '3'], length 3 !== 2
        expect(parseTimeString('1:2:3')).toBe(0);
    });

    it('returns 0 for an empty string', () => {
        // split(':') -> [''], length 1 !== 2
        expect(parseTimeString('')).toBe(0);
    });

    it('falls back to 0 for non-numeric minute/second parts', () => {
        // parseInt('ab', 10) -> NaN -> || 0 -> 0 for both parts
        expect(parseTimeString('ab:cd')).toBe(0);
    });

    it('falls back to 0 only for the non-numeric part when one side is numeric', () => {
        // parseInt('ab', 10) -> NaN -> 0 minutes; parseInt('30', 10) -> 30 seconds
        expect(parseTimeString('ab:30')).toBe(30000);
        // parseInt('05', 10) -> 5 minutes; parseInt('cd', 10) -> NaN -> 0 seconds
        expect(parseTimeString('05:cd')).toBe(300000);
    });

    it('parses single-digit, unpadded minute/second strings', () => {
        // minutes=5, seconds=3 -> (300 + 3) * 1000 = 303000
        expect(parseTimeString('5:3')).toBe(303000);
    });
});

describe('formatTime / parseTimeString round-trip', () => {
    const cleanValuesMs = [0, 1000, 61000, 600000];

    it.each(cleanValuesMs)(
        'round-trips %i ms through formatTime -> parseTimeString',
        (ms) => {
            expect(parseTimeString(formatTime(ms))).toBe(ms);
        }
    );
});
