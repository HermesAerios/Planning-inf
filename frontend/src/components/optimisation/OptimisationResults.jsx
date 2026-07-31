import TourneeMap from '../Map/TourneeMap';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { Download, Save, MapPin, GripVertical } from 'lucide-react';
import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function OptimisationResults({ results, onRestart }) {
    if (!results) return null;
    const [savedIds, setSavedIds] = useState(null);
    const [saving, setSaving] = useState(false);
    const [nurses, setNurses] = useState([]);
    const [assignments, setAssignments] = useState({});
    const [localRoutes, setLocalRoutes] = useState(results.routes);

    useEffect(() => {
        setLocalRoutes(results.routes);
    }, [results.routes]);

    const hasLongTour = results.routes.some(r => r.total_duration > 180);
    const idealNurses = Math.ceil(results.duree_totale_min / 180);
    const extraNursesNeeded = idealNurses - results.nb_infirmiers_utilises;

    const depot = results.routes[0]?.steps[0]?.lat ? { lat: results.routes[0].steps[0].lat, lon: results.routes[0].steps[0].lon } : { lat: 46.195748, lon: 6.146601 };

    useEffect(() => {
        // Fetch nurses
        api.get('/users').then(res => {
            const nurseUsers = res.data.filter(u => u.role === 'infirmier');
            setNurses(nurseUsers);

            // Initialize assignments with first available nurses
            const initialAssignments = {};
            results.routes.forEach((route, idx) => {
                if (nurseUsers[idx]) {
                    initialAssignments[idx] = nurseUsers[idx].id;
                }
            });
            setAssignments(initialAssignments);
        }).catch(e => {
            toast.error('Erreur chargement infirmiers');
        });
    }, [results]);

    const handleAssignmentChange = (routeIdx, nurseId) => {
        setAssignments({ ...assignments, [routeIdx]: parseInt(nurseId) });
    };

    const handleSave = async () => {
        // Validate all NORMAL tours have assigned nurses
        // We exclude the "unassigned" group from this check (if we treat them as special)
        // But here we iterate results.routes.
        const missingAssignments = localRoutes.some((_, idx) => !assignments[idx]);

        if (missingAssignments) {
            toast.error('Veuillez assigner tous les infirmiers pour les tournées valides');
            return;
        }

        setSaving(true);
        try {
            const today = new Date();
            const payloads = localRoutes.map((route, idx) => ({
                date: today.toISOString(),
                user_id: assignments[idx], // Use selected nurse
                steps: route.steps
            }));

            // Add "Deferred/Unassigned" tour payload if there are unassigned patients
            if (results.unassigned && results.unassigned.length > 0) {
                payloads.push({
                    date: today.toISOString(),
                    user_id: null, // No nurse -> Status 'attente'
                    steps: results.unassigned.map((p, i) => ({
                        type: 'patient',
                        patient_id: p.id,
                        nom: p.nom,
                        status: 'todo'
                        // No arrivee/depart time since it's deferred
                    }))
                });
            }

            const res = await api.post('/tournees/', payloads);
            setSavedIds(res.data.ids);
            toast.success("Tournées sauvegardées !");
        } catch (e) {
            toast.error("Erreur sauvegarde");
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const downloadPDF = async (tourneeId) => {
        try {
            const res = await api.get(`/reports/tournee/${tourneeId}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `tournee_${tourneeId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            toast.error("Erreur téléchargement PDF");
        }
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const { source, destination } = result;

        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const newRoutes = [...localRoutes];
        
        const sourceRouteIdx = parseInt(source.droppableId.replace('route-', ''));
        const destRouteIdx = parseInt(destination.droppableId.replace('route-', ''));

        const sourceRoute = { ...newRoutes[sourceRouteIdx] };
        const destRoute = sourceRouteIdx === destRouteIdx ? sourceRoute : { ...newRoutes[destRouteIdx] };

        sourceRoute.steps = [...sourceRoute.steps];
        if (sourceRouteIdx !== destRouteIdx) {
            destRoute.steps = [...destRoute.steps];
        }

        const [movedStep] = sourceRoute.steps.splice(source.index, 1);
        destRoute.steps.splice(destination.index, 0, movedStep);

        newRoutes[sourceRouteIdx] = sourceRoute;
        newRoutes[destRouteIdx] = destRoute;

        setLocalRoutes(newRoutes);
    };

    return (
        <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 p-4 rounded-lg flex justify-between items-center transition-colors">
                <div>
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-400">Optimisation réussie !</h3>
                    <p className="text-green-700 dark:text-green-500">
                        {results.nb_infirmiers_utilises} infirmiers • {Math.round(results.distance_totale_m / 100) / 10} km • {Math.floor(results.duree_totale_min / 60)}h{results.duree_totale_min % 60}
                    </p>
                </div>
                <div className="flex gap-2">
                    {!savedIds ? (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-700 flex items-center gap-2 transition-colors"
                        >
                            <Save size={16} /> {saving ? '...' : 'Sauvegarder & Assigner'}
                        </button>
                    ) : (
                        <span className="text-green-700 dark:text-green-500 font-bold flex items-center gap-1"><Save size={16} /> Sauvegardé</span>
                    )}
                    <button
                        onClick={onRestart}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 rounded hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                    >
                        Nouvelle
                    </button>
                </div>
            </div>

            {hasLongTour && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded shadow-sm text-sm dark:bg-orange-900/20 dark:border-orange-500/80">
                    <p className="font-bold text-orange-800 dark:text-orange-400 mb-1">
                        ⚠️ Attention, des tournées sont particulièrement longues (&gt; 180 minutes).
                    </p>
                    <p className="text-orange-700 dark:text-orange-300">
                        Pour ramener les tournées à une durée normale de moins de 3 heures tout en gardant l'équilibre actuel, 
                        vous devriez utiliser <strong>{idealNurses} infirmier(s)</strong> au total 
                        {extraNursesNeeded > 0 ? ` (soit ${extraNursesNeeded} infirmier${extraNursesNeeded > 1 ? 's' : ''} supplémentaire${extraNursesNeeded > 1 ? 's' : ''})` : ''}.
                    </p>
                </div>
            )}

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="lg:col-span-3 space-y-4">
                    {localRoutes.map((route, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden transition-colors">
                        <div className="bg-blue-50 dark:bg-slate-800/50 p-3 border-b border-blue-100 dark:border-slate-800 flex justify-between items-center transition-colors">
                            <div>
                                <span className="font-bold text-blue-800 dark:text-blue-400 block">Tournée {route.vehicle_id}</span>
                                <span className="text-sm text-blue-600 dark:text-blue-500">{route.total_duration} min • {Math.round(route.total_distance / 1000)} km</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {!savedIds && nurses.length > 0 && (
                                    <select
                                        value={assignments[idx] || ''}
                                        onChange={(e) => handleAssignmentChange(idx, e.target.value)}
                                        className="border border-blue-300 dark:border-slate-600 rounded px-3 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                    >
                                        <option value="">Sélectionner infirmier</option>
                                        {nurses.map(nurse => (
                                            <option key={nurse.id} value={nurse.id}>
                                                {nurse.username}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {savedIds && savedIds[idx] && (
                                    <button
                                        onClick={() => downloadPDF(savedIds[idx])}
                                        className="p-1 px-2 text-xs bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1 transition-colors"
                                    >
                                        <Download size={14} /> PDF
                                    </button>
                                )}
                                {route.gmaps_link && (
                                    <a
                                        href={route.gmaps_link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 px-2 text-xs bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-1 transition-colors"
                                    >
                                        <MapPin size={14} /> GMap
                                    </a>
                                )}
                            </div>
                        </div>
                        <Droppable droppableId={`route-${idx}`} isDropDisabled={savedIds !== null}>
                            {(provided, snapshot) => (
                                <div 
                                    className={`p-3 text-sm space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                >
                                    <ol className="relative border-l border-gray-200 dark:border-slate-700 ml-3 transition-colors">
                                        {route.steps.map((step, sIdx) => {
                                            const isDraggable = step.type === 'patient';
                                            return isDraggable ? (
                                                <Draggable key={`${idx}-${sIdx}-${step.patient_id}`} draggableId={`drag-${idx}-${sIdx}-${step.patient_id}`} index={sIdx} isDragDisabled={savedIds !== null}>
                                                    {(provided, dragSnapshot) => (
                                                        <li 
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            className={`mb-4 ml-4 group ${dragSnapshot.isDragging ? 'bg-white dark:bg-slate-800 shadow-xl rounded-lg p-3 z-50 ring-2 ring-blue-400 -ml-2' : ''}`}
                                                            style={provided.draggableProps.style}
                                                        >
                                                            <div className="absolute w-3 h-3 bg-gray-200 dark:bg-slate-600 rounded-full mt-1.5 -left-1.5 border border-white dark:border-slate-900 transition-colors"></div>
                                                            <div className="flex items-start gap-2">
                                                                <div 
                                                                    {...provided.dragHandleProps}
                                                                    className={`mt-0.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 ${savedIds ? 'hidden' : ''}`}
                                                                >
                                                                    <GripVertical size={16} />
                                                                </div>
                                                                <div>
                                                                    <time className="mb-1 text-xs font-normal text-gray-400 dark:text-gray-500">{step.arrivee || '🕒 À recalculer'}</time>
                                                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                                        {step.nom}
                                                                        {step.a_jeun && <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50">À jeun</span>}
                                                                        {step.retour_rapide_labo && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-900/50">Retour labo</span>}
                                                                    </h3>
                                                                    <p className="text-gray-500 dark:text-gray-400 text-xs">{step.adresse}</p>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    )}
                                                </Draggable>
                                            ) : (
                                                <li key={`${idx}-${sIdx}-depot`} className="mb-4 ml-4 text-gray-500">
                                                    <div className="absolute w-3 h-3 bg-gray-200 dark:bg-slate-600 rounded-full mt-1.5 -left-1.5 border border-white dark:border-slate-900 transition-colors"></div>
                                                    <time className="mb-1 text-xs font-normal text-gray-400 dark:text-gray-500">{step.arrivee}</time>
                                                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                        {step.type.includes('depot') ? `🏥 ${step.nom || 'Point de départ/arrivée'}` : step.nom}
                                                    </h3>
                                                    <p className="text-gray-400 text-xs">{step.adresse}</p>
                                                </li>
                                            );
                                        })}
                                        {provided.placeholder}
                                    </ol>
                                </div>
                            )}
                        </Droppable>
                        <div className="p-3 bg-gray-50 dark:bg-slate-800/40 border-t border-gray-200 dark:border-slate-800 flex gap-2 transition-colors">
                            <button
                                onClick={() => document.getElementById('tournee-map').scrollIntoView({ behavior: 'smooth' })}
                                className="flex-1 text-xs text-center bg-gray-800 dark:bg-slate-700 text-white rounded py-1 hover:bg-gray-700 dark:hover:bg-slate-600 transition-colors"
                            >
                                Voir Carte
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            </DragDropContext>

            <div className="lg:col-span-2" id="tournee-map">
                <TourneeMap tournees={localRoutes} depot={depot} />
            </div>
        </div>

    );
}
