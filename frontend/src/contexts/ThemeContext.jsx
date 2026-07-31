import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const { user } = useAuth();
    const [theme, setTheme] = useState(() => localStorage.getItem('theme_preference') || 'light');

    useEffect(() => {
        // Apply theme from localStorage immediately on load
        applyTheme(theme);
        
        // Only fetch settings if user is logged in
        if (user) {
            api.get('/settings/')
                .then(res => {
                    if (res.data && res.data.theme_preference && res.data.theme_preference !== theme) {
                        applyTheme(res.data.theme_preference);
                    }
                })
                .catch(err => console.error("Failed to load theme preference", err));
        }
    }, [user]);

    const applyTheme = useCallback((newTheme) => {
        setTheme(newTheme);
        localStorage.setItem('theme_preference', newTheme);
        const root = document.documentElement;
        if (newTheme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, applyTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
