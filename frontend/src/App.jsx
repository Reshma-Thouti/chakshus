/**
 * App.jsx — Route Definitions
 *
 * React Router v6 declarative routes:
 *   /               → Home (role selection landing page)
 *   /patient/:id    → Patient Dashboard (biometric logging + chart)
 *   /doctor         → Doctor Dashboard (image upload + risk scores)
 *   *               → 404 fallback
 *
 * The Navbar is rendered outside <Routes> so it appears on every page.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/common/Navbar.jsx';
import Home from './pages/Home.jsx';
import PatientDashboard from './pages/PatientDashboard.jsx';
import DoctorDashboard from './pages/DoctorDashboard.jsx';

function App() {
  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/"             element={<Home />} />
          <Route path="/patient/:id"  element={<PatientDashboard />} />
          <Route path="/doctor"       element={<DoctorDashboard />} />
          {/* Catch-all: redirect unknown routes to home */}
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
