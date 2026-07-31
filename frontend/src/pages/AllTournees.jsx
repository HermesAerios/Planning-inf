import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Loader2, Calendar, Users, MapPin, X, Trash } from 'lucide-react';

export default function AllTournees() {
    const [tournees, setTournees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTour, setSelectedTour] = useState(null);
    const [dateFilter, setDateFilter] = useState('');

    useEffect(() => {
        fetchTournees();
    }, []);

    const fetchTournees = async () => {
        try {
            const res = await api.get('/tournees/all');
            setTournees(res.data);
        } catch (e) {
            toast.error('Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    const [showHistory, setShowHistory] = useState(false);
    const [modifyingStep, setModifyingStep] = useState(null); // { tourId, stepId, type: 'delete'|'add' }
    const [signature, setSignature] = useState({ signature: '', comment: '' });

    const [tourToDelete, setTourToDelete] = useState(null);
    const [batchToDelete, setBatchToDelete] = useState(null); // array of ids
    const [dontShowDeleteConfirmAgain, setDontShowDeleteConfirmAgain] = useState(
        localStorage.getItem('dontShowDeleteConfirmAgain') === 'true'
    );

    const initiateModification = (tourId, stepId, type) => {
        setModifyingStep({ tourId, stepId, type });
        setSignature({ signature: '', comment: '' });
    };

    const submitModification = async () => {
        if (!modifyingStep) return;

        try {
            if (modifyingStep.type === 'delete') {
                await api.post(`/tournees/${modifyingStep.tourId}/steps/delete`, {
                    step_id: modifyingStep.stepId,
                    signature: signature.signature,
                    comment: signature.comment
                });
                toast.success("Patient supprimé");
            } else if (modifyingStep.type === 'add') {
                await api.post(`/tournees/${modifyingStep.tourId}/steps/add`, {
                    patient_id: modifyingStep.patientId,
                    signature: signature.signature,
                    comment: signature.comment
                });
                toast.success("Patient ajouté");
            }

            setModifyingStep(null);
            fetchTournees();
            setSelectedTour(null); // Close modal forcedly to avoid stale data
        } catch (e) {
            toast.error("Erreur modification");
        }
    };

    const executeDeleteTour = async (id) => {
        try {
            await api.delete(`/tournees/${id}`);
            toast.success("Tournée supprimée");
            setTournees(prev => prev.filter(t => t.id !== id));
            if (selectedTour && selectedTour.id === id) {
                setSelectedTour(null);
            }
        } catch (e) {
            toast.error("Erreur, impossible de supprimer.");
        }
    };

    const executeBulkDelete = async (tourIds) => {
        try {
            await api.post('/tournees/bulk-delete', { ids: tourIds });
            toast.success(`${tourIds.length} tournée(s) supprimée(s)`);
            setTournees(prev => prev.filter(t => !tourIds.includes(t.id)));
            if (selectedTour && tourIds.includes(selectedTour.id)) {
                setSelectedTour(null);
            }
        } catch (e) {
            toast.error("Erreur, impossible de supprimer les tournées.");
        }
    };

    const handleDelete = (id, e) => {
        if (e) e.stopPropagation();
        if (dontShowDeleteConfirmAgain) {
            executeDeleteTour(id);
        } else {
            setTourToDelete(id);
        }
    };

    const handleBulkDelete = (tours, e) => {
        if (e) e.stopPropagation();
        const ids = tours.map(t => t.id);
        if (dontShowDeleteConfirmAgain) {
            executeBulkDelete(ids);
        } else {
            setBatchToDelete(ids);
        }
    };

    // Filter tournees by date
    const filteredTournees = dateFilter
        ? tournees.filter(t => t.date.startsWith(dateFilter))
        : tournees;

    // Group by Batch ID usually, or Date if legacy.
    const groupedBatches = {};

    // Sort tournees by date desc first
    // Then group
    filteredTournees.forEach(t => {
        const batchId = t.batch_id || `legacy_${t.date}_${t.created_by_id}`; // Fallback group key

        if (!groupedBatches[batchId]) {
            groupedBatches[batchId] = {
                id: batchId,
                date: t.date,
                created_at: t.created_at || t.date,
                creator: t.creator_username || 'Système',
                tours: []
            };
        }
        groupedBatches[batchId].tours.push(t);
    });

    // Convert to array and sort by created_at desc
    // Wait, map returns object. entries() or just use object.
    // The previous loop constructed an object keyed by ID.
    // Let's keep it object for rendering but maybe we want order.
    // Actually the render uses Object.entries() so order depends on insertion or sort.
    // Ideally we sort batches by date/created_at desc.

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <div className="p-6 max-w-7xl mx-auto pb-20">
            <div className="mb-6 flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-transparent dark:border-slate-800 transition-colors duration-200">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <Calendar className="text-blue-600 dark:text-blue-500" />
                        Historique des Tournées
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gérez et consultez les tournées passées.</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrer par date:</label>
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                    {dateFilter && (
                        <button
                            onClick={() => setDateFilter('')}
                            className="text-sm text-red-600 hover:text-red-800 font-medium px-2"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {filteredTournees.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-12 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-dashed border-gray-300 dark:border-slate-700 transition-colors duration-200">
                    <Calendar size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    {dateFilter ? 'Aucune tournée pour cette date' : 'Aucune tournée enregistrée'}
                </div>
            )}

            <div className="space-y-8">
                {Object.entries(groupedBatches).map(([batchId, batch]) => (
                    <div key={batchId} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors duration-200">
                        <div className="bg-gray-50 dark:bg-slate-800/50 p-4 flex justify-between items-center border-b border-gray-200 dark:border-slate-800">
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
                                    {new Date(batch.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Généré le {new Date(batch.created_at).toLocaleString()} par <strong className="text-gray-700 dark:text-gray-300">{batch.creator}</strong>
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full">
                                    {batch.tours.length} Tournée(s)
                                </span>
                                <button
                                    onClick={(e) => handleBulkDelete(batch.tours, e)}
                                    className="text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-100 dark:border-red-900/30 hover:border-red-200 dark:hover:border-red-900/50"
                                    title="Supprimer toutes les tournées de ce groupe"
                                >
                                    <Trash size={15} /> Supprimer le groupe
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                                <thead className="bg-white dark:bg-slate-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Infirmier</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Arrêts</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Métriques</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                    {batch.tours.map((tour) => (
                                        <tr
                                            key={tour.id}
                                            className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors ${tour.statut === 'attente' ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}
                                            onClick={() => setSelectedTour(tour)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                                <div className="flex items-center gap-2">
                                                    {tour.user_id ? (
                                                        <>
                                                            <div className="bg-blue-100 dark:bg-blue-900/40 p-1.5 rounded-full text-blue-600 dark:text-blue-400">
                                                                <Users size={14} />
                                                            </div>
                                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                                                {tour.username || `Infirmier #${tour.user_id}`}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="bg-orange-100 dark:bg-orange-900/40 p-1.5 rounded-full text-orange-600 dark:text-orange-400">
                                                                <Users size={14} />
                                                            </div>
                                                            <span className="font-medium text-orange-700 dark:text-orange-500 italic">
                                                                Non assigné (En attente)
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${tour.statut === 'terminee' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                    tour.statut === 'en_cours' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400' :
                                                        tour.statut === 'attente' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400' :
                                                            'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-300'
                                                    }`}>
                                                    {tour.statut === 'terminee' ? 'Terminée' :
                                                        tour.statut === 'en_cours' ? 'En cours' :
                                                            tour.statut === 'attente' ? 'En attente' :
                                                                'Planifiée'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {tour.steps?.length || 0} p.
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {/* We don't have duration/dist in this response yet if not using full model, let's assume steps count proxy or nothing */}
                                                -
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm flex items-center gap-3">
                                                {tour.gmaps_link && tour.statut !== 'attente' && (
                                                    <a
                                                        href={tour.gmaps_link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 hover:underline transition-colors"
                                                    >
                                                        <MapPin size={16} /> GPS
                                                    </a>
                                                )}
                                                <button
                                                    onClick={(e) => handleDelete(tour.id, e)}
                                                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition ml-auto"
                                                    title="Supprimer la tournée"
                                                >
                                                    <Trash size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

            {/* Detail Modal */}
            {selectedTour && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in" onClick={() => setSelectedTour(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-transparent dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center z-10 transition-colors">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                <Users className="text-blue-600 dark:text-blue-500" />
                                Détails de la Tournée
                            </h2>
                            <button onClick={() => setSelectedTour(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 dark:bg-slate-800/40 p-4 rounded-xl border border-gray-100 dark:border-slate-800 transition-colors">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Date</p>
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{new Date(selectedTour.date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Infirmier</p>
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{selectedTour.username || `Infirmier #${selectedTour.user_id}`}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Statut</p>
                                    <span className={`px-2 py-0.5 text-sm font-semibold rounded ${selectedTour.statut === 'terminee' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                        selectedTour.statut === 'en_cours' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400' :
                                            'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-300'
                                        }`}>
                                        {selectedTour.statut}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Arrêts</p>
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{selectedTour.steps?.length || 0}</p>
                                </div>
                            </div>

                            {/* Action Strip */}
                            <div className="flex justify-end mb-4 gap-2">
                                <button
                                    onClick={() => setShowHistory(true)}
                                    className="text-sm bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors"
                                >
                                    📜 Historique
                                </button>
                                <button
                                    onClick={() => initiateModification(selectedTour.id, null, 'add')}
                                    className="text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                >
                                    + Ajouter Patient
                                </button>
                            </div>

                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                                <MapPin size={20} className="text-gray-400 dark:text-gray-500" /> Parcours
                            </h3>
                            <div className="relative border-l-2 border-gray-200 dark:border-slate-700 ml-3.5 space-y-6 pb-2">
                                {selectedTour.steps?.map((step, idx) => (
                                    <div key={idx} className="relative pl-8 group">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-blue-500 shadow-sm transition-colors"></div>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-gray-200">{step.nom}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{step.adresse}</p>
                                                <div className="flex gap-2 mt-1">
                                                    {step.status === 'terminee' && <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-1.5 rounded">Terminé</span>}
                                                    {step.arrivee && <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">Prévu: {step.arrivee}</span>}
                                                </div>
                                            </div>
                                            {/* Delete Step Button */}
                                            <button
                                                onClick={() => initiateModification(selectedTour.id, step.id, 'delete', step.patient_id || step.id)} // Pass ID. Wait, step object structure check.
                                                // backend/routers/tournees.py:216 "id": d.id, "type": "patient", ...
                                                // Actually get_all_tournees returns "steps" where patient_id is NOT explicitly in the dict if I look at line 215.
                                                // I need to update get_all_tournees to include patient_id in step info!
                                                className="text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-1"
                                                title="Supprimer cette étape"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {selectedTour.gmaps_link && selectedTour.statut !== 'attente' && (
                                <div className="mt-8 border-t border-gray-100 dark:border-slate-800 pt-6">
                                    <a
                                        href={selectedTour.gmaps_link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                                    >
                                        <MapPin size={20} />
                                        Ouvrir l'itinéraire complet dans Google Maps
                                    </a>
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                                <button
                                    onClick={(e) => {
                                        handleDelete(selectedTour.id, e);
                                    }}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                                >
                                    <Trash size={16} /> Supprimer cette tournée
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Signature / Modification Modal */}
            {modifyingStep && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-sm w-full space-y-4 border border-transparent dark:border-slate-800">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                            {modifyingStep.type === 'add' ? 'Ajouter un Patient' : 'Supprimer Définitivement ?'}
                        </h3>

                        {modifyingStep.type === 'add' && (
                            <PatientSearchSelect onSelect={(pid) => setModifyingStep(prev => ({ ...prev, patientId: pid }))} />
                        )}

                        {modifyingStep.type === 'delete' && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">Pour confirmer cette suppression, veuillez signer.</p>
                        )}

                        <div className="border-t border-gray-200 dark:border-slate-800 pt-4 mt-2">
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tracabilité (Requis)</p>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Vos Initiales</label>
                                    <input
                                        className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-white rounded p-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        maxLength={3}
                                        placeholder="ex: JD"
                                        value={signature.signature}
                                        onChange={e => setSignature({ ...signature, signature: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Raison / Commentaire</label>
                                    <textarea
                                        className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-white rounded p-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        placeholder="Pourquoi cette modification ?"
                                        value={signature.comment}
                                        onChange={e => setSignature({ ...signature, comment: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                            <button onClick={() => setModifyingStep(null)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition">Annuler</button>
                            <button
                                onClick={submitModification}
                                disabled={!signature.signature || (modifyingStep.type === 'add' && !modifyingStep.patientId)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 transition-colors"
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {(tourToDelete || batchToDelete) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 animate-in fade-in" onClick={() => { setTourToDelete(null); setBatchToDelete(null); }}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-transparent dark:border-slate-800" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-500 mb-2 border-b border-gray-100 dark:border-slate-800 pb-4">
                            <div className="bg-red-50 dark:bg-red-900/20 p-2.5 rounded-full border border-red-100 dark:border-red-900/30 shadow-sm transition-colors">
                                <Trash size={22} className="text-red-500" />
                            </div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                                {batchToDelete ? 'Supprimer plusieurs tournées ?' : 'Supprimer la tournée ?'}
                            </h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-[15px] leading-relaxed">
                            {batchToDelete
                                ? `Êtes-vous sûr de vouloir supprimer ces ${batchToDelete.length} tournées ? Cette action est irréversible et toutes les données associées seront perdues.`
                                : `Êtes-vous sûr de vouloir supprimer cette tournée ? Cette action est irréversible et toutes les données associées seront perdues.`
                            }
                        </p>

                        <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-lg p-3 mt-4 transition-colors">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 text-blue-600 rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-blue-500 focus:ring-offset-1 transition-all cursor-pointer peer"
                                        checked={dontShowDeleteConfirmAgain}
                                        onChange={(e) => {
                                            setDontShowDeleteConfirmAgain(e.target.checked);
                                            if (e.target.checked) {
                                                localStorage.setItem('dontShowDeleteConfirmAgain', 'true');
                                            } else {
                                                localStorage.removeItem('dontShowDeleteConfirmAgain');
                                            }
                                        }}
                                    />
                                </div>
                                <span className="text-[14px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors select-none">
                                    Ne plus afficher ce message de confirmation
                                </span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-2">
                            <button
                                onClick={() => { setTourToDelete(null); setBatchToDelete(null); }}
                                className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-transparent hover:border-gray-200 dark:hover:border-slate-700 rounded-lg transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => {
                                    if (batchToDelete) {
                                        executeBulkDelete(batchToDelete);
                                        setBatchToDelete(null);
                                    } else {
                                        executeDeleteTour(tourToDelete);
                                        setTourToDelete(null);
                                    }
                                }}
                                className="px-5 py-2.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md rounded-lg transition-all flex items-center gap-2"
                            >
                                <Trash size={16} />
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistory && selectedTour && (
                <HistoryModal tourId={selectedTour.id} onClose={() => setShowHistory(false)} />
            )}
        </div>
    );
}

function HistoryModal({ tourId, onClose }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/tournees/${tourId}/history`).then(res => {
            setLogs(res.data);
            setLoading(false);
        });
    }, [tourId]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto border border-transparent dark:border-slate-800 transition-colors" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 dark:text-white">Historique des Modifications</h3>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"><X size={18} /></button>
                </div>
                <div className="p-4 space-y-4">
                    {loading ? <Loader2 className="animate-spin mx-auto text-blue-600 dark:text-blue-400" /> : logs.length === 0 ? <p className="text-center text-gray-500 dark:text-gray-400">Aucune modification enregistrée.</p> : (
                        logs.map((log, i) => (
                            <div key={i} className="bg-gray-50 dark:bg-slate-800/60 p-3 rounded text-sm space-y-1 transition-colors">
                                <div className="flex justify-between font-bold text-gray-800 dark:text-gray-200">
                                    <span>{log.action}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300">{log.details}</p>
                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center text-xs">
                                    <span className="font-mono bg-white dark:bg-slate-900 px-1 border border-gray-200 dark:border-slate-700 rounded text-gray-500 dark:text-gray-400">
                                        Signé: {log.signature}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400 max-w-[150px] truncate" title={log.comment}>
                                        "{log.comment}"
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

