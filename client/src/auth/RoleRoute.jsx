// src/auth/RoleRoute.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';

export default function RoleRoute({ roles = [], children }) {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;

  // If roles empty, allow
  if (roles.length === 0) return children;

  const hasRole = roles.some(r => user.roles?.includes(r));
  if (!hasRole) return <Navigate to="/" replace />; // or not-authorized page
  return children;
}
