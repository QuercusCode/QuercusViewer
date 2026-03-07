import { useAuth } from '../../lib/AuthContext';
import { Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
    '/dashboard/structures': { title: 'My Structures', subtitle: 'Manage and visualize your uploaded PDB and CIF files.' },
    '/dashboard/drafts': { title: 'Studio Drafts', subtitle: 'Your saved video timelines and molecular animations.' },
    '/dashboard/settings': { title: 'Account Settings', subtitle: 'Manage your profile and security preferences.' },
};

export const DashboardHeader = () => {
    const { user } = useAuth();
    const { pathname } = useLocation();

    const page = Object.entries(pageTitles).find(([key]) => pathname.startsWith(key));
    const { title, subtitle } = page?.[1] ?? { title: 'Dashboard', subtitle: '' };

    return (
        <header className="h-16 bg-neutral-900 border-b border-neutral-800 px-6 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
            {/* Page Title */}
            <div className="flex flex-col justify-center">
                <h1 className="text-base font-semibold text-white leading-tight">{title}</h1>
                {subtitle && <p className="text-xs text-neutral-500 hidden md:block">{subtitle}</p>}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
                {/* Search */}
                <div className="hidden md:flex relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-3.5 w-3.5 text-neutral-500" />
                    </div>
                    <input
                        type="text"
                        className="block w-52 pl-9 pr-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm placeholder-neutral-500 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="Search..."
                    />
                </div>

                {/* Separator */}
                <div className="h-6 w-px bg-neutral-800 mx-1 hidden md:block" />

                {/* User chip */}
                <div className="flex items-center gap-2 cursor-pointer group">
                    <img
                        className="h-7 w-7 rounded-full border border-neutral-700 object-cover"
                        src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email?.split('@')[0] || 'U')}&background=2563eb&color=fff`}
                        alt="Avatar"
                    />
                    <span className="text-sm font-medium text-neutral-300 hidden lg:block group-hover:text-white transition-colors">
                        {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                    </span>
                </div>
            </div>
        </header>
    );
};
