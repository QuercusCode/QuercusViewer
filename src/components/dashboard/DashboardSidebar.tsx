import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    FolderOpen, Video, Settings, LogOut, ChevronLeft, 
    Atom, BarChart2, NotebookPen, PanelLeftClose, PanelLeftOpen 
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

interface DashboardSidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ isCollapsed, onToggle }) => {
    const { pathname } = useLocation();
    const { signOut, user } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const navItems = [
        { label: 'My Structures', path: '/dashboard/structures', icon: FolderOpen },
        { label: 'Lab Notebook', path: '/dashboard/notebook', icon: NotebookPen },
        { label: 'Studio Drafts', path: '/dashboard/drafts', icon: Video },
        { label: 'Activity', path: '/dashboard/activity', icon: BarChart2 },
        { label: 'Account Settings', path: '/dashboard/settings', icon: Settings },
    ];

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[var(--bg-sidebar)] border-r border-[var(--border-main)] hidden md:flex flex-col h-screen shrink-0 sticky top-0 transition-all duration-300 ease-in-out z-10`}>
            {/* Logo / App Name */}
            <div className={`h-16 flex items-center px-5 border-b border-[var(--border-main)] justify-between gap-3 ${isCollapsed ? 'px-0 justify-center' : ''}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                        <Atom className="w-5 h-5 text-white" />
                    </div>
                    {!isCollapsed && <span className="font-bold text-[var(--text-primary)] tracking-tight text-sm whitespace-nowrap">Quercus Viewer</span>}
                </div>
                {!isCollapsed && (
                    <button 
                        onClick={onToggle}
                        className="p-1.5 hover:bg-[var(--input-bg)] rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        title="Collapse Sidebar"
                    >
                        <PanelLeftClose className="w-4 h-4" />
                    </button>
                )}
            </div>
            
            {isCollapsed && (
                <div className="flex justify-center py-2 absolute -right-3 top-20 z-20">
                    <button 
                        onClick={onToggle}
                        className="p-1.5 bg-[var(--bg-header)] border border-[var(--border-main)] rounded-full text-[var(--text-muted)] hover:text-blue-400 hover:border-blue-500/30 transition-all shadow-xl active:scale-95"
                        title="Expand Sidebar"
                    >
                        <PanelLeftOpen className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Nav */}
            <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
                {!isCollapsed && <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4 px-2 mt-2">Navigation</p>}
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.path);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                title={isCollapsed ? item.label : undefined}
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--input-bg)] hover:text-[var(--text-primary)] border border-transparent'
                                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                            >
                                <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`} />
                                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-6 pt-6 border-t border-[var(--border-main)]">
                    {!isCollapsed && <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4 px-2">App</p>}
                    <Link
                        to="/"
                        title={isCollapsed ? "Back to Viewer" : undefined}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--input-bg)] hover:text-[var(--text-primary)] transition-all border border-transparent group ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                        <ChevronLeft className={`w-5 h-5 transition-colors ${isCollapsed ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'} shrink-0`} />
                        {!isCollapsed && <span className="whitespace-nowrap">Back to Viewer</span>}
                    </Link>
                </div>
            </div>

            {/* User Footer */}
            <div className="p-3 border-t border-[var(--border-main)] bg-[var(--bg-sidebar)]/50">
                <div className={`flex items-center gap-3 px-2 py-2.5 rounded-xl mb-1 ${isCollapsed ? 'justify-center' : ''}`}>
                    <img
                        className="h-8 w-8 rounded-full border border-[var(--border-main)] object-cover shrink-0"
                        src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email?.split('@')[0] || 'U')}&background=2563eb&color=fff`}
                        alt="Avatar"
                    />
                    {!isCollapsed && (
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-[var(--text-primary)] truncate">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</p>
                            <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleSignOut}
                    title={isCollapsed ? "Sign Out" : undefined}
                    className={`flex items-center gap-3 px-3 py-3 w-full rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent group ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                    <LogOut className="w-5 h-5 shrink-0 transition-colors group-hover:text-red-400" />
                    {!isCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
                </button>
            </div>
        </aside>
    );
};
