/**
 * pages/AuthPage.jsx
 *
 * Dedicated Multi-Portal Login & Registration Interface for चक्षुस् (Chakshus).
 * Strictly separates:
 *  1. Doctor Portal (Clinical Diagnostic Workstation Access)
 *  2. Patient Portal (Personal Glycemic & Retinal Health Reports)
 *
 * Registration is required before login will succeed.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDoctorsList } from '../services/api';
import EyeSymbol from '../components/common/EyeSymbol';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, isAuthenticated, user, isDoctor, isPatient, isAdmin } = useAuth();

  // Selected portal tab: 'doctor' | 'patient' | 'admin'
  const paramPortal = searchParams.get('portal');
  const initialPortal = paramPortal === 'patient' ? 'patient' : paramPortal === 'admin' ? 'admin' : 'doctor';
  const [portal, setPortal] = useState(initialPortal);

  // Form mode: 'login' | 'register'
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState(initialMode);

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
  const [phone, setPhone] = useState('');
  const [diabetesType, setDiabetesType] = useState('Type 2');
  const [diabetesDurationYears, setDiabetesDurationYears] = useState('5');
  const [baselineHbA1c, setBaselineHbA1c] = useState('7.0');
  const [hasHypertension, setHasHypertension] = useState(false);

  // UI status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch doctors list for patient allotment dropdown
  const loadDoctors = () => {
    getDoctorsList()
      .then((res) => {
        const list = res?.doctors || [];
        setDoctors(list);
        if (list.length > 0) setSelectedDoctorId(list[0]._id);
      })
      .catch((err) => console.warn('Could not load doctors list:', err.message));
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else if (isDoctor) {
        navigate('/doctor', { replace: true });
      } else if (isPatient) {
        navigate(`/patient/${user.patientProfileId || user.id}`, { replace: true });
      }
    }
  }, [isAuthenticated, user, isDoctor, isPatient, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password, portal);
        setSuccessMsg(`Welcome, ${res.user.name}!`);
        if (res.user.role === 'admin') {
          navigate('/admin');
        } else if (res.user.role === 'doctor') {
          navigate('/doctor');
        } else {
          navigate(`/patient/${res.user.patientProfileId || res.user.id}`);
        }
      } else {
        // Register
        if (portal === 'admin') {
          await register({
            name,
            email,
            password,
            role: 'admin',
          });
          setSuccessMsg('Administrator account registered successfully!');
          navigate('/admin');
        } else if (portal === 'doctor') {
          await register({
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
            setErrorMsg('No attending ophthalmologist selected. An attending doctor must register first.');
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

  const isPatientRegisterBlocked = portal === 'patient' && mode === 'register' && doctors.length === 0;

  return (
    <div style={{ maxWidth: '600px', margin: 'var(--space-xl) auto', padding: '0 var(--space-md)' }}>
      {/* ── Brand / Header ───────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(0, 194, 203, 0.25) 0%, #0B192C 100%)',
          border: '1.5px solid rgba(0, 194, 203, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0, 194, 203, 0.25)',
          margin: '0 auto var(--space-md)',
        }}>
          <EyeSymbol size={32} color="var(--remidio-cyan, #00C2CB)" />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--remidio-navy)', letterSpacing: '0.01em', marginBottom: '6px' }}>
          चक्षुस् Portal
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', maxWidth: '440px', margin: '0 auto' }}>
          CHAKSHUS &bull; Tele-Ophthalmic Diagnostics &amp; Retinal Health Platform
        </p>
      </div>

      {/* ── Portal Selector Tabs (Doctor vs Patient vs Admin) ──── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '6px',
        background: '#E2E8F0',
        padding: '5px',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-lg)',
      }}>
        <button
          type="button"
          onClick={() => { setPortal('doctor'); setErrorMsg(''); }}
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: portal === 'doctor' ? '#0B192C' : 'transparent',
            color: portal === 'doctor' ? '#FFFFFF' : '#475569',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            boxShadow: portal === 'doctor' ? '0 2px 8px rgba(11, 25, 44, 0.2)' : 'none',
          }}
        >
          Doctor Portal
        </button>

        <button
          type="button"
          onClick={() => { setPortal('patient'); setErrorMsg(''); loadDoctors(); }}
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: portal === 'patient' ? '#00878E' : 'transparent',
            color: portal === 'patient' ? '#FFFFFF' : '#475569',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            boxShadow: portal === 'patient' ? '0 2px 8px rgba(0, 135, 142, 0.2)' : 'none',
          }}
        >
          Patient Portal
        </button>

        <button
          type="button"
          onClick={() => { setPortal('admin'); setErrorMsg(''); }}
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: portal === 'admin' ? '#D97706' : 'transparent',
            color: portal === 'admin' ? '#FFFFFF' : '#475569',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            boxShadow: portal === 'admin' ? '0 2px 8px rgba(217, 119, 6, 0.25)' : 'none',
          }}
        >
          Admin Portal
        </button>
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
            onClick={() => { setMode('register'); setErrorMsg(''); loadDoctors(); }}
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
            Register Account
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            marginBottom: 'var(--space-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
            {mode === 'login' && errorMsg.includes('Registration must be completed') && (
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMsg(''); loadDoctors(); }}
                className="btn btn-sm"
                style={{
                  alignSelf: 'flex-start',
                  background: '#991B1B',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginTop: '4px',
                }}
              >
                Register New {portal === 'doctor' ? 'Doctor' : 'Patient'} Account &rarr;
              </button>
            )}
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

        {/* ── Notice when Patient attempts to register with 0 doctors in system ── */}
        {isPatientRegisterBlocked && (
          <div style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            color: '#92400E',
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            marginBottom: 'var(--space-md)',
            lineHeight: 1.5,
          }}>
            ⚠️ <strong>No Attending Doctors Registered Yet:</strong> An attending ophthalmologist must register their account first before patients can be allotted and registered.
            <div style={{ marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => { setPortal('doctor'); setMode('register'); setErrorMsg(''); }}
                className="btn btn-outline btn-sm"
                style={{ background: '#FFFFFF', fontSize: '11px', fontWeight: 700 }}
              >
                Switch to Doctor Portal to Register Clinician &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ── Notice for Admin Portal: Code-defined credentials check ── */}
        {portal === 'admin' && (
          <div style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            color: '#92400E',
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            marginBottom: 'var(--space-md)',
            lineHeight: 1.5,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                🛡️ <strong>System Administrator Verification:</strong> Access to the Admin Console is checked against the authorized details defined in the system code (<code>admin@chakshus.org</code>). Any entered details must match the code specifications.
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@chakshus.org');
                  setPassword('Admin@Chakshus2026');
                  if (mode === 'register') setName('Chakshus System Administrator');
                }}
                className="btn btn-sm"
                style={{
                  background: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '5px 10px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
              >
                Autofill Authorized Admin Credentials
              </button>
            </div>
          </div>
        )}

        {/* ── Auth Form ────────────────────────────────── */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="label">Full Legal Name *</label>
              <input
                type="text"
                className="input"
                required
                placeholder={portal === 'doctor' ? 'Dr. Full Name' : portal === 'admin' ? 'Administrator Name' : 'Patient Full Name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="label">Email Address *</label>
            <input
              type="email"
              className="input"
              required
              placeholder={portal === 'doctor' ? 'doctor@hospital.org' : portal === 'admin' ? 'admin@chakshus.org' : 'patient@domain.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
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
              <div className="form-group">
                <label className="label">Clinical Specialization</label>
                <input
                  type="text"
                  className="input"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                />
              </div>
              <div className="form-group">
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

          {/* Patient Extra Fields on Register */}
          {mode === 'register' && portal === 'patient' && (
            <>
              <div className="form-group">
                <label className="label" style={{ color: 'var(--remidio-cyan-hover)', fontWeight: 700 }}>
                  Select Attending Ophthalmologist *
                </label>
                <select
                  className="input select"
                  required
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  disabled={doctors.length === 0}
                  style={{ fontWeight: 600 }}
                >
                  {doctors.length === 0 ? (
                    <option value="">No registered doctors found in the system</option>
                  ) : (
                    doctors.map((doc) => (
                      <option key={doc._id} value={doc._id}>
                        {doc.name} — {doc.specialization || 'Ophthalmologist'} ({doc.hospitalOrClinic || 'Clinic'})
                      </option>
                    ))
                  )}
                </select>
                <span className="text-xs text-muted" style={{ display: 'block', marginTop: '6px' }}>
                  🔒 Your retinal scans and telemetry will strictly be allotted only to this attending clinician.
                </span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="label">Date of Birth</label>
                  <input
                    type="date"
                    className="input"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Gender</label>
                  <select
                    className="input select"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="label">Diabetes Type</label>
                  <select
                    className="input select"
                    value={diabetesType}
                    onChange={(e) => setDiabetesType(e.target.value)}
                  >
                    <option value="Type 1">Type 1</option>
                    <option value="Type 2">Type 2</option>
                    <option value="Gestational">Gestational</option>
                  </select>
                </div>
                <div className="form-group">
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

              <div className="form-row">
                <div className="form-group">
                  <label className="label">Baseline HbA1c (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input"
                    value={baselineHbA1c}
                    onChange={(e) => setBaselineHbA1c(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Phone Number</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="+91"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={hasHypertension}
                    onChange={(e) => setHasHypertension(e.target.checked)}
                  />
                  <span>Diagnosed with Hypertension (High Blood Pressure)</span>
                </label>
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-lg"
            disabled={loading || isPatientRegisterBlocked}
            style={{
              marginTop: 'var(--space-sm)',
              width: '100%',
              justifyContent: 'center',
              background: portal === 'admin' ? '#D97706' : portal === 'doctor' ? 'var(--remidio-navy)' : 'var(--remidio-cyan)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
            }}
          >
            {loading ? 'Authenticating...' : mode === 'login' ? `Sign In to ${portal === 'doctor' ? 'Doctor Portal' : portal === 'admin' ? 'Admin Console' : 'Patient Portal'}` : `Create ${portal === 'doctor' ? 'Doctor' : portal === 'admin' ? 'Administrator' : 'Patient'} Account`}
          </button>
        </form>

        {/* ── Mode Switch Helper Link ──────────────────── */}
        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {mode === 'login' ? (
            <span>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMsg(''); loadDoctors(); }}
                style={{ background: 'none', border: 'none', color: 'var(--remidio-cyan-hover)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Register your {portal === 'doctor' ? 'Doctor' : portal === 'admin' ? 'Administrator' : 'Patient'} account first &rarr;
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--remidio-cyan-hover)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Sign In to your account &rarr;
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
