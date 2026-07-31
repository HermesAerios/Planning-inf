import { useState, useEffect } from 'react';
import Stepper from '../components/ui/Stepper';
import PatientSelector from '../components/optimisation/PatientSelector';
import OptimisationParams from '../components/optimisation/OptimisationParams';
import OptimisationResults from '../components/optimisation/OptimisationResults';
import api from '../services/api';

export default function Optimisation() {
    const [step, setStep] = useState(1);
    const [selectedPatients, setSelectedPatients] = useState([]); // Now array of {id, a_jeun, retour_rapide}
    const [params, setParams] = useState({
        nbInfirmiers: 3,
        date: new Date().toISOString().slice(0, 10),
        heureDebut: "07:30"
    });
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        return () => {
            if (window.optimisationPollInterval) {
                clearInterval(window.optimisationPollInterval);
            }
        };
    }, []);

    const handleOptimize = async () => {
        setLoading(true);
        try {
            const res = await api.post('/optimisation/optimiser-async', {
                patients: selectedPatients, // Send full objects with criteria
                nb_infirmiers: params.nbInfirmiers,
                duree_max: 480, // Hardcoded generous limit so solver doesn't constraint itself unnecessarily
                date: params.date,
                heure_debut: params.heureDebut
            });
            const { job_id } = res.data;

            // Polling job status
            window.optimisationPollInterval = setInterval(async () => {
                try {
                    const jobRes = await api.get(`/optimisation/jobs/${job_id}`);
                    const job = jobRes.data;

                    if (job.status === 'done') {
                        clearInterval(window.optimisationPollInterval);
                        setResults(job.result);
                        setLoading(false);
                        setStep(3);
                    } else if (job.status === 'error') {
                        clearInterval(window.optimisationPollInterval);
                        alert('Erreur : ' + job.error);
                        setLoading(false);
                    }
                } catch (e) {
                    clearInterval(window.optimisationPollInterval);
                    alert('Polling Error');
                    setLoading(false);
                }
            }, 1000);
        } catch (e) {
            alert('Erreur : ' + e.message);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <Stepper currentStep={step} />

            {step === 1 && (
                <PatientSelector
                    selected={selectedPatients}
                    onChange={setSelectedPatients}
                    onNext={() => setStep(2)}
                    currentDate={params.date}
                />
            )}

            {step === 2 && (
                <OptimisationParams
                    params={params}
                    onChange={setParams}
                    onBack={() => setStep(1)}
                    onOptimize={handleOptimize}
                    loading={loading}
                />
            )}

            {step === 3 && results && (
                <OptimisationResults
                    results={results}
                    onRestart={() => { setStep(1); setResults(null); setSelectedPatients([]); }}
                />
            )}
        </div>
    );
}
