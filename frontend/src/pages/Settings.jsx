import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useTheme } from '../contexts/ThemeContext';
import { Settings as SettingsIcon, MapPin, Users, Save, Loader2, UserMinus, Clock, Shield, Download, Monitor, Briefcase, FileSpreadsheet, Trash2 } from 'lucide-react';
import api from '../services/api';

export default function Settings() {
    const { theme, applyTheme } = useTheme();
    const [settings, setSettings] = useState({
        depot_name: '',
        depot_address: '',
        depot_lat: 46.1910685,
        depot_lon: 6.1491002,
        humanity_balance: true,
        default_intervention_duration: 15,
        enable_safety_margin: false,
        safety_margin_percent: 10,
        enable_break_time: false,
        break_duration: 45,
        max_patients_per_nurse: 25,
        max_tour_duration_hours: 8,
        theme_preference: theme || 'light',
        export_format: 'excel',
        import_mode: 'skip',
        enable_data_purge: false,
        purge_after_days: 30
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deactivating, setDeactivating] = useState(false);
    const [purging, setPurging] = useState(false);
    const [purgeHistory, setPurgeHistory] = useState(false);
    const [purgeInactive, setPurgeInactive] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        // Preview theme instantly when dropdown changes
        if (settings.theme_preference) {
            applyTheme(settings.theme_preference);
        }
    }, [settings.theme_preference, applyTheme]);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings/');
            setSettings(res.data);
        } catch (e) {
            toast.error("Erreur de chargement des réglages");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Very simple Geocoding if address changed and user wants to lookup. 
            // In a real app we might call an external geocoding API here before saving
            // if we detect address vs lat/lon mismatch. 

            await api.patch('/settings/', settings);
            toast.success("Réglages sauvegardés avec succès");
            if (settings.theme_preference) {
                applyTheme(settings.theme_preference);
            }
        } catch (e) {
            toast.error("Erreur lors de la sauvegarde");
        } finally {
            setSaving(false);
        }
    };

    const handleDeactivateAll = async () => {
        if (!window.confirm('🚨 DANGER: Êtes-vous absolument sûr de vouloir désactiver tous les patients actifs ?\n\nCette action va cacher tous les patients des listes courantes.\nVous pourrez les réactiver individuellement plus tard via la page Patients (en cochant "Afficher inactifs").')) return;
        setDeactivating(true);
        try {
            await api.post('/patients/deactivate-all');
            toast.success('Tous les patients ont été désactivés avec succès');
        } catch (e) {
            toast.error('Erreur lors de la désactivation globale');
        } finally {
            setDeactivating(false);
        }
    };

    const handleBackupExport = async () => {
        try {
            const endpoint = settings.export_format === 'csv' ? '/patients/export/csv' : '/patients/export/excel';
            const response = await api.get(endpoint, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const extension = settings.export_format === 'csv' ? 'csv' : 'xlsx';
            link.setAttribute('download', `sauvegarde_patients_${new Date().toISOString().split('T')[0]}.${extension}`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            toast.success("Sauvegarde téléchargée !");
        } catch (e) {
            toast.error("Échec de la sauvegarde.");
        }
    };

    const handlePurge = async () => {
        if (!purgeHistory && !purgeInactive) {
            toast.warning("Veuillez sélectionner au moins une option de purge.");
            return;
        }
        if (!window.confirm("🚨 ATTENTION: Êtes-vous sûr de vouloir supprimer définitivement ces données ? Cette action est irréversible.")) return;

        setPurging(true);
        try {
            const res = await api.post('/patients/purge', {
                purge_history: purgeHistory,
                purge_inactive_patients: purgeInactive
            });
            toast.success(res.data.message);
        } catch (e) {
            toast.error("Erreur lors de la purge.");
        } finally {
            setPurging(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950"><Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={32} /></div>;

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-950 pb-20 transition-colors duration-200">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                    <SettingsIcon className="text-blue-600 dark:text-blue-400" size={32} />
                    Paramètres de l'Application
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Configurez les réglages globaux du système d'optimisation.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">

                {/* Geolocation Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-200">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-100 dark:border-slate-800 p-5 flex items-center gap-3">
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm text-blue-600 dark:text-blue-400">
                            <MapPin size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Point de Départ (Dépot)</h2>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nom du lieu</label>
                                <input
                                    type="text"
                                    name="depot_name"
                                    value={settings.depot_name}
                                    onChange={handleChange}
                                    className="w-full border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm px-4 py-2.5 bg-gray-50 dark:bg-slate-800 dark:text-white transition-colors duration-200"
                                    placeholder="ex: Cabinet Principal"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Adresse Complète</label>
                                <input
                                    type="text"
                                    name="depot_address"
                                    value={settings.depot_address}
                                    onChange={handleChange}
                                    className="w-full border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm px-4 py-2.5 bg-gray-50 dark:bg-slate-800 dark:text-white transition-colors duration-200"
                                    placeholder="ex: Av. de la Roseraie 72, 1205 Genève"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                                    Assurez-vous que l'adresse est exacte pour le bon fonctionnement des liens Google Maps.
                                </p>
                            </div>

                            {/* Advanced Coords - Hidden by default or editable for precision */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    name="depot_lat"
                                    value={settings.depot_lat}
                                    onChange={handleChange}
                                    className="w-full border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-sm px-4 py-2.5 bg-gray-50 dark:bg-slate-800 dark:text-white font-mono text-sm transition-colors duration-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    name="depot_lon"
                                    value={settings.depot_lon}
                                    onChange={handleChange}
                                    className="w-full border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-sm px-4 py-2.5 bg-gray-50 dark:bg-slate-800 dark:text-white font-mono text-sm transition-colors duration-200"
                                />
                            </div>
                        </div>
                    </div>
                </div>



                {/* Temps & Logistique */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-orange-100 dark:border-orange-900/30 overflow-hidden mt-6 transition-colors duration-200">
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-b border-orange-100 dark:border-orange-900/30 p-5 flex items-center gap-3">
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm text-orange-600 dark:text-orange-500">
                            <Clock size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Temps & Logistique</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Durée par défaut (minutes)</label>
                                <input
                                    type="number"
                                    name="default_intervention_duration"
                                    value={settings.default_intervention_duration}
                                    onChange={handleChange}
                                    className="w-full border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 shadow-sm px-4 py-2.5 bg-gray-50 dark:bg-slate-800 dark:text-white transition-colors duration-200"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Temps estimé sur place par patient si non spécifié.</p>
                            </div>
                        </div>

                        <hr className="border-gray-100 dark:border-slate-800" />

                        <div className="space-y-4">
                            <label className="flex items-start gap-4 cursor-pointer group">
                                <div className="flex items-center h-6">
                                    <input
                                        type="checkbox"
                                        name="enable_safety_margin"
                                        checked={settings.enable_safety_margin}
                                        onChange={handleChange}
                                        className="w-5 h-5 text-orange-600 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 rounded focus:ring-orange-500 focus:ring-2"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Marge de Sécurité Routière (%)</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Ajoute du temps de trajet supplémentaire pour compenser la circulation.</p>
                                </div>
                            </label>
                            {settings.enable_safety_margin && (
                                <div className="pl-9">
                                    <input
                                        type="number"
                                        name="safety_margin_percent"
                                        value={settings.safety_margin_percent}
                                        onChange={handleChange}
                                        className="w-32 border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 shadow-sm px-4 py-2 bg-gray-50 dark:bg-slate-800 dark:text-white transition-colors duration-200"
                                    /> <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
                                </div>
                            )}
                        </div>

                        <hr className="border-gray-100 dark:border-slate-800" />

                        <div className="space-y-4">
                            <label className="flex items-start gap-4 cursor-pointer group">
                                <div className="flex items-center h-6">
                                    <input
                                        type="checkbox"
                                        name="enable_break_time"
                                        checked={settings.enable_break_time}
                                        onChange={handleChange}
                                        className="w-5 h-5 text-orange-600 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 rounded focus:ring-orange-500 focus:ring-2"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Temps de Pause Obligatoire</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Inclut automatiquement une pause dans l'itinéraire (repas, etc).</p>
                                </div>
                            </label>
                            {settings.enable_break_time && (
                                <div className="pl-9">
                                    <input
                                        type="number"
                                        name="break_duration"
                                        value={settings.break_duration}
                                        onChange={handleChange}
                                        className="w-32 border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 shadow-sm px-4 py-2 bg-gray-50 dark:bg-slate-800 dark:text-white transition-colors duration-200"
                                    /> <span className="text-sm text-gray-600 dark:text-gray-400">minutes</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Contraintes Opérationnelles */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/30 overflow-hidden mt-6 transition-colors duration-200">
                    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border-b border-indigo-100 dark:border-indigo-900/30 p-5 flex items-center gap-3">
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm text-indigo-600 dark:text-indigo-400">
                            <Briefcase size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Contraintes Opérationnelles</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Capacité max. patients (par infirmier/jour)</label>
                            <input
                                type="number"
                                name="max_patients_per_nurse"
                                value={settings.max_patients_per_nurse}
                                onChange={handleChange}
                                className="w-full border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm px-4 py-2.5 bg-gray-50 dark:bg-slate-800 dark:text-white transition-colors duration-200"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Durée max. tournée (heures/jour)</label>
                            <input
                                type="number"
                                name="max_tour_duration_hours"
                                value={settings.max_tour_duration_hours}
                                onChange={handleChange}
                                className="w-full border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm px-4 py-2.5 bg-gray-50 dark:bg-slate-800 dark:text-white transition-colors duration-200"
                            />
                        </div>
                    </div>
                </div>

                {/* Préférences & Apparence */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-pink-100 dark:border-pink-900/30 overflow-hidden mt-6 transition-colors duration-200">
                    <div className="bg-gradient-to-r from-pink-50 to-fuchsia-50 dark:from-pink-900/20 dark:to-fuchsia-900/20 border-b border-pink-100 dark:border-pink-900/30 p-5 flex items-center gap-3">
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm text-pink-600 dark:text-pink-400">
                            <Monitor size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Préférences & Apparence</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Thème de l'Application</label>
                            <select
                                name="theme_preference"
                                value={settings.theme_preference}
                                onChange={handleChange}
                                className="w-full border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-pink-500 shadow-sm px-4 py-2.5 bg-gray-50 dark:bg-slate-800 dark:text-white transition-colors duration-200"
                            >
                                <option value="light">Clair (Standard)</option>
                                <option value="dark">Sombre (Nuit)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Format d'exportation par défaut</label>
                            <select
                                name="export_format"
                                value={settings.export_format}
                                onChange={handleChange}
                                className="w-full border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-pink-500 shadow-sm px-4 py-2.5 bg-gray-50 dark:bg-slate-800 dark:text-white transition-colors duration-200"
                            >
                                <option value="excel">Tableur Excel (.xlsx)</option>
                                <option value="csv">Fichier CSV (.csv)</option>
                                <option value="pdf">Document PDF (.pdf)</option>
                            </select>
                        </div>
                    </div>
                    
                    <hr className="border-gray-100 dark:border-slate-800 m-6" />
                    
                    <div className="px-6 pb-6 border-pink-100 dark:border-pink-900/30">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                           <FileSpreadsheet size={16} className="text-pink-600 dark:text-pink-400" /> Politique d'importation de Patients
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Comportement appliqué lors d'un import de fichier Excel/CSV.</p>
                        <select
                            name="import_mode"
                            value={settings.import_mode}
                            onChange={handleChange}
                            className="w-full md:w-1/2 border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-pink-500 shadow-sm px-4 py-2.5 bg-gray-50 dark:bg-slate-800 dark:text-white transition-colors duration-200"
                        >
                            <option value="skip">Ignorer les doublons (Recommandé)</option>
                            <option value="update">Mettre à jour si patient existant</option>
                            <option value="replace">⚠️ Remplacer toute la base de données (Transition)</option>
                        </select>
                    </div>
                </div>

                {/* Security & Maintenance Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mt-6 transition-colors duration-200">
                    <div className="bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-800 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 p-5 flex items-center gap-3">
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm text-slate-700 dark:text-slate-300">
                            <Shield size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Sécurité & Maintenance (RGPD)</h2>
                    </div>

                    {/* Backup */}
                    <div className="p-6 border-b border-gray-100 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="text-md font-bold text-gray-900 dark:text-gray-100 mb-1">Sauvegarde Complète (Backup)</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Télécharge immédiatement toute la base de données patients dans le format sélectionné plus haut.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleBackupExport}
                                className="whitespace-nowrap bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
                            >
                                <Download size={16} /> Sauvegarde
                            </button>
                        </div>
                    </div>

                    {/* Purge RGPD */}
                    <div className="p-6 border-b border-gray-100 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="space-y-3 flex-1">
                                <div>
                                    <h3 className="text-md font-bold text-gray-900 dark:text-gray-100 mb-1">Purge Manuelle des Données (RGPD)</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                        Sélectionnez ce que vous souhaitez nettoyer définitivement de la base de données. Attention, cette action efface irrémédiablement les données.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" checked={purgeHistory} onChange={(e) => setPurgeHistory(e.target.checked)} className="w-4 h-4 text-red-600 rounded border-gray-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-red-500" />
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-200">Historique des anciennes tournées (de + de {settings.purge_after_days} jours)</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" checked={purgeInactive} onChange={(e) => setPurgeInactive(e.target.checked)} className="w-4 h-4 text-red-600 rounded border-gray-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-red-500" />
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-200">Tous les patients inactifs</span>
                                    </label>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handlePurge}
                                disabled={purging || (!purgeHistory && !purgeInactive)}
                                className="whitespace-nowrap bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 mt-4 sm:mt-0"
                            >
                                {purging ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                Lancer la Purge Actuelle
                            </button>
                        </div>
                    </div>
                </div>

                {/* Patient Management Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-red-50 dark:border-red-900/30 overflow-hidden mt-6 transition-colors duration-200">
                    <div className="bg-red-50 dark:bg-red-900/20 p-5 flex items-center gap-3">
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm text-red-600 dark:text-red-500">
                            <UserMinus size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-red-900 dark:text-red-400">Désactivation Rapide</h2>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="text-md font-medium text-red-900 dark:text-red-400 mb-1">Désactivation Globale (Fin de saison)</h3>
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    Passe tous les patients actifs en inactif d'un seul coup pour vider la liste.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleDeactivateAll}
                                disabled={deactivating}
                                className="whitespace-nowrap border border-red-300 dark:border-red-800 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {deactivating ? <Loader2 className="animate-spin" size={16} /> : <UserMinus size={16} />}
                                Désactiver tous
                            </button>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        Enregistrer les modifications
                    </button>
                </div>
            </form>
        </div>
    );
}
