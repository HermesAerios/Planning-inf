import { Link } from 'react-router-dom';
import { ServerCrash } from 'lucide-react';

export default function ServerError() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950 p-4 text-center transition-colors">
            <ServerCrash className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">500</h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">Erreur Serveur</p>
            <p className="max-w-md text-gray-500 dark:text-gray-400 mb-8">
                Un problème est survenu de notre côté. Nos équipes ont été notifiées.
                Veuillez réessayer dans quelques instants.
            </p>
            <Link
                to="/"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors font-medium"
            >
                Retour à l'accueil
            </Link>
        </div>
    );
}
