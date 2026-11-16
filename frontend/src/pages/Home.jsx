/**
 * pages/Home.jsx
 *
 * Remidio-Inspired Landing & System Portal.
 * Themes:
 *  - "Make it Simple" — Transforming Eye Health through Point-of-Care Edge-AI
 *  - Primary navigation to Doctor Workstation and Patient Oculomics Portal
 *  - Tele-ophthalmology metrics & clinical validation banners
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.jsx';
import { getAllPatients } from '../services/api.js';

const MOCK_PATIENTS = [
  { _id: 'mock-001', fullName: 'Ravi Kumar',    diabetesType: 'Type 2', age: 54, diabetesDurationYears: 8  },
  { _id: 'mock-002', fullName: 'Anjali Sharma', diabetesType: 'Type 1', age: 32, diabetesDurationYears: 15 },
  { _id: 'mock-003', fullName: 'Murugan S.',    diabetesType: 'Type 2', age: 61, diabetesDurationYears: 12 },
];

export default function Home() {
  const navigate = useNavigate();
  const { selectPatient, setPatients } = useAppContext();

  const [patients, setLocalPatients] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAllPatients()
      .then((data) => {
        const list = data?.patients || data || [];
        if (list.length > 0) {
          setLocalPatients(list);
          setPatients(list);
        } else {
          setLocalPatients(MOCK_PATIENTS);
        }
      })
      .catch(() => setLocalPatients(MOCK_PATIENTS))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const handleSelectPatient = (patient) => {
    selectPatient(patient);
    navigate(`/patient/${patient._id}`);
  };

  return (
    <div>
      {/* ── Remidio-Inspired MedTech Hero ─────────────── */}
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
            <span style={{ color: 'var(--remidio-cyan)', fontWeight: 800, fontSize: '11px', letterSpacing: '0.06em' }}>
              ✦ REMIDIO-INSPIRED OCULOMICS
            </span>
            <span style={{ color: '#FFFFFF', opacity: 0.6, fontSize: '11px' }}>|</span>
            <span style={{ color: '#FFFFFF', fontSize: '11px', fontWeight: 500 }}>Eliminating Preventable Blindness</span>
          </div>

          <h1 style={{ fontSize: '38px', fontWeight: 800, lineHeight: 1.15, color: '#FFFFFF', marginBottom: 'var(--space-md)' }}>
            AI-Powered Retinal Diagnostics &amp; Longitudinal Metabolic Health
          </h1>

          <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6, marginBottom: 'var(--space-xl)', maxWidth: '680px' }}>
            Empowering ophthalmologists and primary healthcare providers with point-of-care, non-mydriatic fundus classification and daily glycemic telemetry.
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <button
              className="btn btn-cyan btn-lg"
              onClick={() => navigate('/doctor')}
            >
              🩺 Launch Doctor Workstation
            </button>
            <button
              className="btn btn-outline btn-lg"
              onClick={() => handleSelectPatient(patients[0] || MOCK_PATIENTS[0])}
              style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)' }}
            >
              📋 Patient Biometrics Portal
            </button>
          </div>
        </div>
      </div>

      {/* ── Key Feature Pillars ───────────────────────── */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div className="card" style={{ borderTop: '3px solid var(--remidio-cyan)' }}>
          <div style={{ fontSize: '32px', marginBottom: 'var(--space-sm)' }}>⚡</div>
          <h3 style={{ fontSize: '17px', marginBottom: '6px' }}>Edge-AI Automated Triage</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
            Instant classification for <strong>Referable Diabetic Retinopathy</strong> within 2.5 seconds using PyTorch ResNet-18 neural networks.
          </p>
        </div>

        <div className="card" style={{ borderTop: '3px solid #10B981' }}>
          <div style={{ fontSize: '32px', marginBottom: 'var(--space-sm)' }}>🔬</div>
          <h3 style={{ fontSize: '17px', marginBottom: '6px' }}>Multi-Spectral Retinal Lens</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
            Toggle between True-Color, Red-Free (Green channel vessel enhancement), and AI Class Activation Maps (CAM lesion heatmaps).
          </p>
        </div>

        <div className="card" style={{ borderTop: '3px solid #6366F1' }}>
          <div style={{ fontSize: '32px', marginBottom: 'var(--space-sm)' }}>📈</div>
          <h3 style={{ fontSize: '17px', marginBottom: '6px' }}>Daily Tele-Oculomics</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
            Correlates daily patient fasting and post-meal glucose logs with retinal changes to predict vision loss before it occurs.
          </p>
        </div>
      </div>

      {/* ── Clinical Portals Section ──────────────────── */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-2xl)' }}>
        {/* Doctor Entry Card */}
        <div
          className="card"
          style={{ cursor: 'pointer', transition: 'all 0.2s ease', border: '1.5px solid var(--color-border)' }}
          onClick={() => navigate('/doctor')}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--remidio-cyan)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
            <span className="badge" style={{ background: 'var(--remidio-cyan-light)', color: 'var(--remidio-cyan-hover)' }}>
              FOR CLINICIANS
            </span>
            <span style={{ fontSize: '20px' }}>➔</span>
          </div>
          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Ophthalmology Workstation</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
            Ingest 45° non-mydriatic fundus photographs, view AI-predicted ICDR Grade 0–4 severity, review daily glucose progression, and generate signed tele-ophthalmology screening reports.
          </p>
          <button className="btn btn-primary btn-full">
            Open Workstation &amp; Review Scans &rarr;
          </button>
        </div>

        {/* Patient Entry Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
            <span className="badge" style={{ background: '#ECFDF5', color: '#065F46' }}>
              FOR PATIENTS
            </span>
            <span className="mono-tag" style={{ color: 'var(--color-text-muted)' }}>SELECT PROFILE</span>
          </div>
          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Patient Health Portal</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)', lineHeight: 1.6 }}>
            Track fasting and post-meal glucose, record blood pressure, and monitor your personal retinal protection score:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {patients.map((p) => (
              <button
                key={p._id}
                className="btn btn-outline btn-full"
                onClick={() => handleSelectPatient(p)}
                style={{ justifyContent: 'space-between', padding: '10px 14px' }}
              >
                <span>👤 <strong>{p.fullName}</strong> ({p.diabetesType}, {p.diabetesDurationYears}y)</span>
                <span style={{ color: 'var(--remidio-cyan-hover)', fontWeight: 700 }}>Log Biometrics &rarr;</span>
              </button>
            ))}
          </div>
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
