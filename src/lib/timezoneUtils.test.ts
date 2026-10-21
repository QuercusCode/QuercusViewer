import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    resolveTimezone,
    formatDate,
    formatTime,
    formatDateTime,
    timeAgo,
    TIMEZONE_MAP,
} from './timezoneUtils';

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

describe('TIMEZONE_MAP', () => {
    it('maps every human-readable label to a non-empty IANA identifier', () => {
        const entries = Object.entries(TIMEZONE_MAP);
        expect(entries.length).toBeGreaterThan(0);
        for (const [label, iana] of entries) {
            expect(typeof label).toBe('string');
            expect(label.length).toBeGreaterThan(0);
            expect(typeof iana).toBe('string');
            expect(iana.length).toBeGreaterThan(0);
        }
    });

    it('contains the specific known mapping for Eastern Time (ET)', () => {
        expect(TIMEZONE_MAP['Eastern Time (ET)']).toBe('America/New_York');
    });

    it('contains the specific known mapping for Coordinated Universal Time (UTC)', () => {
        expect(TIMEZONE_MAP['Coordinated Universal Time (UTC)']).toBe('UTC');
    });
});

describe('resolveTimezone', () => {
    it('falls back to the runtime local timezone when preference is undefined', () => {
        const result = resolveTimezone(undefined);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    });

    it('falls back to the runtime local timezone when preference is an empty string', () => {
        // '' is falsy, so it takes the same branch as undefined per the `if (!preference)` guard.
        const result = resolveTimezone('');
        expect(result).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    });

    it('resolves a known TIMEZONE_MAP key to its exact IANA identifier', () => {
        expect(resolveTimezone('Eastern Time (ET)')).toBe('America/New_York');
    });

    it('resolves another known TIMEZONE_MAP key to its exact IANA identifier', () => {
        expect(resolveTimezone('Japan Standard Time (JST)')).toBe('Asia/Tokyo');
    });

    it('falls back to the runtime local timezone for an unrecognized preference string', () => {
        const result = resolveTimezone('Mars Time');
        expect(result).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    });
});

describe('formatDate', () => {
    it('returns the em dash for an invalid date string', () => {
        expect(formatDate('not-a-date', 'UTC')).toBe('—');
        expect(formatDate('not-a-date', 'UTC')).toBe('—');
    });

    it('returns the em dash for an invalid Date object', () => {
        expect(formatDate(new Date('not-a-date'), 'UTC')).toBe('—');
    });

    it('formats a known fixed date (string input) in UTC containing year, month abbreviation, and day', () => {
        const result = formatDate('2026-03-22T14:34:00Z', 'UTC');
        expect(result).toContain('2026');
        expect(result).toContain('Mar');
        expect(result).toContain('22');
    });

    it('formats a known fixed date (Date object input) in UTC the same way as the equivalent string', () => {
        const date = new Date('2026-03-22T14:34:00Z');
        const result = formatDate(date, 'UTC');
        expect(result).toContain('2026');
        expect(result).toContain('Mar');
        expect(result).toContain('22');
    });

    it('respects an options override merged on top of the defaults', () => {
        // month: 'long' should override the default 'short' since it is spread after the defaults.
        const result = formatDate('2026-03-22T14:34:00Z', 'UTC', { month: 'long' });
        expect(result).toContain('March');
    });
});

describe('formatTime', () => {
    it('returns the em dash for an invalid date string', () => {
        expect(formatTime('not-a-date', 'UTC')).toBe('—');
    });

    it('returns the em dash for an invalid Date object', () => {
        expect(formatTime(new Date('garbage'), 'UTC')).toBe('—');
    });

    it('formats a known fixed time in UTC containing the minutes, independent of 12h/24h formatting', () => {
        // 14:34 UTC -> minutes digits ':34' are present regardless of whether the
        // hour renders as '02' (12h) or '14' (24h).
        const result = formatTime('2026-03-22T14:34:00Z', 'UTC');
        expect(result).toContain(':34');
    });

    it('formats a known fixed time (Date object input) the same way as the equivalent string', () => {
        const date = new Date('2026-03-22T14:34:00Z');
        const result = formatTime(date, 'UTC');
        expect(result).toContain(':34');
    });
});

describe('formatDateTime', () => {
    it('returns the em dash for an invalid date string', () => {
        expect(formatDateTime('not-a-date', 'UTC')).toBe('—');
    });

    it('returns the em dash for an invalid Date object', () => {
        expect(formatDateTime(new Date('nope'), 'UTC')).toBe('—');
    });

    it('formats a known fixed datetime in UTC containing both date and time substrings', () => {
        const result = formatDateTime('2026-03-22T14:34:00Z', 'UTC');
        expect(result).toContain('2026');
        expect(result).toContain('Mar');
        expect(result).toContain('22');
        expect(result).toContain(':34');
    });
});

describe('timeAgo', () => {
    const NOW = new Date('2026-03-22T12:00:00Z');

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns "just now" for a timestamp 30 seconds in the past (m < 1)', () => {
        // 30s ago -> diff = 30000ms -> floor(30000/60000) = 0 minutes -> m < 1 branch.
        expect(timeAgo('2026-03-22T11:59:30Z')).toBe('just now');
    });

    it('returns "just now" for the current instant (0 seconds ago)', () => {
        expect(timeAgo('2026-03-22T12:00:00Z')).toBe('just now');
    });

    it('returns "Xm ago" for a timestamp 5 minutes in the past', () => {
        // 5 minutes ago -> m = 5, which is < 60 -> 'Xm ago' branch.
        expect(timeAgo('2026-03-22T11:55:00Z')).toBe('5m ago');
    });

    it('returns "59m ago" at the boundary just under 60 minutes', () => {
        // 59 minutes ago -> m = 59 -> still in the m < 60 branch.
        expect(timeAgo('2026-03-22T11:01:00Z')).toBe('59m ago');
    });

    it('returns "Xh ago" for a timestamp 2 hours in the past', () => {
        // 2 hours ago -> m = 120, h = floor(120/60) = 2, which is < 24 -> 'Xh ago' branch.
        expect(timeAgo('2026-03-22T10:00:00Z')).toBe('2h ago');
    });

    it('returns "23h ago" at the boundary just under 24 hours', () => {
        // 23 hours ago -> m = 1380, h = floor(1380/60) = 23, still < 24.
        expect(timeAgo('2026-03-21T13:00:00Z')).toBe('23h ago');
    });

    it('returns "Xd ago" for a timestamp 3 days in the past', () => {
        // 3 days ago -> m = 4320, h = 72, d = floor(72/24) = 3, which is < 7 -> 'Xd ago' branch.
        expect(timeAgo('2026-03-19T12:00:00Z')).toBe('3d ago');
    });

    it('returns "6d ago" at the boundary just under 7 days', () => {
        // 6 days ago -> d = 6, still < 7.
        expect(timeAgo('2026-03-16T12:00:00Z')).toBe('6d ago');
    });

    it('falls through to a formatted date (not a relative-time suffix) at exactly 7 days', () => {
        // 7 days ago -> d = 7, which is NOT < 7, so it falls through to formatDate(...).
        const result = timeAgo('2026-03-15T12:00:00Z');
        expect(result).not.toMatch(/ ago$/);
        expect(result).not.toBe('just now');
    });

    it('falls through to a formatted date string for a timestamp 21 days in the past', () => {
        // 21 days ago -> d = 21, >= 7 -> falls through to formatDate(date, <local timezone>).
        const result = timeAgo('2026-03-01T12:00:00Z');
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result).not.toMatch(/^\d+m ago$/);
        expect(result).not.toMatch(/^\d+h ago$/);
        expect(result).not.toMatch(/^\d+d ago$/);
        expect(result).not.toBe('just now');
        expect(result).not.toMatch(/ ago$/);
        // Sanity check it matches what formatDate itself would produce for the same
        // instant using the runtime's local timezone (mirrors the module's own fallback call).
        expect(result).toBe(formatDate(new Date('2026-03-01T12:00:00Z'), LOCAL_TZ));
    });

    it('accepts a Date object as well as a string for the same relative-time computation', () => {
        const date = new Date('2026-03-22T11:55:00Z');
        expect(timeAgo(date)).toBe('5m ago');
    });
});
