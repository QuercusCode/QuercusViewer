import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { ThemeProvider } from './lib/ThemeContext';

// Every route below pulls in a distinct, often heavy dependency tree (the 3D
// viewer engines, jsPDF, the rich-text editor, pptxgenjs, etc.) — none of which
// the Landing Page needs. Route-level lazy-loading means a first-time visitor
// downloads only the Landing Page's own code, not the entire app.
const LandingPage = lazy(() => import('./components/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const ViewerApp = lazy(() => import('./ViewerApp'));
const AuthPage = lazy(() => import('./components/auth/AuthPage').then(m => ({ default: m.AuthPage })));
const PublicPortfolio = lazy(() => import('./components/public/PublicPortfolio').then(m => ({ default: m.PublicPortfolio })));
const DashboardLayout = lazy(() => import('./components/dashboard/DashboardLayout').then(m => ({ default: m.DashboardLayout })));
const DashboardHome = lazy(() => import('./components/dashboard/DashboardHome').then(m => ({ default: m.DashboardHome })));
const MyStructures = lazy(() => import('./components/dashboard/MyStructures').then(m => ({ default: m.MyStructures })));
const LabNotebook = lazy(() => import('./components/dashboard/LabNotebook').then(m => ({ default: m.LabNotebook })));
const StudioDrafts = lazy(() => import('./components/dashboard/StudioDrafts').then(m => ({ default: m.StudioDrafts })));
const AccountSettings = lazy(() => import('./components/dashboard/AccountSettings').then(m => ({ default: m.AccountSettings })));
const ActivityTimeline = lazy(() => import('./components/dashboard/ActivityTimeline').then(m => ({ default: m.ActivityTimeline })));

const RouteFallback = () => (
    <div className="h-screen w-screen flex items-center justify-center bg-neutral-950">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-700 border-t-blue-500" />
    </div>
);

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
                    <Suspense fallback={<RouteFallback />}>
                        <Routes>
                            {/* Landing Page */}
                            <Route path="/" element={<LandingPage />} />

                            {/* Main Viewer App - accessible to everyone */}
                            <Route path="/app" element={<ViewerApp />} />

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
                    </Suspense>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
