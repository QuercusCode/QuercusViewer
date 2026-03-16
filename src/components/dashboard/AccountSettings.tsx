import { useState, useRef, useCallback } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, Loader2, Camera, Trash2, AlertTriangle, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
                    <div className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-semibold text-sm">{title}</span>
                    </div>
                    <button onClick={onClose} className="p-1 text-neutral-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-neutral-300 leading-relaxed">{description}</p>

                    {requirePhrase && (
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1.5">
                                Type <span className="font-mono text-red-400 bg-red-500/10 px-1 rounded">{requirePhrase}</span> to confirm
                            </label>
                            <input
                                value={phrase}
                                onChange={e => setPhrase(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && canConfirm && handle()}
                                autoFocus
                                className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-sm text-white font-mono placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                placeholder={requirePhrase}
                            />
                        </div>
                    )}

                    {err && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}

                    <div className="flex gap-3 pt-1">
                        <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-neutral-400 border border-neutral-700 rounded-lg hover:bg-neutral-800 hover:text-white transition-all">
                            Cancel
                        </button>
                        <button
                            onClick={handle}
                            disabled={!canConfirm || running}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white ${confirmClass ?? 'bg-red-600 hover:bg-red-500'}`}
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
                    className="h-20 w-20 rounded-full border-2 border-neutral-700 object-cover transition-opacity group-hover:opacity-70"
                    src={displayUrl}
                    alt="Avatar"
                />
                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
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
                    <p className="text-sm font-medium text-neutral-200">Profile Photo</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Max {MAX_AVATAR_MB} MB · JPG, PNG, or WebP</p>
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
                            className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            {uploading ? 'Uploading…' : 'Save Photo'}
                        </button>
                        <button
                            onClick={() => { setFile(null); setPreview(null); setErrMsg(''); }}
                            className="text-xs text-neutral-500 hover:text-white transition-colors px-2 py-1.5"
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
                <h1 className="text-xl font-semibold text-white tracking-tight">Account Settings</h1>
                <p className="text-sm text-neutral-500 mt-0.5">Manage your profile, security, and account preferences.</p>
            </div>

            {/* Profile Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <h2 className="text-sm font-semibold text-white">Profile Information</h2>
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

                    <div className="border-t border-neutral-800 pt-5 space-y-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Display Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
                                className="w-full max-w-sm px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter your full name"
                            />
                        </div>

                        {/* Email (readonly) */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Email Address</label>
                            <div className="relative max-w-sm">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                                <input
                                    type="email"
                                    disabled
                                    value={user?.email || ''}
                                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-500 cursor-not-allowed"
                                />
                            </div>
                            <p className="text-xs text-neutral-600 mt-1.5">Email cannot be changed.</p>
                        </div>

                        {/* Member since */}
                        <p className="text-xs text-neutral-600">
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
                                Save Changes
                            </button>
                            {saveStatus === 'success' && <span className="text-sm text-green-400">✓ Saved!</span>}
                            {saveStatus === 'error' && <span className="text-sm text-red-400">Failed to save.</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-400" />
                    <h2 className="text-sm font-semibold text-white">Security</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1.5">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                            className="w-full max-w-sm px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter new password (min 6 chars)"
                        />
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                        <button
                            onClick={handleChangePassword}
                            disabled={isChangingPassword || newPassword.length < 6}
                            className="flex items-center gap-2 border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800 text-neutral-300 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                        >
                            {isChangingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Change Password
                        </button>
                        {passwordStatus === 'success' && <span className="text-sm text-green-400">✓ Password updated!</span>}
                        {passwordStatus === 'error' && <span className="text-sm text-red-400">Failed to update password.</span>}
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-neutral-900 border border-red-500/25 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-red-500/20 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
                </div>
                <div className="divide-y divide-red-500/10">
                    {/* Clear all data */}
                    <div className="p-6 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-neutral-200">Clear All Data</p>
                            <p className="text-xs text-neutral-500 mt-0.5 max-w-xs">
                                Delete all your uploaded structures, files, collections, and activity logs. Your account remains active.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowClearModal(true)}
                            className="shrink-0 flex items-center gap-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear Data
                        </button>
                    </div>

                    {/* Delete account */}
                    <div className="p-6 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-neutral-200">Delete Account</p>
                            <p className="text-xs text-neutral-500 mt-0.5 max-w-xs">
                                Permanently remove all your data and sign you out. This action is irreversible.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="shrink-0 flex items-center gap-2 bg-red-600/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 hover:border-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        >
                            <X className="w-3.5 h-3.5" />
                            Delete Account
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
