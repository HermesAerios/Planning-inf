import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
                    <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full border border-red-100">
                        <div className="flex justify-center mb-6">
                            <div className="p-3 bg-red-100 rounded-full">
                                <AlertTriangle className="w-10 h-10 text-red-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Une erreur est survenue</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            L'application a rencontré un problème inattendu. Nous avons été notifiés.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="text-left bg-gray-100 p-4 rounded mb-6 overflow-auto text-xs font-mono max-h-40">
                                {this.state.error.toString()}
                            </div>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
                        >
                            <RefreshCcw size={18} />
                            Recharger la page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
