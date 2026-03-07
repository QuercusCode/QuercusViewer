import { Outlet } from 'react-router-dom';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';

export const DashboardLayout = () => {
    return (
        <div className="min-h-screen flex bg-neutral-950 flex-col md:flex-row font-sans">
            <DashboardSidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <DashboardHeader />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 shrink-0">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
