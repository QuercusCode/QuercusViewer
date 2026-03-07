import { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { User, Mail, Shield, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const AccountSettings = () => {
    const { user } = useAuth();
    const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [newPassword, setNewPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordStatus, setPasswordStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-white tracking-tight">Account Settings</h1>
                <p className="text-sm text-neutral-500 mt-0.5">Manage your profile and security preferences.</p>
            </div>

            {/* Profile Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <h2 className="text-sm font-semibold text-white">Profile Information</h2>
                </div>
                <div className="p-6 space-y-5">
                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                        <img
                            className="h-16 w-16 rounded-full border-2 border-neutral-700 object-cover"
                            src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email?.split('@')[0] || 'U')}&background=2563eb&color=fff&size=128`}
                            alt="Profile"
                        />
                        <div>
                            <p className="text-sm font-medium text-neutral-200">{user?.email}</p>
                            <p className="text-xs text-neutral-500 mt-0.5">Joined {new Date(user?.created_at || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>

                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1.5">Display Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
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

                    {/* Save Button */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Save Changes
                        </button>
                        {saveStatus === 'success' && <span className="text-sm text-green-400">Saved!</span>}
                        {saveStatus === 'error' && <span className="text-sm text-red-400">Failed to save.</span>}
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
                        {passwordStatus === 'success' && <span className="text-sm text-green-400">Password updated!</span>}
                        {passwordStatus === 'error' && <span className="text-sm text-red-400">Failed to update password.</span>}
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-neutral-900 border border-red-500/20 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-red-500/20 flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
                </div>
                <div className="p-6 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-neutral-200">Delete Account</p>
                        <p className="text-xs text-neutral-500 mt-0.5">Permanently deletes your account and all associated data.</p>
                    </div>
                    <button className="shrink-0 border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-all">
                        Delete Account
                    </button>
                </div>
            </div>
        </div>
    );
};
