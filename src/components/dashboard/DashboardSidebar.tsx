import { Link, useLocation } from 'react-router-dom';
import { FolderOpen, Video, Settings, LogOut, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

export const DashboardSidebar = () => {
    const { pathname } = useLocation();
    const { signOut } = useAuth();

    const navItems = [
        { label: 'My Structures', path: '/dashboard/structures', icon: FolderOpen },
        { label: 'Studio Drafts', path: '/dashboard/drafts', icon: Video },
        { label: 'Account Settings', path: '/dashboard/settings', icon: Settings },
    ];

    return (
        <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col h-screen shrink-0 sticky top-0">
            <div className="h-16 flex items-center px-6 border-b border-gray-200">
                <Link to="/" className="flex items-center gap-2 group">
                    <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    <span className="font-semibold text-gray-800 tracking-tight group-hover:text-blue-500 transition-colors">Back to Viewer</span>
                </Link>
            </div>

            <div className="p-4 flex-1">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">Dashboard</div>
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.path);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="p-4 border-t border-gray-200">
                <button
                    onClick={signOut}
                    className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                    <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-600" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
};
