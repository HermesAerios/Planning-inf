import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Request interceptor for adding auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for navigation on 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            if (error.response.status === 401 || error.response.status === 403) {
                localStorage.removeItem('token');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            } else if (error.response.status >= 500) {
                // Instead of redirecting to server-error and losing form state,
                // show a toast notification for server errors.
                // We'll dispatch a custom event or use a global toast function if it was imported.
                // Since api.js is not an RC, we can just import toast directly.
                console.error("Server API Error 500+");
                // The toast import will handle the UI display
                import('react-toastify').then(({ toast }) => {
                    toast.error("Erreur serveur interne. Acte non sauvegardé, veuillez réessayer.");
                });
            }
        }
        return Promise.reject(error);
    }
);

export default api;
