import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950 p-4 text-center transition-colors">
            <AlertCircle className="w-16 h-16 text-blue-500 mb-4" />
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">404</h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">Page non trouvée</p>
            <p className="max-w-md text-gray-500 dark:text-gray-400 mb-8">
                La page que vous recherchez n'existe pas ou a été déplacée.
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
