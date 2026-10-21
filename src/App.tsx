import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { ThemeProvider } from './lib/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';

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

// A render crash scoped to the viewer route previously took down the whole
// SPA — Router, AuthProvider, ThemeProvider, and all UI chrome — down to the
// generic root-level fallback. This boundary keeps a viewer crash contained
// to the /app route, and offers a way back to the rest of the app without a
// full page reload.
const ViewerCrashFallback = () => (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-neutral-950 text-white p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">The viewer ran into a problem.</h1>
        <p className="text-neutral-400 mb-6 max-w-md">This usually means a structure or setting caused a rendering error. Reloading the viewer should fix it.</p>
        <div className="flex gap-3">
            <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-700"
            >
                Reload Viewer
            </button>
            <Link
                to="/"
                className="px-4 py-2 bg-neutral-800 rounded text-white hover:bg-neutral-700"
            >
                Go Home
            </Link>
        </div>
    </div>
);

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
                            <Route path="/app" element={
                                <ErrorBoundary fallback={<ViewerCrashFallback />}>
                                    <ViewerApp />
                                </ErrorBoundary>
                            } />

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
