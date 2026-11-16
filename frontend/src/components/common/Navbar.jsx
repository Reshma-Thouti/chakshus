/**
 * components/common/Navbar.jsx
 *
 * Remidio-inspired Clinical Header & Navigation Bar with Auth Integration.
 * Features:
 *  - Diagnostic system telemetry top-bar (AI engine status, camera calibration)
 *  - High-precision medical branding
 *  - Strict role-based navigation: Doctor vs Patient
 *  - Current authenticated identity pill with Logout action
 */

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Navbar() {
  const { selectedPatient, notification } = useAppContext();
  const { user, isAuthenticated, isDoctor, isPatient, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      {/* ── Remidio Device & System Telemetry Bar ─────── */}
      <div className="clinical-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>
            <span className="status-dot" />
            MEDIOS AI ENGINE: <strong>ONLINE (PyTorch ResNet-18)</strong>
          </span>
          <span style={{ opacity: 0.6 }}>|</span>
          <span style={{ opacity: 0.85 }}>OPTICAL PIPELINE: <strong>45° NON-MYDRIATIC FUNDUS</strong></span>
          <span style={{ opacity: 0.6 }}>|</span>
          <span style={{ opacity: 0.85 }}>CALIBRATION: <strong>ISO 13485 COMPLIANT</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--remidio-cyan)', fontWeight: 600 }}>POINT-OF-CARE TELE-OCULOMICS</span>
        </div>
      </div>

      {/* ── Main Navigation Bar ──────────────────────── */}
      <nav style={{
        background: 'var(--remidio-navy)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        padding: '0 var(--space-xl)',
        height: '62px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 14px rgba(7, 17, 29, 0.25)',
      }}>
        {/* Brand */}
        <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00C2CB 0%, #0F1D2F 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(0, 194, 203, 0.4)',
            color: '#FFFFFF',
            fontSize: '20px',
          }}>
            👁️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                DiaVision
              </span>
              <span style={{
                background: 'rgba(0, 194, 203, 0.2)',
                color: 'var(--remidio-cyan)',
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)',
              }}>
                AI-MED
              </span>
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Remidio-Class Retinal Diagnostics
            </div>
          </div>
        </NavLink>

        {/* Navigation Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <NavLink
            to="/"
            end
            style={({ isActive }) => ({
              color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
              background: isActive ? 'rgba(0, 194, 203, 0.18)' : 'transparent',
              border: isActive ? '1px solid rgba(0, 194, 203, 0.35)' : '1px solid transparent',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            })}
          >
            Overview
          </NavLink>

          {/* Doctor Portal Link */}
          {(!isAuthenticated || isDoctor) && (
            <NavLink
              to="/doctor"
              style={({ isActive }) => ({
                color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
                background: isActive ? 'rgba(0, 194, 203, 0.18)' : 'transparent',
                border: isActive ? '1px solid rgba(0, 194, 203, 0.35)' : '1px solid transparent',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              })}
            >
              🩺 Doctor Workstation
            </NavLink>
          )}

          {/* Patient Portal Link */}
          {isAuthenticated && isPatient && (
            <NavLink
              to={`/patient/${user?.patientProfileId || user?.id}`}
              style={({ isActive }) => ({
                color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
                background: isActive ? 'rgba(0, 194, 203, 0.18)' : 'transparent',
                border: isActive ? '1px solid rgba(0, 194, 203, 0.35)' : '1px solid transparent',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              })}
            >
              📋 My Vision Health Portal
            </NavLink>
          )}

          {/* User Status / Auth Button */}
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '8px' }}>
              <div style={{
                background: isDoctor ? 'rgba(0, 194, 203, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                border: `1px solid ${isDoctor ? 'rgba(0, 194, 203, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
                padding: '5px 12px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span style={{ fontSize: '13px' }}>{isDoctor ? '🩺' : '👤'}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
                  {user.name}
                </span>
                <span style={{
                  background: isDoctor ? 'var(--remidio-cyan)' : '#E2E8F0',
                  color: isDoctor ? '#0B192C' : '#1E293B',
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                }}>
                  {user.role}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="btn btn-outline btn-sm"
                style={{
                  fontSize: '12px',
                  color: '#FFFFFF',
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  padding: '5px 10px',
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
              <NavLink
                to="/login?portal=doctor"
                className="btn btn-outline btn-sm"
                style={{
                  fontSize: '12px',
                  color: '#FFFFFF',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  padding: '5px 12px',
                  textDecoration: 'none',
                }}
              >
                Doctor Sign In
              </NavLink>
              <NavLink
                to="/login?portal=patient"
                className="btn btn-cyan btn-sm"
                style={{
                  fontSize: '12px',
                  padding: '5px 12px',
                  textDecoration: 'none',
                }}
              >
                Patient Sign In
              </NavLink>
            </div>
          )}
        </div>
      </nav>

      {/* ── Global Notification Banner ───────────────── */}
      {notification && (
        <div
          style={{
            background: notification.type === 'success' ? '#ECFDF5' : notification.type === 'error' ? '#FEF2F2' : '#FFFBEB',
            color: notification.type === 'success' ? '#065F46' : notification.type === 'error' ? '#991B1B' : '#92400E',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            padding: '8px var(--space-xl)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>{notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : '⚠️'}</span>
          <span>{notification.message}</span>
        </div>
      )}
    </header>
  );
}
