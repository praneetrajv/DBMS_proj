import { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [userId, setUserId] = useState(parseInt(localStorage.getItem('userId')) || null);

    const login = (newToken, newUserId) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('userId', newUserId);
        setToken(newToken);
        setUserId(newUserId);
    };

    const logout = async () => {
        const currentToken = token;
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        setToken(null);
        setUserId(null);

        if (currentToken) {
            try {
                await fetch('http://localhost:3001/api/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${currentToken}` }
                });
            } catch (error) {
                console.error('Logout API call failed:', error);
            }
        }
    };

    const getAuthHeaders = () => {
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    const authenticatedFetch = async (url, options = {}) => {
        const headers = {
            ...options.headers,
            ...getAuthHeaders()
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            const data = await response.json().catch(() => ({}));
            if (data.expired) {
                console.log('Session expired, logging out...');
                logout();
            }
        }

        return response;
    };

    const value = {
        token,
        userId,
        isAuthenticated: !!token,
        login,
        logout,
        getAuthHeaders,
        authenticatedFetch
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
