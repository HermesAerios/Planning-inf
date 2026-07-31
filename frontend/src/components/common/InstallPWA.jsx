import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function InstallPWA() {
    const [supportsPWA, setSupportsPWA] = useState(false);
    const [promptInstall, setPromptInstall] = useState(null);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setSupportsPWA(true);
            setPromptInstall(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const onClick = (evt) => {
        evt.preventDefault();
        if (!promptInstall) {
            return;
        }
        promptInstall.prompt();
    };

    if (!supportsPWA) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <button
                className="bg-blue-600 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 font-bold animate-bounce"
                onClick={onClick}
                title="Installer l'application"
            >
                <Download size={20} /> Installer l'App
            </button>
        </div>
    );
}
