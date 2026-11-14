/**
 * components/common/Navbar.jsx
 *
 * Top navigation bar — present on every page.
 * Shows the application brand and role-based navigation links.
 * Uses React Router's NavLink (not <a href>) so navigation is client-side
 * and the active link gets an 'active' style automatically.
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext.jsx';

// ── Inline styles for the navbar (self-contained component) ──
const styles = {
  nav: {
    background: 'var(--color-primary)',
    color: '#fff',
    padding: '0 var(--space-xl)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    color: '#fff',
    fontSize: 'var(--font-size-lg)',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    textDecoration: 'none',
  },
  brandIcon: {
    fontSize: '24px',
  },
  brandSub: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: '400',
    opacity: 0.75,
    display: 'block',
    lineHeight: 1,
    letterSpacing: '0.03em',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
  },
  navLink: {
    color: 'rgba(255,255,255,0.80)',
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: '500',
    textDecoration: 'none',
    transition: 'all var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  navLinkActive: {
    color: '#fff',
    background: 'rgba(255,255,255,0.15)',
  },
  badge: {
    background: 'rgba(255,255,255,0.20)',
    color: '#fff',
    fontSize: '10px',
    fontWeight: '700',
    padding: '1px 6px',
    borderRadius: '999px',
    letterSpacing: '0.03em',
  },
};

export default function Navbar() {
  const { selectedPatient, notification } = useAppContext();
  const location = useLocation();

  // Derive active section for the notification context
  const isPatientView = location.pathname.startsWith('/patient');
  const isDoctorView  = location.pathname.startsWith('/doctor');

  return (
    <>
      <nav style={styles.nav}>
        {/* Brand */}
        <NavLink to="/" style={styles.brand}>
          <span style={styles.brandIcon}>👁️</span>
          <span>
            DiaVision
            <span style={styles.brandSub}>Diabetic Vision Health System</span>
          </span>
        </NavLink>

        {/* Navigation Links */}
        <div style={styles.navLinks}>
          {/* Show current patient in nav if one is selected */}
          {selectedPatient && (
            <span style={{ ...styles.navLink, opacity: 0.7, cursor: 'default' }}>
              👤 {selectedPatient.fullName}
            </span>
          )}

          <NavLink
            to="/"
            end
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {}),
            })}
          >
            🏠 Home
          </NavLink>

          <NavLink
            to="/doctor"
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {}),
            })}
          >
            🩺 Doctor View
          </NavLink>

          {/* Only show Patient link when a patient is selected */}
          {selectedPatient && (
            <NavLink
              to={`/patient/${selectedPatient._id}`}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              📋 Patient Log
            </NavLink>
          )}
        </div>
      </nav>

      {/* Global Notification Toast ── positioned below nav */}
      {notification && (
        <div
          className={`alert alert-${
            notification.type === 'error' ? 'danger' : notification.type
          }`}
          style={{
            margin: '0',
            borderRadius: '0',
            borderLeft: 'none',
            borderRight: 'none',
            borderTop: 'none',
            justifyContent: 'center',
            fontWeight: 500,
          }}
        >
          {notification.type === 'success' && '✅ '}
          {notification.type === 'error'   && '❌ '}
          {notification.type === 'warning' && '⚠️ '}
          {notification.type === 'info'    && 'ℹ️ '}
          {notification.message}
        </div>
      )}
    </>
  );
}
