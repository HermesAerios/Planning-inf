import { createContext, useContext, useState, useEffect } from "react";
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Configure axios defaults
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Need to set base URL from env
    axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

    useEffect(() => {
        checkUser();
    }, [token]);

    const checkUser = async () => {
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const res = await axios.get('/auth/me');
            setUser(res.data);
        } catch (error) {
            console.error("Auth check failed", error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const res = await axios.post('/auth/login', formData);
        const { access_token } = res.data;

        localStorage.setItem('token', access_token);
        setToken(access_token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

        // Fetch user immediately
        const userRes = await axios.get('/auth/me');
        setUser(userRes.data);

        return true;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
