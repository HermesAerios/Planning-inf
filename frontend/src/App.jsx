import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Loader2 } from 'lucide-react';

import Login from './pages/Login';
import Layout from './components/layout/Layout';

import ErrorBoundary from './components/common/ErrorBoundary';
import NotFound from './pages/NotFound';
import ServerError from './pages/ServerError';

// Lazy Load Pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Patients = React.lazy(() => import('./pages/Patients'));
const Optimisation = React.lazy(() => import('./pages/Optimisation'));
const NurseTournee = React.lazy(() => import('./pages/NurseTournee'));
const Users = React.lazy(() => import('./pages/Users'));
const AllTournees = React.lazy(() => import('./pages/AllTournees'));
const Settings = React.lazy(() => import('./pages/Settings'));

const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
);

import InstallPWA from './components/common/InstallPWA';

// ... (keep routes as is, just updating the Layout import)

// Protected Route wrapper
const ProtectedRoute = ({ roles }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;

    // Debug logging
    console.log('ProtectedRoute:', { userRole: user.role, allowedRoles: roles });

    // Redirect logic for wrong role
    if (roles && !roles.includes(user.role)) {
        console.warn('Access denied. Redirecting...');
        // If nurse tries to access admin page, send to tournee
        if (user.role === 'infirmier') return <Navigate to="/tournee" replace />;
        // Default fallback to login to avoid loops if / redirects to here
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};



// ... other imports ...

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <ThemeProvider>
                    <Router>
                        <Suspense fallback={<PageLoader />}>
                            <Routes>
                                <Route path="/login" element={<Login />} />

                                {/* Desktop / Admin Routes */}
                                <Route element={<Layout />}>
                                    <Route element={<ProtectedRoute roles={['admin', 'planificateur']} />}>
                                        <Route path="/" element={<Navigate to="/dashboard" />} />
                                        <Route path="/dashboard" element={<Dashboard />} />
                                        <Route path="/patients" element={<Patients />} />
                                        <Route path="/optimisation" element={<Optimisation />} />
                                        <Route path="/users" element={<Users />} />
                                        <Route path="/tournees" element={<AllTournees />} />
                                        <Route path="/settings" element={<Settings />} />
                                    </Route>

                                    {/* Nurse Routes - Mobile optimized but accessible inside layout for now or separate */}
                                    <Route element={<ProtectedRoute roles={['infirmier', 'admin']} />}>
                                        <Route path="/tournee" element={<NurseTournee />} />
                                    </Route>
                                </Route>

                                {/* Fallback 404 */}
                                <Route path="/server-error" element={<ServerError />} />
                                <Route path="*" element={<NotFound />} />
                            </Routes>
                        </Suspense>
                        <ToastContainer />
                        <InstallPWA />
                    </Router>
                </ThemeProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
