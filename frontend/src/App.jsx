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

// Protected Route wrapper
const ProtectedRoute = ({ roles }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;

    if (roles && !roles.includes(user.role)) {
        if (user.role === 'infirmier') return <Navigate to="/tournee" replace />;
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

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
                                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                        <Route path="/dashboard" element={<Dashboard />} />
                                        <Route path="/patients" element={<Patients />} />
                                        <Route path="/optimisation" element={<Optimisation />} />
                                        <Route path="/users" element={<Users />} />
                                        <Route path="/tournees" element={<AllTournees />} />
                                        <Route path="/settings" element={<Settings />} />
                                    </Route>

                                    {/* Nurse Routes */}
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
