import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import { LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
    const { user, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    if (!user) return <Navigate to="/login" />;

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-200">
            {/* Desktop Sidebar */}
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 h-16 flex items-center justify-between px-6 shadow-sm transition-colors duration-200">
                    <button
                        className="md:hidden p-2 text-gray-600 dark:text-gray-400"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex items-center gap-4 ml-auto">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.username}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</div>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Se déconnecter"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Menu (simplified for now) */}
            {mobileMenuOpen && (
                <div className="absolute inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={() => setMobileMenuOpen(false)}></div>
                    <div className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 shadow-xl transition-colors duration-200">
                        <Sidebar />
                    </div>
                </div>
            )}
        </div>
    );
}
