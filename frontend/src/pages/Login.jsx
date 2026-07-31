import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            if (user.role === 'infirmier') {
                navigate('/tournee', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [user, navigate]);

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            const loggedUser = await login(data.username, data.password);
            toast.success('Connexion réussie');

            if (loggedUser && loggedUser.role === 'infirmier') {
                navigate('/tournee', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        } catch (error) {
            console.error('Login Error:', error);
            toast.error(error.message || "Échec de la connexion. Vérifiez vos identifiants.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-transparent dark:border-slate-800 transition-colors duration-200">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">Labo Tournées</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Connectez-vous à votre espace</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom d'utilisateur</label>
                            <input
                                id="username"
                                type="text"
                                {...register("username", { required: "Requis" })}
                                className="appearance-none rounded relative block w-full mt-1 px-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors"
                                placeholder="admin"
                            />
                            {errors.username && <span className="text-red-500 dark:text-red-400 text-xs mt-1 block">{errors.username.message}</span>}
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mot de passe</label>
                            <div className="relative mt-1">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    {...register("password", { required: "Requis" })}
                                    className="appearance-none rounded block w-full pr-10 px-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                    placeholder="********"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                    tabIndex={-1}
                                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.password && <span className="text-red-500 dark:text-red-400 text-xs mt-1 block">{errors.password.message}</span>}
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-colors"
                        >
                            {isLoading && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                            Se connecter
                        </button>
                    </div>

                    <div className="text-sm text-center text-gray-400 dark:text-gray-500">
                        <p>Demo Admin: admin / admin123</p>
                        <p>Demo Infirmier: infirmier1 / infirmier1123</p>
                    </div>
                </form>
            </div>
        </div>
    );
}
