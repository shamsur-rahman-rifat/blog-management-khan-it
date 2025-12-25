// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './auth/ProtectedRoute';
import RoleRoute from './auth/RoleRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Topics from './pages/Topics';
import Articles from './pages/Articles';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import Team from './pages/Team';
import Report from './pages/Report';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login/>}/>
        <Route path="/" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />
        <Route path="/projects" element={<RoleRoute><Projects/></RoleRoute>} />
        <Route path="/topics" element={<ProtectedRoute><Topics/></ProtectedRoute>} />
        <Route path="/articles" element={<ProtectedRoute><Articles/></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute><Report/></ProtectedRoute>} />
        <Route path="/team" element={<Team/>} />
        <Route path="/profile" element={<Profile/>} />
        <Route path="*" element={<NotFound/>} />
      </Routes>
    </>
  );
}
