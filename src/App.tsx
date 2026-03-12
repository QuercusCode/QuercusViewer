import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import ViewerApp from './ViewerApp';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { MyStructures } from './components/dashboard/MyStructures';
import { StudioDrafts } from './components/dashboard/StudioDrafts';
import { AuthPage } from './components/auth/AuthPage';
import { AccountSettings } from './components/dashboard/AccountSettings';
import { ActivityTimeline } from './components/dashboard/ActivityTimeline';
import { DashboardHome } from './components/dashboard/DashboardHome';
import { LabNotebook } from './components/dashboard/LabNotebook';
import { PublicPortfolio } from './components/public/PublicPortfolio';
import { ThemeProvider } from './lib/ThemeContext';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { session, loading } = useAuth();

    if (loading) {
        return <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
    }

    if (!session) {
        return <Navigate to="/auth" replace />;
    }

    return <>{children}</>;
};

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <Router>
                    <Routes>
                        {/* Main Viewer App - accessible to everyone */}
                        <Route path="/" element={<ViewerApp />} />

                        {/* Authentication */}
                        <Route path="/auth" element={<AuthPage />} />

                        {/* Public Shared Portfolios */}
                        <Route path="/share/:collectionId" element={<PublicPortfolio />} />

                        {/* Protected Dashboard Routes */}
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <DashboardLayout />
                                </ProtectedRoute>
                            }
                        >
                            {/* Dashboard home — overview with stats */}
                            <Route index element={<DashboardHome />} />

                            <Route path="structures" element={<MyStructures />} />
                            <Route path="notebook" element={<LabNotebook />} />
                            <Route path="drafts" element={<StudioDrafts />} />
                            <Route path="settings" element={<AccountSettings />} />
                            <Route path="activity" element={<ActivityTimeline />} />
                        </Route>

                        {/* Catch all route - redirect to home */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
