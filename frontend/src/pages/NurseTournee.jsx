import { useState, useEffect } from 'react';
import api from '../services/api';
import { Loader2, MapPin, Navigation, Clock, CheckCircle, AlertTriangle, Play, FileText, X } from 'lucide-react';
import { toast } from 'react-toastify';

export default function NurseTournee() {
    const [tournees, setTournees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Action State
    const [activeStep, setActiveStep] = useState(null); // The step being interacted with (for modals)
    const [modalType, setModalType] = useState(null); // 'finish' or 'report'
    const [note, setNote] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        // Load from cache first for immediate display
        const cached = localStorage.getItem('nurse_tournees');
        if (cached) {
            setTournees(JSON.parse(cached));
            setLoading(false); // Show cached immediately
        }
        fetchTournees();
    }, []);

    const MOCK_NURSE_TOURNEES = [
        {
            id: 101,
            date: new Date().toISOString().slice(0, 10),
            status: "en_cours",
            steps: [
                { id: 1, patient_nom: "Dupont", patient_prenom: "Jean", adresse: "12 Rue de la Paix", heure_passage: "08:00", status: "termine", actes: ["Prise de sang"] },
                { id: 2, patient_nom: "Martin", patient_prenom: "Sophie", adresse: "45 Avenue Victor Hugo", heure_passage: "08:30", status: "a_faire", actes: ["Injection Insulinique"] }
            ]
        }
    ];

    const fetchTournees = async () => {
        try {
            const res = await api.get('/tournees/me');
            setTournees(res.data);
            localStorage.setItem('nurse_tournees', JSON.stringify(res.data));
        } catch (e) {
            console.error('Backend API unreachable, using mock nurse tournee:', e);
            if (!localStorage.getItem('nurse_tournees')) {
                setTournees(MOCK_NURSE_TOURNEES);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStart = async (tourneeId, stepId, status = 'en_cours') => {
        try {
            await api.post(`/tournees/${tourneeId}/steps/${stepId}/complete`, { status });
            toast.info(status === 'terminee' ? 'Étape terminée' : 'Visite commencée');
            fetchTournees();
        } catch (e) {
            toast.error('Erreur de mise à jour');
        }
    };

    const openFinishModal = (step) => {
        setActiveStep(step);
        setModalType('finish');
        setNote(step.notes || '');
    };

    const openReportModal = (step) => {
        setActiveStep(step);
        setModalType('report');
        setNote(step.notes || '');
    };

    const submitUpdate = async (status) => {
        if (!activeStep) return;
        setUpdating(true);
        try {
            // Find tournee ID (assumed currentTour.id for now or find from list)
            const tourneeId = tournees[0]?.id; // Simplification for now

            await api.post(`/tournees/${tourneeId}/steps/${activeStep.id}/complete`, {
                status: status,
                note: note
            });

            toast.success('Mise à jour enregistrée');
            setModalType(null);
            setActiveStep(null);
            fetchTournees();
        } catch (e) {
            toast.error("Erreur sauvegarde");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    if (tournees.length === 0) {
        return (
            <div className="p-6 text-center text-gray-900 dark:text-white transition-colors duration-200">
                <h2 className="text-xl font-bold mb-2">Ma Tournée</h2>
                <p className="text-gray-500 dark:text-gray-400">Aucune tournée assignée pour aujourd'hui.</p>
            </div>
        );
    }

    const currentTour = tournees[0];

    return (
        <div className="bg-gray-50 dark:bg-slate-950 min-h-screen pb-20 transition-colors duration-200">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 shadow p-4 sticky top-0 z-10 space-y-3 border-b border-transparent dark:border-slate-800 transition-colors duration-200">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                            <Navigation size={20} className="text-blue-600 dark:text-blue-500" />
                            Tournée du {new Date(currentTour.date).toLocaleDateString()}
                        </h1>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {currentTour.steps.length} arrêts • {currentTour.steps.filter(s => ['terminee', 'done', 'absent'].includes(s.status)).length} terminés
                        </div>
                    </div>
                    {currentTour.gmaps_link && (
                        <a
                            href={currentTour.gmaps_link}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-blue-600 text-white p-2 rounded-full shadow-sm active:bg-blue-700"
                            title="GPS Global"
                        >
                            <MapPin size={24} />
                        </a>
                    )}
                </div>
            </div>

            {/* Steps List */}
            <div className="p-4 space-y-4">
                {currentTour.steps.map((step, idx) => {
                    const isDone = ['terminee', 'done'].includes(step.status);
                    const isProgress = step.status === 'en_cours';
                    const isProblem = ['absent', 'probleme_adresse', 'skipped'].includes(step.status);

                    let bgClass = "bg-white dark:bg-slate-900 border-blue-500 dark:border-blue-700";
                    if (isDone) bgClass = "bg-green-50 dark:bg-green-900/10 border-green-500 opacity-80";
                    if (isProblem) bgClass = "bg-red-50 dark:bg-red-900/10 border-red-500 opacity-80";
                    if (isProgress) bgClass = "bg-blue-50 dark:bg-slate-800 border-blue-600 ring-2 ring-blue-200 dark:ring-blue-900/50";

                    return (
                        <div key={step.id} className={`p-4 rounded-xl shadow-sm border-l-4 transition-colors ${bgClass}`}>
                            {/* Header Row */}
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-lg text-gray-900 dark:text-white">{step.nom}</span>
                                <span className="bg-gray-100/80 dark:bg-slate-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs font-mono flex items-center gap-1">
                                    <Clock size={12} /> {step.arrivee}
                                </span>
                            </div>

                            {/* Status Badge */}
                            <div className="flex gap-2 mb-3 flex-wrap">
                                {isDone && <span className="px-2 py-0.5 rounded text-xs bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-400 font-bold flex items-center gap-1"><CheckCircle size={10} /> Terminé</span>}
                                {isProgress && <span className="px-2 py-0.5 rounded text-xs bg-blue-200 dark:bg-blue-900/50 text-blue-800 dark:text-blue-400 font-bold flex items-center gap-1"><Play size={10} /> En cours</span>}
                                {step.status === 'absent' && <span className="px-2 py-0.5 rounded text-xs bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-400 font-bold flex items-center gap-1"><AlertTriangle size={10} /> Absent</span>}

                                {step.a_jeun && <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50">À jeun</span>}
                                {step.retour_rapide_labo && <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-900/50">Retour labo</span>}
                            </div>

                            {/* Address */}
                            {step.adresse && (
                                <div className="text-gray-600 dark:text-gray-400 text-sm mb-3 flex items-start gap-1">
                                    <MapPin size={16} className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500" />
                                    {step.adresse}
                                </div>
                            )}

                            {/* Notes Display */}
                            {step.notes && (
                                <div className="bg-white/50 dark:bg-slate-800/50 p-2 rounded border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-gray-300 mb-3 italic">
                                    " {step.notes} "
                                </div>
                            )}

                            {/* Actions Bar */}
                            <div className="flex gap-3 mt-3">
                                {/* GPS Buttons - Always available */}
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(step.adresse || step.nom)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg text-center font-medium text-sm flex items-center justify-center gap-1 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                    title="Ouvrir Google Maps"
                                >
                                    <MapPin size={16} /> GMap
                                </a>
                                <a
                                    href={`https://waze.com/ul?q=${encodeURIComponent(step.adresse || step.nom)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg text-center font-medium text-sm flex items-center justify-center gap-1 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                    title="Ouvrir Waze"
                                >
                                    <Navigation size={16} /> Waze
                                </a>

                                {/* Dynamic Action Buttons */}
                                {/* Dynamic Action Buttons */}
                                {!isDone && !isProblem && (
                                    <>
                                        {/* First Step: Start Tour (Immediate Finish) */}
                                        {idx === 0 && !isProgress && (
                                            <button
                                                onClick={() => handleStart(currentTour.id, step.id, 'terminee')}
                                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold text-sm active:bg-blue-700 flex items-center justify-center gap-1 shadow-sm"
                                            >
                                                <Play size={16} /> Commencer la course
                                            </button>
                                        )}

                                        {/* Last Step: Finish Tour (Direct Finish) */}
                                        {idx === currentTour.steps.length - 1 && !isProgress && (
                                            <button
                                                onClick={() => openFinishModal(step)}
                                                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-sm active:bg-green-700 flex items-center justify-center gap-1 shadow-sm"
                                            >
                                                <CheckCircle size={16} /> Terminer la course
                                            </button>
                                        )}

                                        {/* Intermediate Steps: Standard Flow */}
                                        {idx > 0 && idx < currentTour.steps.length - 1 && !isProgress && (
                                            <button
                                                onClick={() => handleStart(currentTour.id, step.id, 'en_cours')}
                                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium text-sm active:bg-blue-700 flex items-center justify-center gap-1 shadow-sm"
                                            >
                                                <Play size={16} /> Commencer
                                            </button>
                                        )}

                                        {/* In Progress actions */}
                                        {isProgress && (
                                            <>
                                                <button
                                                    onClick={() => openFinishModal(step)}
                                                    className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium text-sm active:bg-green-700 flex items-center justify-center gap-1 shadow-sm"
                                                >
                                                    <CheckCircle size={16} /> Terminer
                                                </button>
                                                <button
                                                    onClick={() => openReportModal(step)}
                                                    className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg active:bg-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400"
                                                    title="Signaler un problème"
                                                >
                                                    <AlertTriangle size={18} />
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}

                                {(isDone || isProblem) && (
                                    <button
                                        onClick={() => openFinishModal(step)} // Allow editing notes
                                        className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-transparent dark:border-slate-700 py-2 rounded-lg font-medium text-sm active:bg-gray-200 dark:active:bg-slate-700 flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <FileText size={16} /> Note
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Modal Layer */}
            {activeStep && modalType && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-transparent dark:border-slate-800 w-full max-w-sm rounded-t-xl sm:rounded-xl p-6 relative shadow-2xl animate-in slide-in-from-bottom-10 transition-colors">

                        <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-slate-800 pb-2">
                            <h3 className="text-lg font-bold">
                                {modalType === 'finish' ? 'Terminer la visite' : 'Signaler un problème'}
                            </h3>
                            <button onClick={() => { setActiveStep(null); setModalType(null); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            {modalType === 'report' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => submitUpdate('absent')}
                                        className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 font-medium text-sm transition-colors"
                                    >
                                        Patient Absent
                                    </button>
                                    <button
                                        onClick={() => submitUpdate('probleme_adresse')}
                                        className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/40 font-medium text-sm transition-colors"
                                    >
                                        Adresse Incorrecte
                                    </button>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Notes (Optionnel)
                                </label>
                                <textarea
                                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2 text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    rows={3}
                                    placeholder="Ex: Patient n'a pas répondu, ou détails sur les soins..."
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                />
                            </div>

                            <div className="pt-2">
                                {modalType === 'finish' ? (
                                    <button
                                        onClick={() => submitUpdate('terminee')}
                                        disabled={updating}
                                        className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                                    >
                                        {updating ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                                        Valider et Terminer
                                    </button>
                                ) : (
                                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">Sélectionnez ou ajoutez une note pour valider.</p>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
