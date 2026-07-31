import { useForm } from 'react-hook-form';
import { Loader2, Check, AlertTriangle, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapEventPicker({ setPos }) {
    useMapEvents({
        click(e) {
            setPos([e.latlng.lat, e.latlng.lng]);
        },
    });
    return null;
}

export default function PatientForm({ initialData, onSubmit, onCancel, isLoading }) {
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        defaultValues: initialData || {
            test_a_jeun: false,
            retour_rapide_labo: false,
            preference_notification: 'both',
            is_active: true
        }
    });

    const [validating, setValidating] = useState(false);
    const [candidates, setCandidates] = useState([]);
    const [showCandidates, setShowCandidates] = useState(false);

    const [suggestions, setSuggestions] = useState([]);

    // Map State
    const [showMap, setShowMap] = useState(false);
    const [manualPos, setManualPos] = useState(initialData?.latitude && initialData?.longitude ? [initialData.latitude, initialData.longitude] : null);

    const addressValue = watch('adresse');

    // Debounce Address Autocomplete
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (addressValue && addressValue.length > 5) {
                // If user just selected a candidate, don't re-search immediately?
                // Actually difficult to distinguish typing vs selection without extra state.
                // We'll search, but maybe user won't mind if suggestions appear for what they selected if it's not perfect.
                try {
                    const res = await api.post('/geocoding/autocomplete', { address: addressValue });
                    // Filter out strict duplicates or same as current
                    setSuggestions(res.data);
                } catch (e) {
                    console.error("Autocomplete error", e);
                }
            } else {
                setSuggestions([]);
            }
        }, 500); // 500ms delay

        return () => clearTimeout(timer);
    }, [addressValue]);

    const handleValidate = async () => {
        if (!addressValue) return;
        setValidating(true);
        setCandidates([]);
        setShowCandidates(false);
        try {
            const res = await api.post('/geocoding/validate', { address: addressValue });
            if (res.data.status === 'valid' && res.data.candidates.length > 0) {
                // Auto-correct to the best match if very confident? 
                // Or just show green check. Let's show green check + formatted address suggestion if different
                const best = res.data.candidates[0];
                if (best.address !== addressValue) {
                    setCandidates(res.data.candidates); // Let user confirm change
                    setShowCandidates(true);
                } else {
                    // Perfect match
                    setShowCandidates(false);
                    // Show success feedback
                    toast.success("Adresse valide !");
                }
            } else if (res.data.status === 'ambiguous') {
                setCandidates(res.data.candidates);
                setShowCandidates(true);
            } else {
                // Invalid
                setCandidates([]);
                setShowCandidates(false);
                // Set field error
                // We need to use setError from react-hook-form. Assuming it's available or we can access it.
                // It is available from useForm destructuring at top.
                toast.error("Adresse introuvable ou invalide.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setValidating(false);
        }
    };

    const selectCandidate = (candidate) => {
        setValue('adresse', candidate.address);
        setShowCandidates(false);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom</label>
                    <input
                        {...register("nom", { required: "Requis" })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white transition-colors"
                    />
                    {errors.nom && <span className="text-red-500 dark:text-red-400 text-xs">{errors.nom.message}</span>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prénom</label>
                    <input
                        {...register("prenom")}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white transition-colors"
                    />
                    {errors.prenom && <span className="text-red-500 dark:text-red-400 text-xs">{errors.prenom.message}</span>}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adresse Complète</label>
                <div className="mt-1 flex gap-2">
                    <div className="relative flex-1">
                        <input
                            {...register("adresse", { required: "Requis" })}
                            className={`block w-full rounded-md border-gray-300 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white transition-colors ${candidates.length > 0 ? 'border-orange-300 dark:border-orange-700 ring-2 ring-orange-100 dark:ring-orange-900/30' : ''}`}
                            placeholder="Ex: 10 Rue du Marché, 1204 Genève"
                        />
                        {/* Autocomplete Dropdown - Show if suggestions exist and NOT validating/candidate flow */}
                        {suggestions.length > 0 && !showCandidates && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-auto">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-xs text-blue-800 dark:text-blue-300 font-bold border-b border-blue-100 dark:border-blue-800/50 flex items-center gap-1">
                                    <MapPin size={12} /> Suggestions :
                                </div>
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                            setValue('adresse', s.address);
                                            setSuggestions([]); // Clear suggestions
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-700 focus:bg-blue-50 dark:focus:bg-slate-700 transition-colors border-b dark:border-slate-700 last:border-0"
                                    >
                                        <div className="font-medium text-gray-800 dark:text-gray-200">{s.address}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {Math.round(s.confidence * 100)}%
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Validation Candidates Dropdown (Existing logic) */}
                        {showCandidates && candidates.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-auto">
                                <div className="p-2 bg-orange-50 dark:bg-orange-900/30 text-xs text-orange-800 dark:text-orange-300 font-bold border-b border-orange-100 dark:border-orange-800/50 flex items-center gap-1">
                                    <AlertTriangle size={12} /> Adresse ambiguë ou correction suggérée :
                                </div>
                                {candidates.map((c, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => selectCandidate(c)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-700 focus:bg-blue-50 dark:focus:bg-slate-700 transition-colors border-b dark:border-slate-700 last:border-0"
                                    >
                                        <div className="font-medium text-gray-800 dark:text-gray-200">{c.address}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                                            <span>Confiance: {Math.round(c.confidence * 100)}%</span>
                                            {c.match_type === 'exact' && <span className="text-green-600 dark:text-green-400 font-bold">Exact</span>}
                                        </div>
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setShowCandidates(false)}
                                    className="w-full text-center py-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border-t dark:border-slate-700"
                                >
                                    Ignorer les suggestions
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleValidate}
                        disabled={validating || !addressValue}
                        className="px-3 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        title="Vérifier l'adresse"
                    >
                        {validating ? <Loader2 className="animate-spin h-5 w-5" /> : <Check className="h-5 w-5" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowMap(!showMap)}
                        className={`px-3 py-2 border rounded-md ${showMap ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'} transition-colors flex items-center justify-center`}
                        title="Placer manuellement sur la carte"
                    >
                        📍
                    </button>
                </div>
                {errors.adresse && <span className="text-red-500 dark:text-red-400 text-xs">{errors.adresse.message}</span>}

                {/* Manual Map Picker */}
                {showMap && (
                    <div className="mt-3 p-3 border border-blue-200 rounded-md bg-blue-50">
                        <p className="text-sm font-medium text-blue-800 mb-2">
                            Mode Manuel : Cliquez sur la carte pour définir la position précise du patient. Cela remplacera le géocodage automatique.
                        </p>
                        <div className="h-64 w-full rounded-md overflow-hidden border border-gray-300 relative z-0">
                            <MapContainer
                                center={manualPos || [46.2044, 6.1432]}
                                zoom={13}
                                style={{ height: '100%', width: '100%', zIndex: 0 }}
                            >
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <MapEventPicker setPos={(pos) => {
                                    setManualPos(pos);
                                    setValue('latitude', pos[0]);
                                    setValue('longitude', pos[1]);
                                }} />
                                {manualPos && <Marker position={manualPos} />}
                            </MapContainer>
                        </div>
                        {manualPos && (
                            <p className="text-xs text-green-700 font-bold mt-2">
                                ✅ Coordonnées enregistrées : {manualPos[0].toFixed(5)}, {manualPos[1].toFixed(5)}
                            </p>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Téléphone</label>
                    <input
                        {...register("telephone")}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white transition-colors"
                        placeholder="+41 79 123 45 67"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <input
                        type="email"
                        {...register("email")}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white transition-colors"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date de Naissance</label>
                    <input
                        type="date"
                        {...register("date_naissance")}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-[color-scheme:dark] dark:text-white transition-colors"
                    />
                </div>
                <div className="flex items-center mt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            {...register("is_active")}
                            className="rounded border-gray-300 dark:border-slate-700 dark:bg-slate-900 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Patient Actif</span>
                    </label>
                </div>
            </div>

            {/* Scheduling / VIP Options */}
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-100 dark:border-blue-900/50 transition-colors">
                <h3 className="font-semibold text-blue-900 dark:text-blue-400 mb-3 flex items-center gap-2">
                    ⏱️ Options Planification & VIP
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Heure Préférentielle</label>
                        <input
                            type="time"
                            {...register("heure_preferee")}
                            className="block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-[color-scheme:dark] dark:text-white transition-colors"
                        />
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Cible pour l'optimisation (±30min)</p>
                    </div>
                    <div className="flex items-center mt-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                {...register("test_a_jeun")}
                                className="rounded border-gray-300 dark:border-slate-700 dark:bg-slate-900 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Test À Jeun (Matin)</span>
                        </label>
                    </div>
                    <div className="flex items-center mt-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                {...register("retour_rapide_labo")}
                                className="rounded border-gray-300 dark:border-slate-700 dark:bg-slate-900 text-purple-600 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Retour Rapide Labo (Fin)</span>
                        </label>
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <textarea
                    {...register("notes")}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white transition-colors"
                />
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="bg-white dark:bg-slate-800 py-2 px-4 border border-gray-300 dark:border-slate-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    Annuler
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    {isLoading && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                    Sauvegarder
                </button>
            </div>
        </form>
    );
}
