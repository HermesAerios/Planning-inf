import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Loader2, Search, X, CalendarClock } from 'lucide-react';

export default function PatientSelector({ selected, onChange, onNext, currentDate }) {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        api.get('/patients/').then(res => {
            setPatients(res.data);
            setLoading(false);
        });
    }, []);

    const toggleSelect = (id) => {
        const exists = selected.find(p => p.id === id);
        if (exists) {
            onChange(selected.filter(p => p.id !== id));
        } else {
            onChange([...selected, { id, a_jeun: false, retour_rapide: false }]);
        }
    };

    const updateCriteria = (id, field, value) => {
        onChange(selected.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const filteredPatients = patients.filter(p =>
        p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.adresse && p.adresse.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const selectAll = () => {
        // Only select filtered patients usually? Or all? Let's select visible ones to be intuitive.
        const newSelected = [...selected];
        filteredPatients.forEach(p => {
            if (!newSelected.some(s => s.id === p.id)) {
                newSelected.push({ id: p.id, a_jeun: false, retour_rapide: false });
            }
        });
        onChange(newSelected);
    };

    const deselectAll = () => {
        // Deselect visible ones
        onChange(selected.filter(s => !filteredPatients.some(p => p.id === s.id)));
    };

    const loadRecurring = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/patients/recurring?date_str=${currentDate}`);
            const recPatients = res.data;
            const newSelected = [...selected];
            recPatients.forEach(p => {
                if (!newSelected.some(s => s.id === p.id)) {
                    newSelected.push({ id: p.id, a_jeun: p.test_a_jeun || false, retour_rapide: p.retour_rapide_labo || false });
                }
            });
            onChange(newSelected);
            setLoading(false);
        } catch (e) {
            setLoading(false);
        }
    };

    const isSelected = (id) => selected.some(p => p.id === id);
    const getPatientData = (id) => selected.find(p => p.id === id);

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 transition-colors duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Sélection des patients ({selected.length})</h2>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un patient..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-8 py-2 border border-gray-300 dark:border-slate-700 rounded-lg w-full sm:w-64 text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div className="space-x-2 text-sm shrink-0 flex items-center">
                        <button onClick={loadRecurring} className="flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline px-2 py-1 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                            <CalendarClock size={14} /> + Récurrents
                        </button>
                        <span className="text-gray-300 dark:text-gray-600 ml-2">|</span>
                        <button onClick={selectAll} className="text-blue-600 dark:text-blue-400 hover:underline">Tout</button>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <button onClick={deselectAll} className="text-gray-500 dark:text-gray-400 hover:underline">Rien</button>
                    </div>
                </div>
            </div>

            <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-slate-800 rounded-md transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                    <thead className="bg-gray-50 dark:bg-slate-800/80 sticky top-0 z-10 transition-colors">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-10">
                                <input
                                    type="checkbox"
                                    checked={filteredPatients.length > 0 && filteredPatients.every(p => isSelected(p.id))}
                                    onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                                    className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-blue-500"
                                />
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Patient</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Adresse</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">À jeun</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">Retour</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                        {filteredPatients.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                    Aucun patient trouvé pour "{searchTerm}"
                                </td>
                            </tr>
                        ) : (
                            filteredPatients.map(p => {
                                const selected_p = isSelected(p.id);
                                const data = getPatientData(p.id);
                                return (
                                    <tr key={p.id} className={`${selected_p ? "bg-blue-50 dark:bg-slate-800" : "hover:bg-gray-50 dark:hover:bg-slate-800/50"} transition-colors`}>
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selected_p}
                                                onChange={() => toggleSelect(p.id)}
                                                className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{p.nom} {p.prenom}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs" title={p.adresse}>{p.adresse}</td>
                                        <td className="px-4 py-3">
                                            {selected_p && (
                                                <div className="flex justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={data?.a_jeun || false}
                                                        onChange={(e) => updateCriteria(p.id, 'a_jeun', e.target.checked)}
                                                        className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-yellow-600 focus:ring-yellow-500"
                                                        title="À jeun"
                                                    />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {selected_p && (
                                                <div className="flex justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={data?.retour_rapide || false}
                                                        onChange={(e) => updateCriteria(p.id, 'retour_rapide', e.target.checked)}
                                                        className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-red-600 focus:ring-red-500"
                                                        title="Retour Labo"
                                                    />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex justify-between items-center bg-gray-50 dark:bg-slate-800/40 border border-transparent dark:border-slate-800 p-4 rounded-md transition-colors">
                <span className="font-bold text-lg text-gray-900 dark:text-white">{selected.length} patients sélectionnés</span>
                <button
                    onClick={onNext}
                    disabled={selected.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Suivant &rarr;
                </button>
            </div>
        </div>
    );
}
