import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FolderOpen, Video, Settings, LogOut, ChevronLeft, Atom, BarChart2 } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

export const DashboardSidebar = () => {
    const { pathname } = useLocation();
    const { signOut, user } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const navItems = [
        { label: 'My Structures', path: '/dashboard/structures', icon: FolderOpen },
        { label: 'Studio Drafts', path: '/dashboard/drafts', icon: Video },
        { label: 'Activity', path: '/dashboard/activity', icon: BarChart2 },
        { label: 'Account Settings', path: '/dashboard/settings', icon: Settings },
    ];

    return (
        <aside className="w-64 bg-neutral-950 border-r border-neutral-800 hidden md:flex flex-col h-screen shrink-0 sticky top-0">
            {/* Logo / App Name */}
            <div className="h-16 flex items-center px-5 border-b border-neutral-800 gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <Atom className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white tracking-tight text-sm">Quercus Viewer</span>
            </div>

            {/* Nav */}
            <div className="p-3 flex-1 overflow-y-auto">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2 px-2 mt-2">Navigation</p>
                <nav className="space-y-0.5">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.path);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive
                                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/15'
                                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 border border-transparent'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-neutral-500'}`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-4 pt-4 border-t border-neutral-800">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2 px-2">App</p>
                    <Link
                        to="/"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 transition-all border border-transparent"
                    >
                        <ChevronLeft className="w-4 h-4 text-neutral-500 shrink-0" />
                        Back to Viewer
                    </Link>
                </div>
            </div>

            {/* User Footer */}
            <div className="p-3 border-t border-neutral-800">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1">
                    <img
                        className="h-8 w-8 rounded-full border border-neutral-700 object-cover shrink-0"
                        src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email?.split('@')[0] || 'U')}&background=2563eb&color=fff`}
                        alt="Avatar"
                    />
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-100 truncate">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</p>
                        <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-neutral-400 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent"
                >
                    <LogOut className="w-4 h-4 shrink-0" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
};
