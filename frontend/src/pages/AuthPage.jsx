/**
 * pages/AuthPage.jsx
 *
 * Dedicated Multi-Portal Login & Registration Interface.
 * Strictly separates:
 *  1. Doctor Diagnostic Portal (Clinical Workstation Access)
 *  2. Patient Vision Health Portal (Personal Glycemic & Retinal Report Access)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDoctorsList } from '../services/api';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, isAuthenticated, user, isDoctor, isPatient } = useAuth();

  // Selected portal tab: 'doctor' | 'patient'
  const initialPortal = searchParams.get('portal') === 'patient' ? 'patient' : 'doctor';
  const [portal, setPortal] = useState(initialPortal);

  // Form mode: 'login' | 'register'
  const [mode, setMode] = useState('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Doctor-specific registration fields
  const [specialization, setSpecialization] = useState('Ophthalmologist / Retina Specialist');
  const [hospitalOrClinic, setHospitalOrClinic] = useState('Apex Eye & Tele-Oculomics Institute');

  // Patient-specific registration fields
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('1975-06-15');
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('+91 98765 00000');
  const [diabetesType, setDiabetesType] = useState('Type 2');
  const [diabetesDurationYears, setDiabetesDurationYears] = useState('6');
  const [baselineHbA1c, setBaselineHbA1c] = useState('7.5');
  const [hasHypertension, setHasHypertension] = useState(false);

  // UI status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch doctors list for patient allotment dropdown
  useEffect(() => {
    getDoctorsList()
      .then((res) => {
        const list = res?.doctors || [];
        setDoctors(list);
        if (list.length > 0) setSelectedDoctorId(list[0]._id);
      })
      .catch((err) => console.warn('Could not load doctors list:', err.message));
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (isDoctor) {
        navigate('/doctor', { replace: true });
      } else if (isPatient) {
        navigate(`/patient/${user.patientProfileId || user.id}`, { replace: true });
      }
    }
  }, [isAuthenticated, user, isDoctor, isPatient, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password, portal);
        setSuccessMsg(`Welcome, ${res.user.name}!`);
        if (res.user.role === 'doctor') {
          navigate('/doctor');
        } else {
          navigate(`/patient/${res.user.patientProfileId || res.user.id}`);
        }
      } else {
        // Register
        if (portal === 'doctor') {
          const res = await register({
            name,
            email,
            password,
            role: 'doctor',
            specialization,
            hospitalOrClinic,
          });
          setSuccessMsg('Doctor account created successfully!');
          navigate('/doctor');
        } else {
          // Patient registration requires doctor allotment
          if (!selectedDoctorId) {
            setErrorMsg('Please select your attending ophthalmologist.');
            setLoading(false);
            return;
          }
          const res = await register({
            name,
            email,
            password,
            role: 'patient',
            assignedDoctorId: selectedDoctorId,
            dateOfBirth,
            gender,
            phone,
            diabetesType,
            diabetesDurationYears: Number(diabetesDurationYears),
            baselineHbA1c: Number(baselineHbA1c),
            hasHypertension,
          });
          setSuccessMsg('Patient account registered and allotted to doctor!');
          navigate(`/patient/${res.user.patientProfileId || res.user.id}`);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo fill buttons for hassle-free evaluation
  const setQuickDoctorA = () => {
    setPortal('doctor');
    setMode('login');
    setEmail('dr.sharma@diavision.com');
    setPassword('password123');
    setErrorMsg('');
  };

  const setQuickDoctorB = () => {
    setPortal('doctor');
    setMode('login');
    setEmail('dr.malhotra@diavision.com');
    setPassword('password123');
    setErrorMsg('');
  };

  const setQuickPatient1 = () => {
    setPortal('patient');
    setMode('login');
    setEmail('ramesh.kumar@example.com');
    setPassword('password123');
    setErrorMsg('');
  };

  const setQuickPatient3 = () => {
    setPortal('patient');
    setMode('login');
    setEmail('rajesh.verma@example.com');
    setPassword('password123');
    setErrorMsg('');
  };

  return (
    <div style={{ maxWidth: '640px', margin: 'var(--space-xl) auto', padding: '0 var(--space-md)' }}>
      {/* ── Brand / Header ───────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #00C2CB 0%, #0B192C 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0, 194, 203, 0.35)',
          color: '#FFFFFF',
          fontSize: '28px',
          margin: '0 auto var(--space-md)',
        }}>
          👁️
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--remidio-navy)', letterSpacing: '-0.02em', marginBottom: '6px' }}>
          DiaVision Clinical Portal
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', maxWidth: '440px', margin: '0 auto' }}>
          Secure, multi-tenant tele-ophthalmology &amp; diabetic retinal monitoring system
        </p>
      </div>

      {/* ── Portal Selector Tabs (Doctor vs Patient) ──── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        background: '#E2E8F0',
        padding: '6px',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-lg)',
      }}>
        <button
          type="button"
          onClick={() => { setPortal('doctor'); setErrorMsg(''); }}
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: portal === 'doctor' ? '#0B192C' : 'transparent',
            color: portal === 'doctor' ? '#FFFFFF' : '#475569',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            boxShadow: portal === 'doctor' ? '0 2px 8px rgba(11, 25, 44, 0.2)' : 'none',
          }}
        >
          <span>🩺</span> Doctor Portal
        </button>

        <button
          type="button"
          onClick={() => { setPortal('patient'); setErrorMsg(''); }}
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: portal === 'patient' ? '#00878E' : 'transparent',
            color: portal === 'patient' ? '#FFFFFF' : '#475569',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            boxShadow: portal === 'patient' ? '0 2px 8px rgba(0, 135, 142, 0.2)' : 'none',
          }}
        >
          <span>👤</span> Patient Portal
        </button>
      </div>

      {/* ── Quick Demo Helper Banner ──────────────────── */}
      <div style={{
        background: 'rgba(0, 194, 203, 0.08)',
        border: '1px dashed var(--remidio-cyan-hover)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        marginBottom: 'var(--space-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          ⚡ 1-Click Quick Demo Accounts (Multi-Tenancy Verification)
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {portal === 'doctor' ? (
            <>
              <button
                type="button"
                onClick={setQuickDoctorA}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '11px', background: '#FFFFFF' }}
              >
                🩺 Dr. Sharma (Doctor A)
              </button>
              <button
                type="button"
                onClick={setQuickDoctorB}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '11px', background: '#FFFFFF' }}
              >
                🩺 Dr. Malhotra (Doctor B)
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={setQuickPatient1}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '11px', background: '#FFFFFF' }}
              >
                👤 Ramesh Kumar (Dr. Sharma's Patient)
              </button>
              <button
                type="button"
                onClick={setQuickPatient3}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '11px', background: '#FFFFFF' }}
              >
                👤 Rajesh Verma (Dr. Malhotra's Patient)
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Main Auth Card ───────────────────────────── */}
      <div className="card" style={{ padding: 'var(--space-xl)', boxShadow: 'var(--shadow-md)' }}>
        {/* Toggle Login vs Register */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-lg)' }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); }}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              borderBottom: mode === 'login' ? '2.5px solid var(--remidio-cyan)' : '2.5px solid transparent',
              color: mode === 'login' ? 'var(--remidio-navy)' : 'var(--color-text-muted)',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(''); }}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              borderBottom: mode === 'register' ? '2.5px solid var(--remidio-cyan)' : '2.5px solid transparent',
              color: mode === 'register' ? 'var(--remidio-navy)' : 'var(--color-text-muted)',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Create New Account
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            marginBottom: 'var(--space-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            marginBottom: 'var(--space-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span>✓</span> {successMsg}
          </div>
        )}

        {/* ── Auth Form ────────────────────────────────── */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {mode === 'register' && (
            <div>
              <label className="label">Full Legal Name *</label>
              <input
                type="text"
                className="input"
                required
                placeholder={portal === 'doctor' ? 'Dr. Ananya Sharma' : 'Ramesh Kumar'}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="label">Email Address *</label>
            <input
              type="email"
              className="input"
              required
              placeholder={portal === 'doctor' ? 'doctor@clinic.com' : 'patient@email.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Password *</label>
            <input
              type="password"
              className="input"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Doctor Extra Fields on Register */}
          {mode === 'register' && portal === 'doctor' && (
            <>
              <div>
                <label className="label">Specialization</label>
                <input
                  type="text"
                  className="input"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Hospital / Eye Institute</label>
                <input
                  type="text"
                  className="input"
                  value={hospitalOrClinic}
                  onChange={(e) => setHospitalOrClinic(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Patient Extra Fields on Register (Doctor Allotment & Clinical Baseline) */}
          {mode === 'register' && portal === 'patient' && (
            <>
              <div>
                <label className="label" style={{ color: 'var(--remidio-cyan-hover)', fontWeight: 700 }}>
                  Select Your Attending Doctor * (Allotment)
                </label>
                <select
                  className="input"
                  required
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  style={{ fontWeight: 600 }}
                >
                  {doctors.length === 0 ? (
                    <option value="">No registered doctors found. Register a doctor first!</option>
                  ) : (
                    doctors.map((doc) => (
                      <option key={doc._id} value={doc._id}>
                        {doc.name} — {doc.specialization || 'Ophthalmologist'} ({doc.hospitalOrClinic || 'Clinic'})
                      </option>
                    ))
                  )}
                </select>
                <span className="text-xs text-muted" style={{ display: 'block', marginTop: '4px' }}>
                  🔒 Your retinal scans and health updates will only be accessible to this attending clinician.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div>
                  <label className="label">Date of Birth</label>
                  <input
                    type="date"
                    className="input"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select
                    className="input"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div>
                  <label className="label">Diabetes Type</label>
                  <select
                    className="input"
                    value={diabetesType}
                    onChange={(e) => setDiabetesType(e.target.value)}
                  >
                    <option value="Type 1">Type 1</option>
                    <option value="Type 2">Type 2</option>
                    <option value="Gestational">Gestational</option>
                  </select>
                </div>
                <div>
                  <label className="label">Duration (Years)</label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    max="60"
                    value={diabetesDurationYears}
                    onChange={(e) => setDiabetesDurationYears(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div>
                  <label className="label">Baseline HbA1c (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input"
                    value={baselineHbA1c}
                    onChange={(e) => setBaselineHbA1c(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={hasHypertension}
                  onChange={(e) => setHasHypertension(e.target.checked)}
                  style={{ accentColor: 'var(--remidio-cyan)' }}
                />
                <span>Diagnosed with Hypertension (High Blood Pressure)</span>
              </label>
            </>
          )}

          <button
            type="submit"
            className={`btn ${portal === 'doctor' ? 'btn-primary' : 'btn-cyan'} btn-lg`}
            disabled={loading}
            style={{ marginTop: 'var(--space-sm)', width: '100%', justifyContent: 'center' }}
          >
            {loading ? 'Authenticating...' : mode === 'login' ? `Sign In to ${portal === 'doctor' ? 'Doctor Workstation' : 'Patient Portal'}` : `Create ${portal === 'doctor' ? 'Doctor' : 'Patient'} Account`}
          </button>
        </form>
      </div>
    </div>
  );
}
