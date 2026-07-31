import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function OptimisationParams({ params, onChange, onBack, onOptimize, loading }) {

    const handleChange = (field, value) => {
        onChange({ ...params, [field]: value });
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 max-w-2xl mx-auto transition-colors duration-200">
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">2. Paramètres d'optimisation</h2>

            <div className="space-y-6">
                {/* Nombre infirmiers */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre d'infirmiers max (1-5)</label>
                    <input
                        type="range" min="1" max="5" step="1"
                        value={params.nbInfirmiers}
                        onChange={e => handleChange('nbInfirmiers', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-center font-bold text-blue-600 dark:text-blue-400 mt-2">{params.nbInfirmiers} infirmier(s)</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                        <input
                            type="date"
                            value={params.date}
                            onChange={e => handleChange('date', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm border p-2 bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Heure début</label>
                        <input
                            type="time"
                            value={params.heureDebut}
                            onChange={e => handleChange('heureDebut', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm border p-2 bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-between">
                <button
                    onClick={onBack}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                    &larr; Retour
                </button>

                <button
                    onClick={onOptimize}
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md flex items-center disabled:opacity-70 transition-colors"
                >
                    {loading ? <><Loader2 className="animate-spin mr-2" /> Optimisation en cours...</> : "🚀 Lancer l'optimisation"}
                </button>
            </div>
        </div>
    );
}
