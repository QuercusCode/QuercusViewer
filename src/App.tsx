import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import ViewerApp from './ViewerApp';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { MyStructures } from './components/dashboard/MyStructures';
import { StudioDrafts } from './components/dashboard/StudioDrafts';
import { AuthPage } from './components/auth/AuthPage';
import { AccountSettings } from './components/dashboard/AccountSettings';

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
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Main Viewer App - accessible to everyone */}
                    <Route path="/" element={<ViewerApp />} />

                    {/* Authentication */}
                    <Route path="/auth" element={<AuthPage />} />

                    {/* Protected Dashboard Routes */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <DashboardLayout />
                            </ProtectedRoute>
                        }
                    >
                        {/* Redirect /dashboard to /dashboard/structures */}
                        <Route index element={<Navigate to="structures" replace />} />

                        <Route path="structures" element={<MyStructures />} />
                        <Route path="drafts" element={<StudioDrafts />} />
                        <Route path="settings" element={<AccountSettings />} />
                    </Route>

                    {/* Catch all route - redirect to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
