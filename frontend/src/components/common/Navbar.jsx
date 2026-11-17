/**
 * components/common/Navbar.jsx
 *
 * Clinical Header & Navigation Bar for चक्षुस् (Chakshus).
 * Features:
 *  - High-precision medical branding with Sanskrit name चक्षुस् and vector eye emblem
 *  - Strict role-based navigation: Doctor vs Patient
 *  - Authenticated identity pill with Logout action
 */

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import EyeSymbol from './EyeSymbol.jsx';

export default function Navbar() {
  const { selectedPatient, notification } = useAppContext();
  const { user, isAuthenticated, isDoctor, isPatient, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100 }}>
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
        <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(0, 194, 203, 0.25) 0%, rgba(15, 29, 47, 0.9) 100%)',
            border: '1px solid rgba(0, 194, 203, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 14px rgba(0, 194, 203, 0.3)',
          }}>
            <EyeSymbol size={22} color="var(--remidio-cyan, #00C2CB)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.01em', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                चक्षुस्
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
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.65)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              CHAKSHUS &bull; Retinal Diagnostics
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

          {/* Doctor Portal Link (Only visible when logged in as Doctor) */}
          {isAuthenticated && isDoctor && (
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
              Doctor Workstation
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
              My Health Portal
            </NavLink>
          )}

          {/* Admin Console Link (Only visible when logged in as Admin) */}
          {isAuthenticated && isAdmin && (
            <NavLink
              to="/admin"
              style={({ isActive }) => ({
                color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.85)',
                background: isActive ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.12)',
                border: isActive ? '1px solid rgba(245, 158, 11, 0.6)' : '1px solid rgba(245, 158, 11, 0.3)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              })}
            >
              <span>⚙️</span>
              <span>Admin Console</span>
            </NavLink>
          )}

          {/* User Status / Auth Button */}
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '8px' }}>
              <div style={{
                background: isDoctor ? 'rgba(0, 194, 203, 0.15)' : isAdmin ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                border: `1px solid ${isDoctor ? 'rgba(0, 194, 203, 0.4)' : isAdmin ? 'rgba(245, 158, 11, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                padding: '5px 12px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
                  {user.name}
                </span>
                <span style={{
                  background: isDoctor ? 'var(--remidio-cyan)' : isAdmin ? '#F59E0B' : '#E2E8F0',
                  color: isDoctor ? '#0B192C' : isAdmin ? '#1E293B' : '#1E293B',
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
                to="/login"
                className="btn btn-cyan btn-sm"
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '6px 14px',
                  textDecoration: 'none',
                }}
              >
                Sign In / Register
              </NavLink>
              <NavLink
                to="/login?portal=admin"
                className="btn btn-sm"
                style={{
                  fontSize: '12px',
                  padding: '5px 12px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#FCD34D',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                  textDecoration: 'none',
                  fontWeight: 700,
                }}
              >
                Admin
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
