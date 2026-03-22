import { useAuth } from './AuthContext';

/** Maps the human-readable timezone labels used in AccountSettings → IANA identifiers */
export const TIMEZONE_MAP: Record<string, string> = {
    'Pacific Time (PT)': 'America/Los_Angeles',
    'Mountain Time (MT)': 'America/Denver',
    'Central Time (CT)': 'America/Chicago',
    'Eastern Time (ET)': 'America/New_York',
    'Central European Time (CET)': 'Europe/Paris',
    'Greenwich Mean Time (GMT)': 'Europe/London',
    'Coordinated Universal Time (UTC)': 'UTC',
    'Japan Standard Time (JST)': 'Asia/Tokyo',
    'China Standard Time (CST)': 'Asia/Shanghai',
    'India Standard Time (IST)': 'Asia/Kolkata',
    'Australian Eastern Time (AET)': 'Australia/Sydney',
};

/** Resolves a stored timezone preference string to an IANA id */
export function resolveTimezone(preference: string | undefined): string {
    if (!preference) return Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_MAP[preference] ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Hook that returns the currently authenticated user's IANA timezone */
export function useTimezone(): string {
    const { user } = useAuth();
    return resolveTimezone(user?.user_metadata?.timezone);
}

/**
 * Format an ISO date string (or Date) as a short date: e.g. "Mar 22, 2026"
 */
export function formatDate(
    iso: string | Date,
    timezone: string,
    options?: Intl.DateTimeFormatOptions
): string {
    const date = typeof iso === 'string' ? new Date(iso) : iso;
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: timezone,
        ...options,
    });
}

/**
 * Format an ISO date string (or Date) as a time: e.g. "2:34 PM"
 */
export function formatTime(
    iso: string | Date,
    timezone: string,
    options?: Intl.DateTimeFormatOptions
): string {
    const date = typeof iso === 'string' ? new Date(iso) : iso;
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
        ...options,
    });
}

/**
 * Format an ISO date string (or Date) as a full datetime: e.g. "Mar 22, 2026, 2:34 PM"
 */
export function formatDateTime(
    iso: string | Date,
    timezone: string,
    options?: Intl.DateTimeFormatOptions
): string {
    const date = typeof iso === 'string' ? new Date(iso) : iso;
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
        ...options,
    });
}

/**
 * Relative time string ("just now", "5m ago", "2h ago", "3d ago")
 * identical to the existing logic in several components — centralised here.
 */
export function timeAgo(iso: string | Date): string {
    const date = typeof iso === 'string' ? new Date(iso) : iso;
    const m = Math.floor((Date.now() - date.getTime()) / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7)  return `${d}d ago`;
    return formatDate(date, Intl.DateTimeFormat().resolvedOptions().timeZone);
}
