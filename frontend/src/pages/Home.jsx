/**
 * pages/Home.jsx
 *
 * Overview & Portal Gateway for चक्षुस् (Chakshus).
 * Themes:
 *  - Primary navigation to Doctor Workstation and Patient Vision Health Portal
 *  - Automated tele-retinal classification & longitudinal metabolic monitoring
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import EyeSymbol from '../components/common/EyeSymbol.jsx';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, isDoctor, isPatient, user } = useAuth();

  const handleDoctorClick = () => {
    if (isAuthenticated && isDoctor) {
      navigate('/doctor');
    } else {
      navigate('/login?portal=doctor');
    }
  };

  const handlePatientClick = () => {
    if (isAuthenticated && isPatient) {
      navigate(`/patient/${user?.patientProfileId || user?.id}`);
    } else {
      navigate('/login?portal=patient');
    }
  };

  return (
    <div>
      {/* ── MedTech Hero ─────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #07111D 0%, #0F1D2F 60%, #162E4A 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-2xl) var(--space-xl)',
        color: '#FFFFFF',
        marginBottom: 'var(--space-2xl)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Ambient Cyan Glow */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 194, 203, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '820px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 194, 203, 0.15)', border: '1px solid rgba(0, 194, 203, 0.4)', padding: '4px 12px', borderRadius: '999px', marginBottom: 'var(--space-md)' }}>
            <EyeSymbol size={16} color="var(--remidio-cyan, #00C2CB)" />
            <span style={{ color: 'var(--remidio-cyan)', fontWeight: 800, fontSize: '12px', letterSpacing: '0.06em' }}>
              चक्षुस् &bull; CHAKSHUS
            </span>
            <span style={{ color: '#FFFFFF', opacity: 0.6, fontSize: '11px' }}>|</span>
            <span style={{ color: '#FFFFFF', fontSize: '11px', fontWeight: 500 }}>AI Retinal Vision Health Platform</span>
          </div>

          <h1 style={{ fontSize: '38px', fontWeight: 800, lineHeight: 1.15, color: '#FFFFFF', marginBottom: 'var(--space-md)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            चक्षुस् : AI-Powered Retinal Diagnostics &amp; Longitudinal Metabolic Health
          </h1>

          <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6, marginBottom: 'var(--space-xl)', maxWidth: '680px' }}>
            Empowering ophthalmologists with non-mydriatic fundus classification and direct transmission of verified clinical screening summaries to patient portals.
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <button
              className="btn btn-cyan btn-lg"
              onClick={handleDoctorClick}
            >
              {isAuthenticated && isDoctor ? 'Go to Doctor Workstation' : 'Doctor Portal'}
            </button>
            <button
              className="btn btn-outline btn-lg"
              onClick={handlePatientClick}
              style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)' }}
            >
              {isAuthenticated && isPatient ? 'Go to My Vision Portal' : 'Patient Portal'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Key Feature Pillars ───────────────────────── */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div className="card" style={{ borderTop: '3px solid var(--remidio-cyan)' }}>
          <div style={{ marginBottom: 'var(--space-sm)' }}>
            <EyeSymbol size={28} color="var(--remidio-cyan)" />
          </div>
          <h3 style={{ fontSize: '17px', marginBottom: '6px' }}>Edge-AI Automated Triage</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
            Rapid automated classification for <strong>Referable Diabetic Retinopathy</strong> using deep neural networks trained on clinical fundus datasets.
          </p>
        </div>

        <div className="card" style={{ borderTop: '3px solid #10B981' }}>
          <div style={{ marginBottom: 'var(--space-sm)' }}>
            <EyeSymbol size={28} color="#10B981" />
          </div>
          <h3 style={{ fontSize: '17px', marginBottom: '6px' }}>Multi-Spectral Retinal Lens</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
            Toggle between True-Color, Red-Free (Green channel vessel enhancement), and AI Class Activation Maps (CAM lesion heatmaps).
          </p>
        </div>

        <div className="card" style={{ borderTop: '3px solid #6366F1' }}>
          <div style={{ marginBottom: 'var(--space-sm)' }}>
            <EyeSymbol size={28} color="#6366F1" />
          </div>
          <h3 style={{ fontSize: '17px', marginBottom: '6px' }}>Direct Report Synchronization</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
            Clinicians review retinal scans and transmit signed diagnostic summaries directly to their patient's personal portal.
          </p>
        </div>
      </div>

      {/* ── Two Clinical Portals Section ──────────────────── */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-2xl)' }}>
        {/* Doctor Entry Card */}
        <div
          className="card"
          style={{ cursor: 'pointer', transition: 'all 0.2s ease', border: '1.5px solid var(--color-border)' }}
          onClick={handleDoctorClick}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--remidio-cyan)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
            <span className="badge" style={{ background: 'var(--remidio-cyan-light)', color: 'var(--remidio-cyan-hover)' }}>
              FOR OPHTHALMOLOGISTS
            </span>
            <span style={{ fontSize: '16px' }}>&rarr;</span>
          </div>
          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Doctor Portal</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
            Ingest fundus photographs, view AI-predicted ICDR severity, enroll patients to your isolated roster, and transmit signed screening reports to patients.
          </p>
          <button className="btn btn-primary btn-full">
            {isAuthenticated && isDoctor ? 'Open Workstation & Review Scans →' : 'Doctor Portal Sign In →'}
          </button>
        </div>

        {/* Patient Entry Card */}
        <div
          className="card"
          style={{ cursor: 'pointer', transition: 'all 0.2s ease', border: '1.5px solid var(--color-border)' }}
          onClick={handlePatientClick}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
            <span className="badge" style={{ background: '#ECFDF5', color: '#065F46' }}>
              FOR PATIENTS
            </span>
            <span style={{ fontSize: '16px' }}>&rarr;</span>
          </div>
          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Patient Portal</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
            Log in to view retinal scan updates and certified recommendations from your attending ophthalmologist, and log daily fasting/post-meal glucose and blood pressure readings.
          </p>
          <button className="btn btn-cyan btn-full">
            {isAuthenticated && isPatient ? 'View My Retinal Reports & Log Telemetry →' : 'Patient Portal Sign In →'}
          </button>
        </div>
      </div>

      {/* ── ICDR Clinical Severity Reference ──────────── */}
      <div className="card card-dark" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: '16px', color: 'var(--remidio-cyan)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-md)' }}>
          International Clinical Diabetic Retinopathy (ICDR) Scale Supported
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {[
            { grade: '0', title: 'No DR', desc: 'No microvascular lesions' },
            { grade: '1', title: 'Mild NPDR', desc: 'Microaneurysms only' },
            { grade: '2', title: 'Moderate NPDR', desc: 'Exudates & hemorrhages' },
            { grade: '3', title: 'Severe NPDR', desc: '4-2-1 ischemia rule' },
            { grade: '4', title: 'Proliferative DR', desc: 'Neovascularization / PDR' },
          ].map((item) => (
            <div key={item.grade} style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--remidio-cyan)' }}>
                Grade {item.grade}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>{item.title}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
