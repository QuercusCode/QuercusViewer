import { useState, useEffect, useCallback } from 'react';
import {
    Upload, Eye, Share2, Trash2, Copy, Import,
    Activity, Loader2, Clock, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { getActivityLog, type ActivityLog, type ActivityAction } from '../../lib/structuresService';

// ─── Helpers ──────────────────────────────────────────────────────

function timeAgo(ts: string) {
    const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

const ACTION_CONFIG: Record<ActivityAction, { label: string; icon: React.ElementType; color: string; bg: string }> = {
    upload: { label: 'Uploaded', icon: Upload, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    open: { label: 'Opened', icon: Eye, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    share: { label: 'Shared', icon: Share2, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
    delete: { label: 'Deleted', icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    import_rcsb: { label: 'Imported from RCSB', icon: Import, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    duplicate: { label: 'Duplicated', icon: Copy, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
};

// Group consecutive logs by date
function groupByDate(logs: ActivityLog[]) {
    const groups: { date: string; items: ActivityLog[] }[] = [];
    for (const log of logs) {
        const d = new Date(log.created_at);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        let label: string;
        if (d.toDateString() === today.toDateString()) label = 'Today';
        else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
        else label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

        const last = groups[groups.length - 1];
        if (last && last.date === label) last.items.push(log);
        else groups.push({ date: label, items: [log] });
    }
    return groups;
}

// ─── Summary Stats Bar ────────────────────────────────────────────

function StatsBar({ logs }: { logs: ActivityLog[] }) {
    const counts: Record<ActivityAction, number> = {
        upload: 0, open: 0, share: 0, delete: 0, import_rcsb: 0, duplicate: 0
    };
    for (const l of logs) counts[l.action] = (counts[l.action] ?? 0) + 1;

    const entries: { action: ActivityAction; count: number }[] = [
        { action: 'upload', count: counts.upload + counts.import_rcsb },
        { action: 'open', count: counts.open },
        { action: 'share', count: counts.share },
    ];

    return (
        <div className="grid grid-cols-3 gap-3 mb-6">
            {entries.map(({ action, count }) => {
                const cfg = ACTION_CONFIG[action];
                const Icon = cfg.icon;
                return (
                    <div key={action}
                        className={`rounded-xl border p-4 flex flex-col gap-1.5 ${cfg.bg}`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                        <div className={`text-2xl font-bold tabular-nums ${cfg.color}`}>{count}</div>
                        <div className="text-xs text-neutral-500 font-medium capitalize">{cfg.label}s</div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────

export const ActivityTimeline = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<ActivityAction | 'all'>('all');

    const load = useCallback(async () => {
        if (!user) return;
        try {
            setError(null);
            const data = await getActivityLog(user.id, 100);
            setLogs(data);
        } catch (e: any) {
            setError(e.message ?? 'Failed to load activity');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { load(); }, [load]);

    const visible = filter === 'all' ? logs : logs.filter(l => l.action === filter);
    const grouped = groupByDate(visible);

    const FILTERS: { key: ActivityAction | 'all'; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'upload', label: 'Uploads' },
        { key: 'import_rcsb', label: 'RCSB' },
        { key: 'open', label: 'Opens' },
        { key: 'share', label: 'Shares' },
        { key: 'duplicate', label: 'Duplicates' },
        { key: 'delete', label: 'Deletes' },
    ];

    return (
        <div className="space-y-6 max-w-3xl">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="w-6 h-6 text-blue-400" />
                        Activity Timeline
                    </h2>
                    <p className="text-sm text-neutral-500 mt-0.5">
                        A log of your recent actions — opens, uploads, shares, and more.
                    </p>
                </div>
                <button onClick={load} disabled={loading}
                    className="p-2 text-neutral-500 hover:text-white transition-colors disabled:opacity-50">
                    <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Stats */}
            {!loading && logs.length > 0 && <StatsBar logs={logs} />}

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
                {FILTERS.map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all
                            ${filter === f.key
                                ? 'bg-neutral-700 border-neutral-600 text-white'
                                : 'bg-transparent border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300'}`}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-16 text-neutral-600">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </div>
            )}

            {/* Empty */}
            {!loading && visible.length === 0 && (
                <div className="text-center py-16 text-neutral-600">
                    <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No activity yet — open or upload a structure to get started.</p>
                </div>
            )}

            {/* Timeline Groups */}
            {!loading && grouped.map(group => (
                <div key={group.date} className="space-y-2">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                            {group.date}
                        </span>
                        <div className="flex-1 h-px bg-neutral-800" />
                    </div>

                    <div className="space-y-1.5">
                        {group.items.map(log => {
                            const cfg = ACTION_CONFIG[log.action] ?? ACTION_CONFIG.open;
                            const Icon = cfg.icon;
                            return (
                                <div key={log.id}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors group">
                                    {/* Icon */}
                                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${cfg.bg}`}>
                                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>
                                                {cfg.label}
                                            </span>
                                            {log.structure_name && (
                                                <span className="text-sm text-white font-medium truncate" title={log.structure_name}>
                                                    {log.structure_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Time */}
                                    <span className="text-xs text-neutral-600 group-hover:text-neutral-500 transition-colors whitespace-nowrap shrink-0">
                                        {timeAgo(log.created_at)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};
