import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';

export const DashboardLayout = () => {
    const { pathname } = useLocation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Auto-collapse on notebook view entry
    useEffect(() => {
        if (pathname === '/dashboard/notebook') {
            setIsSidebarCollapsed(true);
        } else {
            setIsSidebarCollapsed(false);
        }
    }, [pathname]);

    return (
        <div className="absolute inset-0 w-full h-full flex bg-[var(--bg-main)] flex-col md:flex-row font-sans overflow-hidden transition-colors duration-300">
            <DashboardSidebar 
                isCollapsed={isSidebarCollapsed} 
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
            />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <DashboardHeader />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 shrink-0 relative custom-scrollbar">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
