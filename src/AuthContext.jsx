import React, { createContext, useState, useContext, useEffect } from 'react';

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

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setToken(null);
    setUserId(null);
    fetch('http://localhost:3001/api/logout', { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` } 
    });
  };

  // Utility function to get auth headers for API calls
  const getAuthHeaders = () => {
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const value = {
    token,
    userId,
    isAuthenticated: !!token,
    login,
    logout,
    getAuthHeaders
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
