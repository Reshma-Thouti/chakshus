/**
 * App.jsx — Route Definitions with Auth & Role Protection
 *
 * Routes:
 *   /               → Home (Overview / landing)
 *   /login          → AuthPage (Doctor vs Patient Sign In / Register)
 *   /signup         → AuthPage (Doctor vs Patient Sign In / Register)
 *   /doctor         → Doctor Dashboard (Doctor only)
 *   /patient/:id    → Patient Dashboard (Patient or Doctor)
 *   *               → 404 fallback
 */

import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar.jsx';
import Home from './pages/Home.jsx';
import AuthPage from './pages/AuthPage.jsx';
import PatientDashboard from './pages/PatientDashboard.jsx';
import DoctorDashboard from './pages/DoctorDashboard.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AppProvider } from './context/AppContext.jsx';

function DoctorRoute({ children }) {
  const { isAuthenticated, isDoctor, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!isAuthenticated || !isDoctor) {
    return <Navigate to="/login?portal=doctor" state={{ from: location }} replace />;
  }
  return children;
}

function PatientRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login?portal=patient" state={{ from: location }} replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <div className="page-wrapper">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/signup" element={<AuthPage />} />

              {/* Protected Doctor Workstation */}
              <Route
                path="/doctor"
                element={
                  <DoctorRoute>
                    <DoctorDashboard />
                  </DoctorRoute>
                }
              />

              {/* Protected Patient Vision Health Portal */}
              <Route
                path="/patient/:id"
                element={
                  <PatientRoute>
                    <PatientDashboard />
                  </PatientRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AppProvider>
    </AuthProvider>
  );
}
