import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Database, Eye, Upload, FolderOpen, Star,
    Activity, TrendingUp, Loader2, Plus,
    ArrowRight, Share2, Clock, Dna, Atom, Zap, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { listStructures, getActivityLog, type Structure, type ActivityLog, type ActivityAction } from '../../lib/structuresService';
import { useTimezone, formatTime } from '../../lib/timezoneUtils';
import { useTranslation } from '../../lib/i18n';

function formatBytes(b: number | null) {
    if (!b) return '0 B';
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
}

function timeAgo(ts: string) {
    const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

const ACTION_CONFIG: Record<ActivityAction, { label: string; icon: React.ElementType; color: string }> = {
    upload: { label: 'Uploaded', icon: Upload, color: 'text-blue-400' },
    open: { label: 'Opened', icon: Eye, color: 'text-emerald-400' },
    share: { label: 'Shared', icon: Share2, color: 'text-violet-400' },
    delete: { label: 'Deleted', icon: Database, color: 'text-red-400' },
    import_rcsb: { label: 'Imported', icon: Dna, color: 'text-amber-400' },
    duplicate: { label: 'Duplicated', icon: FolderOpen, color: 'text-pink-400' },
};

// ─── Data helpers ─────────────────────────────────────────────────

function dailyCounts(logs: ActivityLog[], action: ActivityAction, days = 14): number[] {
    const now = Date.now();
    return Array.from({ length: days }, (_, i) => {
        const dayStart = now - (days - 1 - i) * 86400000;
        const dayEnd = dayStart + 86400000;
        return logs.filter(l =>
            l.action === action &&
            new Date(l.created_at).getTime() >= dayStart &&
            new Date(l.created_at).getTime() < dayEnd
        ).length;
    });
}

function weekTrend(data: number[]): number | null {
    const thisWeek = data.slice(-7).reduce((a, b) => a + b, 0);
    const lastWeek = data.slice(0, 7).reduce((a, b) => a + b, 0);
    if (lastWeek === 0 && thisWeek === 0) return null;
    if (lastWeek === 0) return 100;
    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
}

// ─── Sparkline ────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
    const d = data.slice(-7);
    if (d.length < 2) return <div className="h-8" />;
    const max = Math.max(...d, 1);
    const W = 100, H = 28;
    const pts = d.map((v, i) =>
        `${(i / (d.length - 1)) * W},${H - (v / max) * (H - 2) - 1}`
    ).join(' L ');
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8" preserveAspectRatio="none">
            <polyline
                points={pts.replace(/ L /g, ' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={color}
                opacity={0.7}
            />
        </svg>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ElementType;
    borderColor: string;
    iconBg: string;
    iconColor: string;
    sparkColor: string;
    sparkData?: number[];
    trend?: number | null;
}

function StatCard({ label, value, sub, icon: Icon, borderColor, iconBg, iconColor, sparkColor, sparkData, trend }: StatCardProps) {
    return (
        <div className={`relative bg-[var(--bg-header)] border border-[var(--border-main)] rounded-2xl p-5 flex flex-col gap-3 hover:border-neutral-700 transition-colors overflow-hidden border-l-2 ${borderColor}`}>
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{label}</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
                    <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                </div>
            </div>
            <div className="flex items-end justify-between gap-2">
                <div>
                    <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums leading-none">{value}</div>
                    {sub && <div className="text-[11px] text-[var(--text-muted)] mt-1.5">{sub}</div>}
                </div>
                {trend !== null && trend !== undefined && (
                    <div className={`flex items-center gap-0.5 text-[11px] font-semibold mb-0.5 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            {sparkData && <Sparkline data={sparkData} color={sparkColor} />}
        </div>
    );
}

// ─── Storage Bar ──────────────────────────────────────────────────

const STORAGE_LIMIT_MB = 500;

function StorageBar({ totalBytes }: { totalBytes: number }) {
    const { t } = useTranslation();
    const usedMB = totalBytes / 1048576;
    const pct = Math.min((usedMB / STORAGE_LIMIT_MB) * 100, 100);
    const color = pct > 85 ? 'bg-red-500' : pct > 65 ? 'bg-amber-500' : 'bg-blue-500';

    return (
        <div className="bg-[var(--bg-header)] border border-[var(--border-main)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{t.dashHomeStorage as string}</span>
                <span className="ml-auto text-[11px] text-[var(--text-muted)]">{(t.dashHomeMBLimit as (mb: number) => string)(STORAGE_LIMIT_MB)}</span>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)] font-medium">{formatBytes(totalBytes)} {t.dashHomeUsed as string}</span>
                    <span className="text-[var(--text-muted)]">{pct.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-[var(--input-bg)] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                    {(t.dashHomeRemaining as (mb: string) => string)(`${(STORAGE_LIMIT_MB - usedMB).toFixed(1)} MB`)}
                </div>
            </div>
        </div>
    );
}

// ─── Quick Actions ────────────────────────────────────────────────

function QuickActions() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const actions = [
        { label: t.dashHomeOpen3DViewer as string, icon: Atom, action: () => navigate('/'), accent: 'hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-400' },
        { label: t.myStructures as string, icon: FolderOpen, action: () => navigate('/dashboard/structures'), accent: 'hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-400' },
        { label: t.dashHomeActivityLog as string, icon: Activity, action: () => navigate('/dashboard/activity'), accent: 'hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-violet-400' },
    ];
    return (
        <div className="bg-[var(--bg-header)] border border-[var(--border-main)] rounded-2xl p-5 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-yellow-400" /> {t.dashHomeQuickActions as string}
            </span>
            <div className="space-y-1.5">
                {actions.map(({ label, icon: Icon, action, accent }) => (
                    <button key={label} onClick={action}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[var(--border-main)] text-[var(--text-secondary)] transition-all text-sm group ${accent}`}>
                        <Icon className="w-4 h-4 shrink-0" />
                        {label}
                        <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Top Structures ────────────────────────────────────────────────

function TopStructures({ structures }: { structures: Structure[] }) {
    const { t } = useTranslation();
    const top = [...structures]
        .filter(s => (s.view_count ?? 0) > 0)
        .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
        .slice(0, 5);
    if (top.length === 0) return null;
    const maxViews = top[0]?.view_count ?? 1;

    return (
        <div className="bg-[var(--bg-header)] border border-[var(--border-main)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> {t.dashHomeMostViewed as string}
                </span>
                <Link to="/dashboard/structures" className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    {t.dashHomeAllStructures as string}
                </Link>
            </div>
            <div className="space-y-3">
                {top.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 group">
                        <span className="text-xs font-bold tabular-nums w-4 text-right text-[var(--text-muted)] shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm text-[var(--text-secondary)] font-medium truncate group-hover:text-[var(--text-primary)] transition-colors">{s.name}</div>
                            <div className="h-1 mt-1.5 bg-[var(--input-bg)] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500/50 rounded-full transition-all duration-500"
                                    style={{ width: `${((s.view_count ?? 0) / maxViews) * 100}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] shrink-0">
                            <Eye className="w-3 h-3" />
                            <span className="tabular-nums">{s.view_count}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Recent Activity Feed ─────────────────────────────────────────

function RecentFeed({ logs, timezone }: { logs: ActivityLog[], timezone: string }) {
    const { t } = useTranslation();
    const recent = logs.slice(0, 8);
    if (recent.length === 0) return null;

    const ACTION_LABELS: Record<ActivityAction, string> = {
        upload: t.dashHomeActUploaded as string,
        open: t.dashHomeActOpened as string,
        share: t.dashHomeActShared as string,
        delete: t.dashHomeActDeleted as string,
        import_rcsb: t.dashHomeActImported as string,
        duplicate: t.dashHomeActDuplicated as string,
    };

    return (
        <div className="bg-[var(--bg-header)] border border-[var(--border-main)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> {t.dashHomeRecentActivity as string}
                </span>
                <Link to="/dashboard/activity" className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    {t.dashHomeFullLog as string}
                </Link>
            </div>
            <div className="divide-y divide-[var(--border-main)]">
                {recent.map(log => {
                    const cfg = ACTION_CONFIG[log.action] ?? ACTION_CONFIG.open;
                    const Icon = cfg.icon;
                    return (
                        <div key={log.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                            <div className="w-6 h-6 rounded-lg bg-[var(--input-bg)] flex items-center justify-center shrink-0">
                                <Icon className={`w-3 h-3 ${cfg.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[11px] text-[var(--text-muted)]">{ACTION_LABELS[log.action] ?? cfg.label} </span>
                                {log.structure_name && (
                                    <span className="text-[11px] text-[var(--text-secondary)] font-medium truncate">{log.structure_name}</span>
                                )}
                            </div>
                            <span className="text-[11px] text-[var(--text-muted)] shrink-0 tabular-nums" title={formatTime(log.created_at, timezone)}>
                                {timeAgo(log.created_at)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Starred Structures ───────────────────────────────────────────

function StarredRow({ structures }: { structures: Structure[] }) {
    const { t } = useTranslation();
    const starred = structures.filter(s => s.starred).slice(0, 4);
    if (starred.length === 0) return null;
    return (
        <div className="bg-[var(--bg-header)] border border-[var(--border-main)] rounded-2xl p-5 space-y-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /> {t.starred as string}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {starred.map(s => (
                    <div key={s.id} className="p-3 rounded-xl border border-[var(--border-main)] hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all cursor-pointer group">
                        <div className="w-7 h-7 rounded-lg bg-[var(--input-bg)] flex items-center justify-center mb-2.5">
                            <Dna className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-yellow-400 transition-colors" />
                        </div>
                        <p className="text-xs font-medium text-[var(--text-secondary)] truncate">{s.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{s.file_type.toUpperCase()}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main DashboardHome ───────────────────────────────────────────

export const DashboardHome = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const timezone = useTimezone();
    const [structures, setStructures] = useState<Structure[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        Promise.all([
            listStructures(user.id),
            getActivityLog(user.id, 200),
        ]).then(([s, l]) => {
            setStructures(s);
            setLogs(l);
        }).catch(console.error).finally(() => setLoading(false));
    }, [user]);

    const totalBytes = structures.reduce((acc, s) => acc + (s.file_size ?? 0), 0);
    const totalOpens = structures.reduce((acc, s) => acc + (s.view_count ?? 0), 0);

    const opensSpark = dailyCounts(logs, 'open', 14);
    const uploadSpark = dailyCounts(logs, 'upload', 14);
    const opensTrend = weekTrend(opensSpark);
    const uploadsTrend = weekTrend(uploadSpark);
    const weekOpens = opensSpark.slice(-7).reduce((a, b) => a + b, 0);

    const greeting = () => {
        const h = new Date().toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false });
        const hour = parseInt(h, 10);
        if (hour < 12) return t.dashHomeGoodMorning as string;
        if (hour < 18) return t.dashHomeGoodAfternoon as string;
        return t.dashHomeGoodEvening as string;
    };

    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Scientist';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
                <Loader2 className="w-5 h-5 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-medium">{greeting()}</p>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight mt-0.5">{displayName}</h1>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{t.dashHomeLibrarySnapshot as string}</p>
                </div>
                <Link
                    to="/dashboard/structures"
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors shrink-0 shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-4 h-4" /> <span className="hidden sm:inline">{t.dashHomeNewStructure as string}</span>
                </Link>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    label={t.dashHomeStatStructures as string}
                    value={structures.length}
                    sub={(t.dashHomeStatStarred as (n: number) => string)(structures.filter(s => s.starred).length)}
                    icon={Database}
                    borderColor="border-l-blue-500"
                    iconBg="bg-blue-500/10"
                    iconColor="text-blue-400"
                    sparkColor="text-blue-400"
                    sparkData={uploadSpark}
                    trend={uploadsTrend}
                />
                <StatCard
                    label={t.dashHomeStatStorageUsed as string}
                    value={formatBytes(totalBytes)}
                    sub={t.dashHomeStatOf500MB as string}
                    icon={TrendingUp}
                    borderColor="border-l-emerald-500"
                    iconBg="bg-emerald-500/10"
                    iconColor="text-emerald-400"
                    sparkColor="text-emerald-400"
                />
                <StatCard
                    label={t.dashHomeStatTotalOpens as string}
                    value={totalOpens}
                    sub={t.dashHomeStatAllTime as string}
                    icon={Eye}
                    borderColor="border-l-violet-500"
                    iconBg="bg-violet-500/10"
                    iconColor="text-violet-400"
                    sparkColor="text-violet-400"
                    sparkData={opensSpark}
                    trend={opensTrend}
                />
                <StatCard
                    label={t.dashHomeStatThisWeek as string}
                    value={weekOpens}
                    sub={t.dashHomeStatThisWeekDesc as string}
                    icon={Activity}
                    borderColor="border-l-amber-500"
                    iconBg="bg-amber-500/10"
                    iconColor="text-amber-400"
                    sparkColor="text-amber-400"
                    sparkData={opensSpark.slice(-7)}
                />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    <StarredRow structures={structures} />
                    <TopStructures structures={structures} />
                    <RecentFeed logs={logs} timezone={timezone} />
                    {structures.length === 0 && (
                        <div className="bg-[var(--bg-header)] border border-[var(--border-main)] border-dashed rounded-2xl p-10 text-center space-y-4">
                            <div className="w-14 h-14 rounded-2xl bg-[var(--input-bg)] flex items-center justify-center mx-auto">
                                <Dna className="w-7 h-7 text-[var(--text-muted)]" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[var(--text-secondary)]">{t.emptyStructures as string}</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">{t.emptyStructuresDesc as string}</p>
                            </div>
                            <Link to="/dashboard/structures" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
                                <Plus className="w-4 h-4" /> {t.dashHomeGetStarted as string}
                            </Link>
                        </div>
                    )}
                </div>
                <div className="space-y-4">
                    <StorageBar totalBytes={totalBytes} />
                    <QuickActions />
                </div>
            </div>
        </div>
    );
};
