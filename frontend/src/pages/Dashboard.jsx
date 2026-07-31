import { useState, useEffect } from 'react';
import api from '../services/api';
import {
    Users,
    Calendar,
    AlertTriangle,
    CheckCircle,
    Activity,
    Clock,
    UserX
} from 'lucide-react';

const MOCK_STATS = {
    active_patients: 42,
    tours_today: 6,
    tours_week: 38,
    alerts: [
        { type: 'info', message: 'Bienvenue en mode démonstration. Toutes les fonctionnalités de l\'interface sont actives.' }
    ]
};

export default function Dashboard() {
    const [stats, setStats] = useState(MOCK_STATS);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/dashboard/stats');
            if (res.data && typeof res.data === 'object' && res.data.active_patients !== undefined) {
                setStats(res.data);
            }
        } catch (e) {
            console.warn('Backend API offline, keeping demo data.');
        }
    };

    const StatCard = ({ title, value, icon, color, subtext }) => (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-slate-800 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-${color.replace('bg-', '')}`}>
                    {icon}
                </div>
                <span className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</span>
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 font-medium text-sm uppercase tracking-wide">{title}</h3>
            {subtext && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtext}</p>}
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tableau de Bord</h1>
                <p className="text-gray-500 dark:text-gray-400">Vue d'ensemble de l'activité (Mode Démo)</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Patients Actifs"
                    value={stats.active_patients}
                    icon={<Users size={24} className="text-blue-600" />}
                    color="bg-blue-600"
                />
                <StatCard
                    title="Tournées Aujourd'hui"
                    value={stats.tours_today}
                    icon={<Activity size={24} className="text-green-600" />}
                    color="bg-green-600"
                />
                <StatCard
                    title="Tournées Semaine"
                    value={stats.tours_week}
                    icon={<Calendar size={24} className="text-purple-600" />}
                    color="bg-purple-600"
                />
            </div>

            {/* Alerts Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-slate-800">
                    <h2 className="text-lg font-bold flex items-center gap-2 dark:text-gray-100">
                        <AlertTriangle className="text-orange-500" size={20} />
                        Alertes et Notifications
                    </h2>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                    {!stats.alerts || stats.alerts.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
                            <CheckCircle size={48} className="text-green-400 dark:text-green-500" />
                            <p>Aucune alerte en cours. Tout est sous contrôle !</p>
                        </div>
                    ) : (
                        stats.alerts.map((alert, idx) => (
                            <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-start gap-4 transition-colors">
                                <div className={`p-2 rounded-full mt-1 ${alert.type === 'retard' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                                    }`}>
                                    {alert.type === 'retard' ? <Clock size={16} /> : <UserX size={16} />}
                                </div>
                                <div>
                                    <p className="text-gray-800 dark:text-gray-200 font-medium">{alert.message}</p>
                                    {alert.link && (
                                        <a href={alert.link} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline mt-1 block">
                                            Voir détails →
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
