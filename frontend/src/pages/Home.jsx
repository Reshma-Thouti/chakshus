/**
 * pages/Home.jsx
 *
 * Landing page. Lets the user choose between the Patient view
 * and the Doctor view. In a real auth system this would be replaced
 * by a login page — for now it's a simple role selector.
 *
 * Also includes a quick "demo patient" selector so developers can
 * immediately navigate to the PatientDashboard with a mock patient ID.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.jsx';
import { getAllPatients } from '../services/api.js';

// ── Mock patients for development (Phase 1 — no real DB yet) ──
const MOCK_PATIENTS = [
  { _id: 'mock-001', fullName: 'Ravi Kumar',    diabetesType: 'Type 2', age: 54, diabetesDurationYears: 8  },
  { _id: 'mock-002', fullName: 'Anjali Sharma', diabetesType: 'Type 1', age: 32, diabetesDurationYears: 15 },
  { _id: 'mock-003', fullName: 'Murugan S.',    diabetesType: 'Type 2', age: 61, diabetesDurationYears: 12 },
];

export default function Home() {
  const navigate = useNavigate();
  const { selectPatient, setPatients, notify } = useAppContext();

  const [patients, setLocalPatients] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Try to fetch real patients; fall back to mock data ───
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
      .catch(() => {
        // Backend not running yet — silently use mock data
        setLocalPatients(MOCK_PATIENTS);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const handleSelectPatient = (patient) => {
    selectPatient(patient);
    navigate(`/patient/${patient._id}`);
  };

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
        <div style={{ fontSize: '64px', marginBottom: 'var(--space-md)' }}>👁️</div>
        <h1 style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-sm)', color: 'var(--color-primary)' }}>
          DiaVision
        </h1>
        <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-secondary)', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
          AI-assisted Diabetic Retinopathy prediction and prevention platform.
          Early detection saves vision.
        </p>
      </div>

      {/* ── Role Cards ────────────────────────────────── */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-2xl)', maxWidth: 800, margin: '0 auto var(--space-2xl)' }}>

        {/* Doctor Card */}
        <div
          className="card"
          style={{ cursor: 'pointer', transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)', textAlign: 'center' }}
          onClick={() => navigate('/doctor')}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ fontSize: '52px', marginBottom: 'var(--space-md)' }}>🩺</div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-sm)' }}>Doctor View</h2>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
            Upload fundus photographs, view AI-predicted DR grades, manage patient scans.
          </p>
          <button className="btn btn-primary btn-full">
            Enter Doctor Dashboard →
          </button>
        </div>

        {/* Patient Card */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: 'var(--space-md)' }}>📋</div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-sm)' }}>Patient View</h2>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
            Log daily glucose readings, blood pressure, and view your health progression chart.
          </p>

          {/* Patient selector */}
          {loading ? (
            <div className="spinner-overlay" style={{ padding: 'var(--space-md)' }}>
              <div className="spinner" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {patients.map((p) => (
                <button
                  key={p._id}
                  className="btn btn-outline btn-full"
                  onClick={() => handleSelectPatient(p)}
                >
                  👤 {p.fullName}
                  <span className="text-muted text-sm" style={{ marginLeft: 4 }}>
                    ({p.diabetesType}, {p.diabetesDurationYears}y)
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Info Strip ────────────────────────────────── */}
      <div style={{
        background: 'var(--color-primary-pale)',
        border:     '1px solid #BEE3F8',
        borderRadius: 'var(--radius-lg)',
        padding:    'var(--space-lg)',
        display:    'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap:        'var(--space-md)',
        textAlign:  'center',
        maxWidth:   900,
        margin:     '0 auto',
      }}>
        {[
          { emoji: '0', label: 'No DR',           sub: 'Healthy retina'      },
          { emoji: '1–2', label: 'Non-Proliferative', sub: 'Early changes'   },
          { emoji: '3', label: 'Severe NPDR',      sub: 'Urgent referral'    },
          { emoji: '4', label: 'Proliferative DR', sub: 'Surgical consult'   },
        ].map((item) => (
          <div key={item.label}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '4px' }}>
              Grade {item.emoji}
            </div>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{item.label}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{item.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
