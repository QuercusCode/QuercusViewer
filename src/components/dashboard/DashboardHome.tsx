import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Database, Eye, Upload, FolderOpen, Star,
    Activity, TrendingUp, Loader2, Plus,
    ArrowRight, Share2, Clock, Dna, Atom, Zap
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { listStructures, getActivityLog, type Structure, type ActivityLog, type ActivityAction } from '../../lib/structuresService';

// ─── Helpers ──────────────────────────────────────────────────────

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

// ─── Stat Card ────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, gradient }: {
    label: string; value: string | number; sub?: string;
    icon: React.ElementType; gradient: string;
}) {
    return (
        <div className={`relative overflow-hidden rounded-2xl border border-white/5 p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 ${gradient}`}>
            <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/50">{label}</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-white/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-white/80" />
                </div>
            </div>
            <div>
                <div className="text-4xl font-bold text-white tabular-nums tracking-tight">{value}</div>
                {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
            </div>
        </div>
    );
}

// ─── Storage Bar ──────────────────────────────────────────────────

const STORAGE_LIMIT_MB = 500;

function StorageBar({ totalBytes }: { totalBytes: number }) {
    const usedMB = totalBytes / 1048576;
    const pct = Math.min((usedMB / STORAGE_LIMIT_MB) * 100, 100);
    const color = pct > 85 ? 'bg-red-500' : pct > 65 ? 'bg-amber-500' : 'bg-blue-500';

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Storage</h3>
                <span className="ml-auto text-xs text-neutral-500">{STORAGE_LIMIT_MB} MB limit</span>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">{formatBytes(totalBytes)} used</span>
                    <span className="text-neutral-600">{pct.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${color}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <div className="text-xs text-neutral-600">
                    {(STORAGE_LIMIT_MB - usedMB).toFixed(1)} MB remaining
                </div>
            </div>
        </div>
    );
}

// ─── Quick Actions ────────────────────────────────────────────────

function QuickActions() {
    const navigate = useNavigate();
    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" /> Quick Actions
            </h3>
            <div className="space-y-2">
                {[
                    { label: 'Open 3D Viewer', icon: Atom, action: () => navigate('/'), accent: 'hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-400' },
                    { label: 'My Structures', icon: FolderOpen, action: () => navigate('/dashboard/structures'), accent: 'hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-400' },
                    { label: 'Activity Log', icon: Activity, action: () => navigate('/dashboard/activity'), accent: 'hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-violet-400' },
                ].map(({ label, icon: Icon, action, accent }) => (
                    <button key={label} onClick={action}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-neutral-800 text-neutral-400 transition-all text-sm font-medium group ${accent}`}>
                        <Icon className="w-4 h-4 shrink-0 transition-colors" />
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
    const top = [...structures]
        .filter(s => (s.view_count ?? 0) > 0)
        .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
        .slice(0, 5);

    if (top.length === 0) return null;

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" /> Most Viewed
                </h3>
                <Link to="/dashboard/structures" className="text-xs text-neutral-500 hover:text-white transition-colors">
                    All structures →
                </Link>
            </div>
            <div className="space-y-2">
                {top.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 group">
                        <span className="text-lg font-bold text-neutral-800 tabular-nums w-5 text-right shrink-0">
                            {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm text-neutral-300 font-medium truncate group-hover:text-white transition-colors">
                                {s.name}
                            </div>
                            <div className="text-xs text-neutral-600">{s.file_type.toUpperCase()}</div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-neutral-600 shrink-0">
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

function RecentFeed({ logs }: { logs: ActivityLog[] }) {
    const recent = logs.slice(0, 7);
    if (recent.length === 0) return null;

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-400" /> Recent Activity
                </h3>
                <Link to="/dashboard/activity" className="text-xs text-neutral-500 hover:text-white transition-colors">
                    Full log →
                </Link>
            </div>
            <div className="space-y-1">
                {recent.map(log => {
                    const cfg = ACTION_CONFIG[log.action] ?? ACTION_CONFIG.open;
                    const Icon = cfg.icon;
                    return (
                        <div key={log.id} className="flex items-center gap-2.5 py-1.5 group">
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.color}`} />
                            <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                                <span className="text-xs text-neutral-500">{cfg.label}</span>
                                {log.structure_name && (
                                    <span className="text-xs text-neutral-300 font-medium truncate">{log.structure_name}</span>
                                )}
                            </div>
                            <span className="text-xs text-neutral-700 shrink-0">{timeAgo(log.created_at)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Starred Structures ───────────────────────────────────────────

function StarredRow({ structures }: { structures: Structure[] }) {
    const starred = structures.filter(s => s.starred).slice(0, 4);
    if (starred.length === 0) return null;

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Starred
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {starred.map(s => (
                    <div key={s.id}
                        className="p-3 rounded-xl border border-neutral-800 hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all cursor-pointer group">
                        <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center mb-2">
                            <Dna className="w-4 h-4 text-neutral-500 group-hover:text-yellow-400 transition-colors" />
                        </div>
                        <p className="text-xs font-medium text-neutral-300 truncate">{s.name}</p>
                        <p className="text-[10px] text-neutral-600 mt-0.5">{s.file_type.toUpperCase()}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main DashboardHome ───────────────────────────────────────────

export const DashboardHome = () => {
    const { user } = useAuth();
    const [structures, setStructures] = useState<Structure[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        Promise.all([
            listStructures(user.id),
            getActivityLog(user.id, 50),
        ]).then(([s, l]) => {
            setStructures(s);
            setLogs(l);
        }).catch(console.error).finally(() => setLoading(false));
    }, [user]);

    const totalBytes = structures.reduce((acc, s) => acc + (s.file_size ?? 0), 0);
    const totalOpens = structures.reduce((acc, s) => acc + (s.view_count ?? 0), 0);
    const weekOpens = logs.filter(l => {
        const d = new Date(l.created_at);
        return l.action === 'open' && Date.now() - d.getTime() < 7 * 86400000;
    }).length;

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Scientist';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-neutral-600">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl">
            {/* Header */}
            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-sm text-neutral-500">{greeting()},</p>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{displayName} 👋</h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        Here's a snapshot of your structure library.
                    </p>
                </div>
                <Link
                    to="/dashboard/structures"
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors shrink-0 shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Structure</span>
                </Link>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Structures"
                    value={structures.length}
                    sub={`${structures.filter(s => s.starred).length} starred`}
                    icon={Database}
                    gradient="bg-gradient-to-br from-blue-600/30 to-blue-900/20"
                />
                <StatCard
                    label="Storage Used"
                    value={formatBytes(totalBytes)}
                    sub={`of ${STORAGE_LIMIT_MB} MB`}
                    icon={TrendingUp}
                    gradient="bg-gradient-to-br from-emerald-600/30 to-emerald-900/20"
                />
                <StatCard
                    label="Total Opens"
                    value={totalOpens}
                    sub="all time"
                    icon={Eye}
                    gradient="bg-gradient-to-br from-violet-600/30 to-violet-900/20"
                />
                <StatCard
                    label="This Week"
                    value={weekOpens}
                    sub="opens in last 7 days"
                    icon={Activity}
                    gradient="bg-gradient-to-br from-amber-600/30 to-amber-900/20"
                />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left column — 2/3 width */}
                <div className="lg:col-span-2 space-y-4">
                    <StarredRow structures={structures} />
                    <TopStructures structures={structures} />
                    <RecentFeed logs={logs} />

                    {/* Empty state */}
                    {structures.length === 0 && (
                        <div className="bg-neutral-900 border border-neutral-800 border-dashed rounded-2xl p-6 sm:p-12 text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto">
                                <Dna className="w-8 h-8 text-neutral-600" />
                            </div>
                            <div>
                                <p className="text-neutral-300 font-medium">No structures yet</p>
                                <p className="text-sm text-neutral-600 mt-1">Upload your first structure or import from RCSB PDB.</p>
                            </div>
                            <Link
                                to="/dashboard/structures"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Get Started
                            </Link>
                        </div>
                    )}
                </div>

                {/* Right column — 1/3 width */}
                <div className="space-y-4">
                    <StorageBar totalBytes={totalBytes} />
                    <QuickActions />
                </div>
            </div>
        </div>
    );
};
