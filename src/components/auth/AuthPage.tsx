import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';

export const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useTranslation();

    // If user is already logged in, redirect them
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                // successful login will naturally trigger onAuthStateChange
                // and the <ProtectedRoute> or this component will redirect
                navigate('/dashboard');
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setSuccessMessage(t.authRegistrationSuccess as string);
                setIsLogin(true);
            }
        } catch (err: any) {
            setError(err.message || (t.authErrorOccurred as string));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">

            {/* Top Navigation */}
            <div className="absolute top-6 left-6">
                <Link to="/" className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    {t.authBackToViewer as string}
                </Link>
            </div>

            <div className="w-full max-w-md">
                {/* Branding */}
                <div className="flex flex-col items-center mb-8">
                    <img src="/logo/icon-white.png" alt="Quercus Logo" className="w-12 h-12 mb-4" />
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        {isLogin ? (t.authWelcomeBack as string) : (t.authCreateAccount as string)}
                    </h1>
                    <p className="text-neutral-400 text-sm mt-2">
                        {isLogin ? (t.authLoginDesc as string) : (t.authSignUpDesc as string)}
                    </p>
                </div>

                {/* Card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Status Messages */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3">
                                {error}
                            </div>
                        )}
                        {successMessage && (
                            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg p-3">
                                {successMessage}
                            </div>
                        )}

                        {/* Email Field */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1.5" htmlFor="email">
                                {t.authEmailLabel as string}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1.5" htmlFor="password">
                                {t.authPasswordLabel as string}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isLogin ? (t.authLogIn as string) : (t.authSignUp as string)}
                        </button>
                    </form>

                    {/* Toggle Mode */}
                    <div className="mt-6 text-center text-sm text-neutral-400">
                        {isLogin ? (t.authNoAccount as string) : (t.authHaveAccount as string)}{' '}
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError(null);
                                setSuccessMessage(null);
                            }}
                            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            {isLogin ? (t.authSignUpLink as string) : (t.authLogInLink as string)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
