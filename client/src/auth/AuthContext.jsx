// src/auth/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";
import api from '../api';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      try {
        const payload = jwtDecode(token);

        // Check for expiration and invalid token
        const currentTime = Date.now() / 1000; // Current time in seconds
        if (payload.exp && payload.exp < currentTime) {
          console.warn("Token has expired");
          logout(); // Log out the user if the token has expired
          return;
        }

        const email =
          payload.email ||
          payload.data?.email ||
          payload.data || // fallback if payload.data is just a string
          null;

        // Store email first, roles will be fetched from backend
        setUser({ email, roles: [] });
        localStorage.setItem('token', token);

        // ✅ Fetch roles from /profileDetails
        fetchUserProfile(token);

      } catch (err) {
        console.error('Invalid token', err);
        logout(); // Log out the user if the token is invalid
      }
    } else {
      setUser(null);
      localStorage.removeItem('token');
    }
  }, [token]);

  const fetchUserProfile = async (jwt) => {
    try {
      const res = await api.post('/profileDetails', {}, {
        headers: { token: jwt }
      });

      console.log("Profile details response:", res.data); // 🔍 Log it

      // Extract user object from array
      const userFromBackend = res.data?.data?.[0];

      if (userFromBackend) {
        setUser((prev) => ({
          ...prev,
          roles: userFromBackend.roles || [],
          name: userFromBackend.name,
          id: userFromBackend._id
        }));
      } else {
        console.warn("No user found in profileDetails response");
      }
    } catch (err) {
      console.error("Error fetching profile details:", err);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/login', { email, password });
    const t = res.data?.token || res.data;
    setToken(t);
    return t;
  };

  const register = async (payload) => {
    const res = await api.post('/registration', payload);
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    navigate('/login');
  };

  const value = { user, token, login, register, logout, setToken };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}