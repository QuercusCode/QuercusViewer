import { useAuth } from '../../lib/AuthContext';
import { Search, Moon, Sun, EyeOff, Menu, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../lib/ThemeContext';
import { useTranslation } from '../../lib/i18n';

interface DashboardHeaderProps {
    onMenuClick?: () => void;
}

export const DashboardHeader = ({ onMenuClick }: DashboardHeaderProps) => {
    const { user } = useAuth();
    const { pathname } = useLocation();
    const { theme, toggleTheme } = useTheme();
    const { t } = useTranslation();
    const returnUrl = sessionStorage.getItem('viewer_return_url') || '/viewer';

    const pageTitles: Record<string, { title: string; subtitle: string }> = {
        '/dashboard/structures': { title: t.myStructuresTitle as string, subtitle: t.myStructuresDesc as string },
        '/dashboard/drafts': { title: t.studioDrafts as string, subtitle: t.studioDraftsSubtitle as string },
        '/dashboard/settings': { title: t.accountSettings as string, subtitle: t.settingsDesc as string },
    };

    const page = Object.entries(pageTitles).find(([key]) => pathname.startsWith(key));
    const { title, subtitle } = page?.[1] ?? { title: t.nav as string, subtitle: '' };

    return (
        <header className="h-16 bg-[var(--bg-header)] border-b border-[var(--border-main)] px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-50 transition-colors duration-300">
            {/* Page Title & Hamburger */}
            <div className="flex items-center gap-3">
                <button 
                    onClick={onMenuClick}
                    className="md:hidden p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--input-bg)] transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div className="flex flex-col justify-center">
                    <h1 className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{title}</h1>
                    {subtitle && <p className="text-[11px] text-[var(--text-muted)] hidden md:block mt-0.5">{subtitle}</p>}
                </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
                {/* Return to Viewer */}
                <Link
                    to={returnUrl}
                    className="flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium border border-[var(--border-main)] bg-[var(--input-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-blue-500/40 hover:bg-blue-500/5 transition-all"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.backToViewer as string}</span>
                </Link>

                {/* Search */}
                <div className="hidden md:flex relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    </div>
                    <input
                        type="text"
                        className="block w-48 pl-9 pr-3 py-1.5 bg-[var(--input-bg)] border border-[var(--border-main)] rounded-lg text-sm placeholder-[var(--text-muted)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder={t.searchPlaceholder as string}
                    />
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 hover:bg-[var(--input-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-all border border-transparent hover:border-[var(--border-main)]"
                    title={`Current: ${theme.replace('-', ' ')}. Click to cycle themes (Light → Dark → Dark-Room)`}
                >
                    {theme === 'light' ? <Sun className="h-4 w-4" /> : 
                     theme === 'dark' ? <Moon className="h-4 w-4" /> : 
                     <EyeOff className="h-4 w-4 text-red-500" />}
                </button>

                {/* Separator */}
                <div className="h-6 w-px bg-[var(--border-main)] mx-1 hidden md:block" />

                {/* User chip */}
                <div className="flex items-center gap-2 cursor-pointer group">
                    <img
                        className="h-7 w-7 rounded-full border border-[var(--border-main)] object-cover"
                        src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email?.split('@')[0] || 'U')}&background=2563eb&color=fff`}
                        alt="Avatar"
                    />
                    <span className="text-sm font-medium text-[var(--text-secondary)] hidden lg:block group-hover:text-[var(--text-primary)] transition-colors">
                        {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                    </span>
                </div>
            </div>
        </header>
    );
};
