import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Truck, LayoutDashboard, MapPin, Settings } from 'lucide-react';

export default function Sidebar() {
    const { user } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const linkClass = (path) => `
        flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
        ${isActive(path)
            ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-r-4 border-blue-700 dark:border-blue-500'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200'}
    `;

    return (
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 hidden md:block transition-colors duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-slate-800">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-500">LaboTour</span>
            </div>
            <nav className="mt-6 flex flex-col gap-1">
                {(user?.role === 'admin' || user?.role === 'planificateur') && (
                    <>
                        <Link to="/dashboard" className={linkClass('/dashboard')}>
                            <LayoutDashboard size={20} />
                            Tableau de bord
                        </Link>
                        <Link to="/patients" className={linkClass('/patients')}>
                            <Users size={20} />
                            Patients
                        </Link>
                        <Link to="/optimisation" className={linkClass('/optimisation')}>
                            <Truck size={20} />
                            Optimisation
                        </Link>
                        <Link to="/tournees" className={linkClass('/tournees')}>
                            <MapPin size={20} />
                            Toutes les Tournées
                        </Link>
                    </>
                )}

                {user?.role === 'admin' && (
                    <>
                        <Link to="/users" className={linkClass('/users')}>
                            <Users size={20} />
                            Gestion Utilisateurs
                        </Link>
                        <Link to="/settings" className={linkClass('/settings')}>
                            <Settings size={20} />
                            Réglages
                        </Link>
                    </>
                )}

                {user?.role === 'infirmier' && (
                    <Link to="/tournee" className={linkClass('/tournee')}>
                        <MapPin size={20} />
                        Ma Tournée
                    </Link>
                )}
            </nav>
        </aside>
    );
}
