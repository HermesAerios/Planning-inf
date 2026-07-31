import { useState, useEffect } from 'react';
import api from '../services/api';
import { useReactTable, getCoreRowModel, flexRender, getFilteredRowModel, getPaginationRowModel } from '@tanstack/react-table';
import { Loader2, Plus, Edit, Trash2, Search, Upload, Filter, History, X, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import PatientForm from '../components/patient/PatientForm';
import { clsx } from 'clsx';

export default function Patients() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState(null);
    const [formLoading, setFormLoading] = useState(false);

    // Import State
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);

    // History State
    const [historyPatient, setHistoryPatient] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        fetchPatients();
    }, [showInactive]); // Refetch when filter changes

    const fetchPatients = async (query = '') => {
        setLoading(true);
        try {
            const params = {
                search: query || search,
                filter_active: !showInactive
            };
            const res = await api.get('/patients/', { params });
            setData(res.data);
        } catch (err) {
            toast.error('Erreur chargement patients');
        } finally {
            setLoading(false);
        }
    };

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPatients(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer ce patient ?')) return;
        try {
            await api.delete(`/patients/${id}`);
            setData(data.filter(p => p.id !== id));
            toast.success('Patient supprimé');
        } catch (e) {
            toast.error('Erreur suppression');
        }
    };



    const handleCreateOrUpdate = async (formData) => {
        setFormLoading(true);
        try {
            if (editingPatient) {
                const res = await api.put(`/patients/${editingPatient.id}`, formData);
                setData(data.map(p => p.id === editingPatient.id ? res.data : p));
                toast.success('Patient modifié');
            } else {
                const res = await api.post('/patients/', formData);
                if ((!showInactive && res.data.is_active) || showInactive) {
                    setData([res.data, ...data]);
                }
                toast.success('Patient créé');
            }
            setIsModalOpen(false);
            setEditingPatient(null);
        } catch (e) {
            console.error(e);
            toast.error('Erreur sauvegarde');
        } finally {
            setFormLoading(false);
        }
    };

    const handleEdit = (patient) => {
        setEditingPatient(patient);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingPatient(null);
        setIsModalOpen(true);
    };

    const handleImport = async (e) => {
        e.preventDefault();
        if (!importFile) return;

        setImporting(true);
        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const res = await api.post('/patients/import', formData);
            toast.success(`Import terminé: ${res.data.added} ajoutés, ${res.data.errors} erreurs`);
            setIsImportOpen(false);
            setImportFile(null);
            fetchPatients();
        } catch (e) {
            toast.error("Erreur lors de l'import");
        } finally {
            setImporting(false);
        }
    };

    const openHistory = async (patient) => {
        setHistoryPatient(patient);
        setHistoryLoading(true);
        try {
            const res = await api.get(`/patients/${patient.id}/history`);
            setHistoryData(res.data);
        } catch (e) {
            toast.error("Erreur historique");
        } finally {
            setHistoryLoading(false);
        }
    };

    const columns = [
        {
            header: 'Nom',
            accessorFn: row => `${row.nom} ${row.prenom}`,
        },
        {
            header: 'Adresse',
            accessorKey: 'adresse',
        },
        {
            header: 'Téléphone',
            accessorKey: 'telephone',
        },
        {
            header: 'Statut',
            accessorKey: 'is_active',
            cell: info => (
                <span className={`px-2 py-0.5 rounded text-xs ${info.getValue() ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'}`}>
                    {info.getValue() ? 'Actif' : 'Inactif'}
                </span>
            )
        },
        {
            header: 'Actions',
            cell: info => (
                <div className="flex gap-2">
                    <button onClick={() => openHistory(info.row.original)} className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Historique">
                        <History size={16} />
                    </button>
                    <button onClick={() => handleEdit(info.row.original)} className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Modifier">
                        <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(info.row.original.id)} className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Supprimer">
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patients</h1>
                <div className="flex gap-2">

                    <button
                        onClick={() => setIsImportOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Upload size={16} /> Importer
                    </button>
                    <button onClick={handleAddNew} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors">
                        <Plus size={16} /> Nouveau Patient
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-200">
                <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center gap-4 bg-gray-50 dark:bg-slate-800/50 flex-wrap">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher par nom, adresse..."
                            className="pl-10 w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white py-2 text-sm focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                            className="rounded border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 focus:ring-blue-500"
                        />
                        Afficher inactifs
                    </label>
                </div>

                {loading ? (
                    <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600 dark:text-blue-400" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                            <thead className="bg-gray-50 dark:bg-slate-800/50">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <th key={header.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                                {table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {data.length === 0 && (
                                    <tr><td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">Aucun patient trouvé.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="px-6 py-3 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()} ({data.length} total)
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="px-3 py-1 border border-gray-300 dark:border-slate-700 rounded text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >Précédent</button>
                        <button
                            className="px-3 py-1 border border-gray-300 dark:border-slate-700 rounded text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >Suivant</button>
                    </div>
                </div>
            </div>

            {/* Patient Form Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl p-6 relative border border-gray-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{editingPatient ? 'Modifier Patient' : 'Nouveau Patient'}</h2>
                        <PatientForm
                            initialData={editingPatient}
                            onSubmit={handleCreateOrUpdate}
                            onCancel={() => setIsModalOpen(false)}
                            isLoading={formLoading}
                        />
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {isImportOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsImportOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Importer Patients</h2>
                            <button onClick={() => setIsImportOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleImport} className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4 mb-2">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-400 mb-2">
                                    <Info size={16} /> Comment importer vos patients ?
                                </h3>
                                <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                                    Pour importer facilement votre base de données depuis votre ancien logiciel, le plus simple est d'utiliser notre modèle Excel.
                                </p>
                                <a 
                                    href={`${api.defaults.baseURL}/patients/import/template`} 
                                    download
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors"
                                    type="button"
                                >
                                    📥 Télécharger le modèle (Tutoriel Excel)
                                </a>
                                
                                <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-800/30">
                                    <p className="text-xs text-blue-700 dark:text-blue-300 italic">
                                        Note: Le comportement en cas de doublons (ignorer, mettre à jour, ou vider la base) est défini dans les réglages de l'application.
                                    </p>
                                </div>
                            </div>
                            <div className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg p-6 text-center bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                                <input
                                    type="file"
                                    accept=".csv, .xlsx, .xls"
                                    onChange={(e) => setImportFile(e.target.files[0])}
                                    className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/40 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/60 cursor-pointer mx-auto transition-colors"
                                />
                            </div>
                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={!importFile || importing}
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {importing && <Loader2 className="animate-spin" size={16} />}
                                    Importer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {historyPatient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setHistoryPatient(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[80vh] flex flex-col border border-gray-100 dark:border-slate-800 transition-colors duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-slate-800 pb-2">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Historique des Visites</h2>
                                <p className="text-gray-500 dark:text-gray-400">{historyPatient.nom} {historyPatient.prenom}</p>
                            </div>
                            <button onClick={() => setHistoryPatient(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {historyLoading ? (
                                <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600 dark:text-blue-400" /></div>
                            ) : historyData.length === 0 ? (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-8">Aucune visite enregistrée.</p>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                                    <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Heure</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Infirmier</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                                        {historyData.map((h, i) => (
                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">{new Date(h.date).toLocaleDateString()}</td>
                                                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{h.heure_arrivee ? h.heure_arrivee.slice(0, 5) : '-'}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">{h.nurse}</td>
                                                <td className="px-4 py-2 text-sm">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${h.statut === 'terminee' || h.statut === 'done' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                        h.statut === 'absent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                            'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-300'
                                                        }`}>
                                                        {h.statut}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 italic">{h.notes || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
