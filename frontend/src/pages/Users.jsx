import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Loader2, UserPlus, Trash2, Users as UsersIcon } from 'lucide-react';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'infirmier'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const MOCK_USERS = [
        { id: 1, username: "admin", role: "admin" },
        { id: 2, username: "infirmier_nord", role: "infirmier" },
        { id: 3, username: "infirmier_sud", role: "infirmier" }
    ];

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (e) {
            console.error('Backend API unreachable, using mock users:', e);
            setUsers(MOCK_USERS);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/users', formData);
            toast.success('Utilisateur créé');
            setFormData({ username: '', password: '', role: 'infirmier' });
            fetchUsers();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Erreur de création');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Supprimer cet utilisateur ?')) return;
        try {
            await api.delete(`/users/${id}`);
            toast.success('Utilisateur supprimé');
            fetchUsers();
        } catch (e) {
            toast.error('Erreur de suppression');
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                    <UsersIcon className="text-blue-600 dark:text-blue-500" />
                    Gestion des Utilisateurs
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Créer et gérer les comptes infirmiers</p>
            </div>

            {/* Form */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 mb-6 border border-transparent dark:border-slate-800 transition-colors duration-200">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                    <UserPlus size={20} className="text-green-600 dark:text-green-500" />
                    Ajouter un Utilisateur
                </h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Nom d'utilisateur"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-950 text-gray-900 dark:text-white transition-colors"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Mot de passe"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-950 text-gray-900 dark:text-white transition-colors"
                        required
                    />
                    <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-950 text-gray-900 dark:text-white transition-colors"
                    >
                        <option value="infirmier">Infirmier</option>
                        <option value="planificateur">Planificateur</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button
                        type="submit"
                        className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 font-medium"
                    >
                        Créer
                    </button>
                </form>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow overflow-hidden border border-transparent dark:border-slate-800 transition-colors duration-200">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 transition-colors">
                        <tr>
                            <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300">ID</th>
                            <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300">Nom d'utilisateur</th>
                            <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300">Rôle</th>
                            <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300">Créé le</th>
                            <th className="text-right p-4 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                                <td className="p-4 text-gray-900 dark:text-gray-300">{user.id}</td>
                                <td className="p-4 font-medium text-gray-900 dark:text-white">{user.username}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' :
                                        user.role === 'planificateur' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                                            'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-600 dark:text-gray-400 text-sm">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="Supprimer"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
