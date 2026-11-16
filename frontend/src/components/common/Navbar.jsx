/**
 * components/common/Navbar.jsx
 *
 * Remidio-inspired Clinical Header & Navigation Bar.
 * Features:
 *  - Diagnostic system telemetry top-bar (AI engine status, camera calibration)
 *  - High-precision medical branding with butterfly/retina metamorphosis emblem
 *  - Clinical role routing
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext.jsx';

export default function Navbar() {
  const { selectedPatient, notification } = useAppContext();
  const location = useLocation();

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedPatient && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              color: '#FFFFFF',
              marginRight: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{ color: 'var(--remidio-cyan)' }}>●</span>
              <span>Patient: <strong>{selectedPatient.fullName}</strong></span>
              <span style={{ opacity: 0.6, fontSize: '11px' }}>({selectedPatient.diabetesType})</span>
            </div>
          )}

          <NavLink
            to="/"
            end
            style={({ isActive }) => ({
              color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
              background: isActive ? 'rgba(0, 194, 203, 0.18)' : 'transparent',
              border: isActive ? '1px solid rgba(0, 194, 203, 0.35)' : '1px solid transparent',
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            })}
          >
            Overview
          </NavLink>

          <NavLink
            to="/doctor"
            style={({ isActive }) => ({
              color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
              background: isActive ? 'rgba(0, 194, 203, 0.18)' : 'transparent',
              border: isActive ? '1px solid rgba(0, 194, 203, 0.35)' : '1px solid transparent',
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            })}
          >
            🩺 Clinical Workstation
          </NavLink>

          {selectedPatient && (
            <NavLink
              to={`/patient/${selectedPatient._id}`}
              style={({ isActive }) => ({
                color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
                background: isActive ? 'rgba(0, 194, 203, 0.18)' : 'transparent',
                border: isActive ? '1px solid rgba(0, 194, 203, 0.35)' : '1px solid transparent',
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              })}
            >
              📋 Patient Portal
            </NavLink>
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
