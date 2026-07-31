import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Mock user for testing without login requirement
const MOCK_ADMIN_USER = {
    id: 1,
    username: "admin",
    name: "Administrateur (Mode Test)",
    role: "admin"
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(MOCK_ADMIN_USER);
    const [token, setToken] = useState("mock-test-token");
    const [loading, setLoading] = useState(false);

    const login = async () => {
        setUser(MOCK_ADMIN_USER);
        setToken("mock-test-token");
        return true;
    };

    const logout = () => {
        // Keep mock user so test mode doesn't lock out
        setUser(MOCK_ADMIN_USER);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
