import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { useTranslation } from '../../lib/i18n';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, Loader2, Camera, Trash2, AlertTriangle, X, Check, HardDrive, Zap, Bell, Globe, Link2, Github, Settings2, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Format Helpers ───────────────────────────────────────────────
function formatBytes(bytes: number | null): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── Helpers ──────────────────────────────────────────────────────

const MAX_AVATAR_MB = 2;

async function uploadAvatar(userId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${userId}/avatar.${ext}`;
    // Upsert (overwrite) any existing avatar
    const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`; // Cache-bust
}

// ─── Confirmation Modal ───────────────────────────────────────────

interface ConfirmModalProps {
    title: string;
    description: string;
    confirmLabel: string;
    confirmClass?: string;
    requirePhrase?: string; // If set, user must type this exact phrase to confirm
    onConfirm: () => Promise<void>;
    onClose: () => void;
}

function ConfirmModal({ title, description, confirmLabel, confirmClass, requirePhrase, onConfirm, onClose }: ConfirmModalProps) {
    const [phrase, setPhrase] = useState('');
    const [running, setRunning] = useState(false);
    const [err, setErr] = useState('');

    const canConfirm = !requirePhrase || phrase === requirePhrase;

    const handle = async () => {
        if (!canConfirm) return;
        setRunning(true);
        setErr('');
        try { await onConfirm(); }
        catch (e: any) { setErr(e.message ?? 'An error occurred'); setRunning(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[var(--bg-header)] border border-[var(--border-main)] rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-main)]">
                    <div className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-semibold text-sm">{title}</span>
                    </div>
                    <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>

                    {requirePhrase && (
                        <div>
                            <label className="block text-xs text-[var(--text-muted)] mb-1.5">
                                Type <span className="font-mono text-red-400 bg-red-500/10 px-1 rounded">{requirePhrase}</span> to confirm
                            </label>
                            <input
                                value={phrase}
                                onChange={e => setPhrase(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && canConfirm && handle()}
                                autoFocus
                                className="w-full px-3 py-2.5 bg-[var(--bg-header)] border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] font-mono placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                placeholder={requirePhrase}
                            />
                        </div>
                    )}

                    {err && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}

                    <div className="flex gap-3 pt-1">
                        <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-[var(--text-secondary)] border border-[var(--border-main)] rounded-lg hover:bg-[var(--input-bg)] hover:text-[var(--text-primary)] transition-all">
                            Cancel
                        </button>
                        <button
                            onClick={handle}
                            disabled={!canConfirm || running}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-primary)] ${confirmClass ?? 'bg-red-600 hover:bg-red-500'}`}
                        >
                            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Avatar Upload Section ────────────────────────────────────────

function AvatarUpload({ userId, currentUrl, onUpdated }: { userId: string; currentUrl: string; onUpdated: (url: string) => void }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errMsg, setErrMsg] = useState('');

    const handleFile = useCallback((f: File) => {
        if (f.size > MAX_AVATAR_MB * 1024 * 1024) {
            setErrMsg(`File too large — max ${MAX_AVATAR_MB} MB.`);
            return;
        }
        if (!f.type.startsWith('image/')) { setErrMsg('Only image files allowed.'); return; }
        setErrMsg('');
        setFile(f);
        const reader = new FileReader();
        reader.onload = e => setPreview(e.target?.result as string);
        reader.readAsDataURL(f);
    }, []);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setStatus('idle');
        try {
            const url = await uploadAvatar(userId, file);
            // Persist to user_metadata
            await supabase.auth.updateUser({ data: { avatar_url: url } });
            onUpdated(url);
            setPreview(null);
            setFile(null);
            setStatus('success');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (e: any) {
            setErrMsg(e.message ?? 'Upload failed');
            setStatus('error');
        } finally {
            setUploading(false);
        }
    };

    const displayUrl = preview ?? currentUrl;

    return (
        <div className="flex items-start gap-5">
            {/* Avatar Preview */}
            <div
                className="relative group cursor-pointer shrink-0"
                onClick={() => fileRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
            >
                <img
                    className="h-20 w-20 rounded-full border-2 border-[var(--border-main)] object-cover transition-opacity group-hover:opacity-70"
                    src={displayUrl}
                    alt="Avatar"
                />
                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-[var(--text-primary)]" />
                </div>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }}
                />
            </div>

            {/* Controls */}
            <div className="space-y-2 min-w-0">
                <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Profile Photo</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Max {MAX_AVATAR_MB} MB · JPG, PNG, or WebP</p>
                </div>

                {!file ? (
                    <button
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-400/50 bg-blue-500/5 px-3 py-1.5 rounded-lg transition-all"
                    >
                        <Camera className="w-3.5 h-3.5" /> Change photo
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            {uploading ? 'Uploading…' : 'Save Photo'}
                        </button>
                        <button
                            onClick={() => { setFile(null); setPreview(null); setErrMsg(''); }}
                            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-2 py-1.5"
                        >
                            Discard
                        </button>
                    </div>
                )}

                {errMsg && <p className="text-xs text-red-400">{errMsg}</p>}
                {status === 'success' && <p className="text-xs text-green-400">✓ Photo updated successfully</p>}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────

export const AccountSettings = () => {
    const { user, signOut } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
    const [avatarUrl, setAvatarUrl] = useState(
        user?.user_metadata?.avatar_url ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email?.split('@')[0] || 'U')}&background=2563eb&color=fff&size=128`
    );
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [newPassword, setNewPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordStatus, setPasswordStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Storage calculation
    const [storageUsed, setStorageUsed] = useState<number>(0);
    const STORAGE_QUOTA = 5 * 1024 * 1024 * 1024; // 5 GB default quota

    // UI Toggles & Prefs
    const [language, setLanguage] = useState(user?.user_metadata?.language || 'English (US)');
    const [timezone, setTimezone] = useState(user?.user_metadata?.timezone || 'Coordinated Universal Time (UTC)');
    const [emailNotifs, setEmailNotifs] = useState(user?.user_metadata?.email_notifications ?? true);
    const [notificationFrequency, setNotificationFrequency] = useState(user?.user_metadata?.notification_frequency || 'realtime');
    const [productUpdates, setProductUpdates] = useState(user?.user_metadata?.product_updates ?? true);
    const [securityAlerts, setSecurityAlerts] = useState(user?.user_metadata?.security_alerts ?? true);
    const [publicProfile, setPublicProfile] = useState(user?.user_metadata?.public_profile ?? false);
    const [visibility, setVisibility] = useState(user?.user_metadata?.visibility || 'everyone');
    const [copied, setCopied] = useState(false);
    
    // Connections
    const [ghConnected, setGhConnected] = useState(user?.user_metadata?.github_connected || false);
    const [orcidConnected, setOrcidConnected] = useState(user?.user_metadata?.orcid_connected || false);
    const [connectingTo, setConnectingTo] = useState<string | null>(null);

    const updatePreference = async (key: string, value: any) => {
        await supabase.auth.updateUser({ data: { [key]: value } });
    };

    const handleConnect = async (provider: string) => {
        setConnectingTo(provider);
        await new Promise(r => setTimeout(r, 800)); // Simulate OAuth handoff
        await updatePreference(`${provider}_connected`, true);
        if (provider === 'github') setGhConnected(true);
        if (provider === 'orcid') setOrcidConnected(true);
        setConnectingTo(null);
    };

    // Fetch storage
    useEffect(() => {
        if (!user) return;
        supabase.from('structures').select('file_size').eq('user_id', user.id).then(({ data }) => {
            if (data) setStorageUsed(data.reduce((acc, row) => acc + (row.file_size || 0), 0));
        });
    }, [user]);

    // Danger zone modals
    const [showClearModal, setShowClearModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
        setIsSaving(false);
        setSaveStatus(error ? 'error' : 'success');
        setTimeout(() => setSaveStatus('idle'), 3000);
    };

    const handleChangePassword = async () => {
        if (!newPassword || newPassword.length < 6) return;
        setIsChangingPassword(true);
        setPasswordStatus('idle');
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setIsChangingPassword(false);
        setPasswordStatus(error ? 'error' : 'success');
        setNewPassword('');
        setTimeout(() => setPasswordStatus('idle'), 3000);
    };

    const handleClearAllData = async () => {
        if (!user) return;
        // Delete all files from storage
        const { data: files } = await supabase.storage.from('structures').list(user.id);
        if (files?.length) {
            const paths = files.map((f: any) => `${user.id}/${f.name}`);
            await supabase.storage.from('structures').remove(paths);
        }
        // Delete DB rows (RLS will ensure only own data)
        await supabase.from('activity_log').delete().eq('user_id', user.id);
        await supabase.from('collections').delete().eq('user_id', user.id);
        await supabase.from('structures').delete().eq('user_id', user.id);
        setShowClearModal(false);
    };

    const handleDeleteAccount = async () => {
        if (!user) return;
        // 1. Clear user data first
        await handleClearAllData().catch(() => { });
        // 2. Delete avatar from storage
        const { data: avatars } = await supabase.storage.from('avatars').list(user.id);
        if (avatars?.length) {
            const paths = avatars.map((f: any) => `${user.id}/${f.name}`);
            await supabase.storage.from('avatars').remove(paths);
        }
        // 3. Sign out (account deletion requires admin API; we sign out and show a message)
        // Note: Full account deletion requires a Supabase Edge Function with service_role key.
        // We clear all data and sign out, then navigate to auth.
        await signOut();
        navigate('/auth?deleted=1');
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">{t.accountSettings}</h1>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">{t.settingsDesc}</p>
            </div>

            {/* Profile Card */}
            <div className="bg-[var(--bg-header)] border border-[var(--border-main)] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t.profileInfo}</h2>
                </div>
                <div className="p-6 space-y-6">
                    {/* Avatar Upload */}
                    {user && (
                        <AvatarUpload
                            userId={user.id}
                            currentUrl={avatarUrl}
                            onUpdated={url => setAvatarUrl(url)}
                        />
                    )}

                    <div className="border-t border-[var(--border-main)] pt-5 space-y-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{t.displayName}</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
                                className="w-full max-w-sm px-3 py-2.5 bg-[var(--bg-header)] border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={t.displayName as string}
                            />
                        </div>

                        {/* Email (readonly) */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{t.emailAddress}</label>
                            <div className="relative max-w-sm">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                <input
                                    type="email"
                                    disabled
                                    value={user?.email || ''}
                                    className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg-header)] border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-muted)] cursor-not-allowed"
                                />
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-1.5">{t.emailFixed}</p>
                        </div>

                        {/* Member since */}
                        <p className="text-xs text-[var(--text-muted)]">
                            Member since {new Date(user?.created_at || '').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>

                        {/* Save */}
                        <div className="flex items-center gap-3 pt-1">
                            <button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {t.saveChanges}
                            </button>
                            {saveStatus === 'success' && <span className="text-sm text-green-400">✓ Saved!</span>}
                            {saveStatus === 'error' && <span className="text-sm text-red-400">Failed to save.</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Storage Usage Card */}
            <div className="bg-[var(--bg-header)] border border-[var(--border-main)] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-orange-400" />
                        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t.storageUsage}</h2>
                    </div>
                    <span className="text-xs font-medium text-[var(--text-muted)]">{formatBytes(storageUsed)} / {formatBytes(STORAGE_QUOTA)}</span>
                </div>
                <div className="p-6">
                    <div className="relative h-2.5 w-full bg-[var(--input-bg)] rounded-full overflow-hidden mb-3">
                        <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, (storageUsed / STORAGE_QUOTA) * 100)}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-[var(--text-secondary)]"><strong>{((storageUsed / STORAGE_QUOTA) * 100).toFixed(1)}% / 100%</strong></p>
                        <button className="flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-lg border border-orange-500/20 hover:border-orange-500/40 transition-all">
                            <Zap className="w-3.5 h-3.5" /> {t.upgradePlan}
                        </button>
                    </div>
                </div>
            </div>

            {/* Preferences Card */}
            <div className="bg-[var(--bg-header)] border border-[var(--border-main)] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-cyan-400" />
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t.appPrefs}</h2>
                </div>
                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Language */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{t.language}</label>
                            <select 
                                value={language} 
                                onChange={e => { setLanguage(e.target.value); updatePreference('language', e.target.value); }}
                                className="w-full px-3 py-2 bg-[var(--bg-header)] border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] outline-none focus:border-blue-500">
                                <option>English (US)</option>
                                <option>Spanish (ES)</option>
                                <option>French (FR)</option>
                                <option>German (DE)</option>
                            </select>
                        </div>
                        {/* Timezone */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{t.timezone}</label>
                            <select 
                                value={timezone} 
                                onChange={e => { setTimezone(e.target.value); updatePreference('timezone', e.target.value); }}
                                className="w-full px-3 py-2 bg-[var(--bg-header)] border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] outline-none focus:border-blue-500">
                                <option>Pacific Time (PT)</option>
                                <option>Eastern Time (ET)</option>
                                <option>Central European Time (CET)</option>
                                <option>Coordinated Universal Time (UTC)</option>
                            </select>
                        </div>
                    </div>

                    <div className="border-t border-[var(--border-main)] pt-6 space-y-6">
                        {/* Notification Center */}
                        <div className="space-y-4">
                            <label className="flex items-start justify-between cursor-pointer group">
                                <div className="flex gap-3">
                                    <div className={`p-2 rounded-lg shrink-0 ${emailNotifs ? 'bg-cyan-500/10 text-cyan-500' : 'bg-neutral-800 text-neutral-500'}`}>
                                        <Bell className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">{t.emailNotifs}</p>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.emailNotifsDesc}</p>
                                    </div>
                                </div>
                                <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${emailNotifs ? 'bg-blue-600' : 'bg-neutral-600'}`}
                                    onClick={() => { const v = !emailNotifs; setEmailNotifs(v); updatePreference('email_notifications', v); }}>
                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${emailNotifs ? 'translate-x-2' : '-translate-x-2'}`} />
                                </div>
                            </label>

                            {emailNotifs && (
                                <div className="ml-12 p-4 bg-[var(--input-bg)]/30 rounded-xl border border-[var(--border-main)] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">{t.notificationFrequency}</label>
                                            <select 
                                                value={notificationFrequency}
                                                onChange={e => { setNotificationFrequency(e.target.value); updatePreference('notification_frequency', e.target.value); }}
                                                className="w-full px-3 py-1.5 bg-[var(--bg-header)] border border-[var(--border-main)] rounded-lg text-xs text-[var(--text-primary)] outline-none focus:border-blue-500">
                                                <option value="realtime">{t.realtime}</option>
                                                <option value="daily">{t.dailyDigest}</option>
                                                <option value="weekly">{t.weeklySummary}</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Categories</label>
                                            <div className="flex flex-col gap-2">
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <input type="checkbox" checked={securityAlerts} 
                                                        onChange={e => { setSecurityAlerts(e.target.checked); updatePreference('security_alerts', e.target.checked); }}
                                                        className="w-3.5 h-3.5 rounded border-[var(--border-main)] bg-[var(--bg-header)] text-blue-600 focus:ring-offset-0 focus:ring-0" />
                                                    <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">{t.securityAlerts}</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <input type="checkbox" checked={productUpdates} 
                                                        onChange={e => { setProductUpdates(e.target.checked); updatePreference('product_updates', e.target.checked); }}
                                                        className="w-3.5 h-3.5 rounded border-[var(--border-main)] bg-[var(--bg-header)] text-blue-600 focus:ring-offset-0 focus:ring-0" />
                                                    <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">{t.productUpdates}</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Privacy & Profile */}
                        <div className="space-y-4">
                            <label className="flex items-start justify-between cursor-pointer group">
                                <div className="flex gap-3">
                                    <div className={`p-2 rounded-lg shrink-0 ${publicProfile ? 'bg-emerald-500/10 text-emerald-500' : 'bg-neutral-800 text-neutral-500'}`}>
                                        <Globe className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">{t.publicPresence}</p>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.publicProfileDesc}</p>
                                    </div>
                                </div>
                                <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${publicProfile ? 'bg-blue-600' : 'bg-neutral-600'}`}
                                    onClick={() => { const v = !publicProfile; setPublicProfile(v); updatePreference('public_profile', v); }}>
                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${publicProfile ? 'translate-x-2' : '-translate-x-2'}`} />
                                </div>
                            </label>

                            {publicProfile && (
                                <div className="ml-12 p-4 bg-[var(--input-bg)]/30 rounded-xl border border-[var(--border-main)] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">{t.profileUrl}</label>
                                            <div className="flex gap-2">
                                                <div className="flex-1 px-3 py-1.5 bg-[var(--bg-header)] border border-[var(--border-main)] rounded-lg text-xs text-[var(--text-secondary)] font-mono truncate">
                                                    viewer.quercus.com/u/{fullName?.toLowerCase().replace(/\s+/g, '.') || user?.email?.split('@')[0]}
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const url = `viewer.quercus.com/u/${fullName?.toLowerCase().replace(/\s+/g, '.') || user?.email?.split('@')[0]}`;
                                                        navigator.clipboard.writeText(url);
                                                        setCopied(true);
                                                        setTimeout(() => setCopied(false), 2000);
                                                    }}
                                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
                                                >
                                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                    {copied ? t.copied : t.copyProfileLink}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-main)]/50">
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{t.visibility}</label>
                                                    <select 
                                                        value={visibility}
                                                        onChange={e => { setVisibility(e.target.value); updatePreference('visibility', e.target.value); }}
                                                        className="bg-transparent border-none p-0 text-xs text-blue-400 font-medium focus:ring-0 outline-none cursor-pointer hover:text-blue-300">
                                                        <option value="everyone" className="bg-[var(--bg-header)]">{t.everyone}</option>
                                                        <option value="onlyMe" className="bg-[var(--bg-header)]">{t.onlyMe}</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <a 
                                                href={`#`} 
                                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 font-medium"
                                                onClick={e => e.preventDefault()}
                                            >
                                                {t.viewProfile} <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Connected Accounts Card */}
            <div className="bg-[var(--bg-header)] border border-[var(--border-main)] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t.connectedIntegrations}</h2>
                </div>
                <div className="divide-y divide-[var(--border-main)]">
                    {/* Google */}
                    <div className="flex items-center justify-between p-5 hover:bg-[var(--input-bg)]/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">Google Workspace</p>
                                <p className="text-xs text-[var(--text-muted)]">Single Sign-On authentication</p>
                            </div>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-md">Connected</span>
                    </div>
                    {/* GitHub */}
                    <div className="flex items-center justify-between p-5 hover:bg-[var(--input-bg)]/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center shrink-0">
                                <Github className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">GitHub</p>
                                <p className="text-xs text-[var(--text-muted)]">Import repositories and scripts</p>
                            </div>
                        </div>
                        {ghConnected ? (
                            <span className="text-xs font-medium px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-md">Connected</span>
                        ) : (
                            <button onClick={() => handleConnect('github')} disabled={connectingTo === 'github'}
                                className="text-xs font-medium px-4 py-1.5 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-main)] hover:bg-[var(--border-main)] rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5">
                                {connectingTo === 'github' && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Connect
                            </button>
                        )}
                    </div>
                    {/* ORCID */}
                    <div className="flex items-center justify-between p-5 hover:bg-[var(--input-bg)]/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#A6CE39]/10 border border-[#A6CE39]/30 flex items-center justify-center shrink-0">
                                <span className="font-bold text-[#A6CE39] text-sm">iD</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">ORCID iD</p>
                                <p className="text-xs text-[var(--text-muted)]">Link researcher identity</p>
                            </div>
                        </div>
                        {orcidConnected ? (
                            <span className="text-xs font-medium px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-md">Connected</span>
                        ) : (
                            <button onClick={() => handleConnect('orcid')} disabled={connectingTo === 'orcid'}
                                className="text-xs font-medium px-4 py-1.5 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-main)] hover:bg-[var(--border-main)] rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5">
                                {connectingTo === 'orcid' && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Connect
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Security Card */}
            <div className="bg-[var(--bg-header)] border border-[var(--border-main)] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-400" />
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t.security}</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{t.newPassword}</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                            className="w-full max-w-sm px-3 py-2.5 bg-[var(--bg-header)] border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={t.newPassword as string}
                        />
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                        <button
                            onClick={handleChangePassword}
                            disabled={isChangingPassword || newPassword.length < 6}
                            className="flex items-center gap-2 border border-[var(--border-main)] hover:border-neutral-500 hover:bg-[var(--input-bg)] text-[var(--text-secondary)] px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                        >
                            {isChangingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {t.changePwd}
                        </button>
                        {passwordStatus === 'success' && <span className="text-sm text-green-400">✓ Password updated!</span>}
                        {passwordStatus === 'error' && <span className="text-sm text-red-400">Failed to update password.</span>}
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-[var(--bg-header)] border border-red-500/25 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-red-500/20 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <h2 className="text-sm font-semibold text-red-400">{t.dangerZone}</h2>
                </div>
                <div className="divide-y divide-red-500/10">
                    {/* Clear all data */}
                    <div className="p-6 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{t.clearData}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5 max-w-xs">
                                {t.clearDataDesc}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowClearModal(true)}
                            className="shrink-0 flex items-center gap-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            {t.clearData}
                        </button>
                    </div>

                    {/* Delete account */}
                    <div className="p-6 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{t.deleteAccount}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5 max-w-xs">
                                {t.deleteAccountDesc}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="shrink-0 flex items-center gap-2 bg-red-600/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 hover:border-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        >
                            <X className="w-3.5 h-3.5" />
                            {t.deleteAccount}
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Modals */}
            {showClearModal && (
                <ConfirmModal
                    title="Clear All Data"
                    description="This will permanently delete all your uploaded structures, files, collections, and activity history from Supabase. Your account will remain active. This cannot be undone."
                    confirmLabel="Clear All Data"
                    requirePhrase="clear my data"
                    onConfirm={handleClearAllData}
                    onClose={() => setShowClearModal(false)}
                />
            )}
            {showDeleteModal && (
                <ConfirmModal
                    title="Delete Account"
                    description="This will delete all your data and sign you out permanently. Type your email address to confirm."
                    confirmLabel="Delete My Account"
                    requirePhrase={user?.email ?? 'delete'}
                    onConfirm={handleDeleteAccount}
                    onClose={() => setShowDeleteModal(false)}
                />
            )}
        </div>
    );
};
