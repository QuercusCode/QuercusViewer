import { useAuth } from '../../lib/AuthContext';
import { Menu, Search, Bell } from 'lucide-react';

export const DashboardHeader = () => {
    const { user } = useAuth();

    return (
        <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Button - can implement toggle later */}
                <button className="md:hidden p-2 text-gray-400 hover:text-gray-600">
                    <Menu className="w-5 h-5" />
                </button>

                {/* Optional Search Bar */}
                <div className="hidden md:flex relative max-w-md w-full ml-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                        placeholder="Search structures..."
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                <div className="h-8 w-px bg-gray-200 mx-2 hidden md:block"></div>

                <div className="flex items-center gap-3 cursor-pointer group">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-sm font-medium text-gray-800 tracking-tight group-hover:text-blue-600 transition-colors">
                            {user?.user_metadata?.full_name || 'User'}
                        </span>
                        <span className="text-xs text-gray-500 leading-none group-hover:text-blue-400 transition-colors">
                            {user?.email || ''}
                        </span>
                    </div>
                    <img
                        className="h-8 w-8 rounded-full border border-gray-200 bg-gray-50"
                        src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.email || 'User'}&background=random`}
                        alt=""
                    />
                </div>
            </div>
        </header>
    );
};
