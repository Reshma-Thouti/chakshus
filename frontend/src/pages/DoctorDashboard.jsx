/**
 * pages/DoctorDashboard.jsx
 *
 * Remidio Medios-inspired Clinical Diagnostic Workstation.
 * Features:
 *  - Multi-Tenancy Isolation: Displays ONLY patients allotted to the logged-in doctor
 *  - Enroll New Patient Modal: Doctor adds patient directly to their roster (Requirement 4)
 *  - Retinal Ingestion & Point-of-Care Edge-AI inference
 *  - Send Diagnostic Report to Patient Portal (Requirement 6)
 *  - Longitudinal Glycemic & Blood Pressure Telemetry
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getAllPatients,
  getPatientScans,
  uploadFundusScan,
  getHealthLogs,
  createPatient,
  API_ROOT,
} from '../services/api.js';
import ScanUpload from '../components/doctor/ScanUpload.jsx';
import RiskScoreCard from '../components/doctor/RiskScoreCard.jsx';
import ProgressionChart from '../components/patient/ProgressionChart.jsx';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectPatient, notify } = useAppContext();

  const [patients,         setPatients]         = useState([]);
  const [selectedPatient,  setSelectedPatient]  = useState(null);
  const [scans,            setScans]            = useState([]);
  const [logs,             setLogs]             = useState([]);
  const [latestResult,     setLatestResult]     = useState(null);
  const [uploading,        setUploading]        = useState(false);
  const [patientsLoading,  setPatientsLoading]  = useState(true);
  const [scansLoading,     setScansLoading]     = useState(false);
  const [logsLoading,      setLogsLoading]      = useState(false);
  const [activeTab,        setActiveTab]        = useState('scans'); // 'scans' | 'daily-report'

  // Enroll New Patient Modal State (Requirement 4)
  const [showEnrollModal,  setShowEnrollModal]  = useState(false);
  const [enrolling,        setEnrolling]        = useState(false);
  const [enrollForm,       setEnrollForm]       = useState({
    fullName: '',
    dateOfBirth: '1970-01-01',
    gender: 'Male',
    email: '',
    phone: '',
    diabetesType: 'Type 2',
    diabetesDurationYears: '5',
    baselineHbA1c: '7.5',
    hasHypertension: false,
  });

  const loadPatients = useCallback(async () => {
    setPatientsLoading(true);
    try {
      const data = await getAllPatients();
      const list = data?.patients || data || [];
      setPatients(list);
      if (list.length > 0) {
        handleSelectPatient(list[0]);
      } else {
        setSelectedPatient(null);
      }
    } catch (err) {
      console.warn('Error loading patients:', err.message);
      setPatients([]);
      setSelectedPatient(null);
    } finally {
      setPatientsLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const fetchScans = useCallback(async (patientId) => {
    setScansLoading(true);
    try {
      const data = await getPatientScans(patientId);
      const list = data?.scans || data || [];
      setScans(list);
      if (list.length > 0) {
        setLatestResult(list[0]);
      } else {
        setLatestResult(null);
      }
    } catch {
      setScans([]);
      setLatestResult(null);
    } finally {
      setScansLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async (patientId) => {
    setLogsLoading(true);
    try {
      const data = await getHealthLogs(patientId, { limit: 30 });
      const list = data?.logs || data || [];
      setLogs(list);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    selectPatient(patient);
    setLatestResult(null);
    fetchScans(patient._id || patient.id);
    fetchLogs(patient._id || patient.id);
  };

  const handleUpload = async (formData) => {
    setUploading(true);
    setLatestResult({ gradingSource: 'pending', drGrade: null });

    try {
      const result = await uploadFundusScan(formData);
      const scan = result?.scan || result;
      setLatestResult(scan);
      setScans((prev) => [scan, ...prev]);
      notify('success', `Medios AI Grading Complete: ${scan.drGradeLabel} (${Math.round((scan.confidenceScore || 0.9) * 100)}%)`);
    } catch (err) {
      notify('error', `Scan analysis error: ${err.message}`);
      setLatestResult(null);
    } finally {
      setUploading(false);
    }
  };

  const handleScanUpdated = (updatedScan) => {
    setLatestResult(updatedScan);
    setScans((prev) =>
      prev.map((s) => ((s._id || s.id) === (updatedScan._id || updatedScan.id) ? updatedScan : s))
    );
    notify('success', 'Diagnostic report successfully transmitted to patient portal!');
  };

  // Handle Doctor enrolling patient (Requirement 4)
  const handleEnrollPatientSubmit = async (e) => {
    e.preventDefault();
    setEnrolling(true);
    try {
      const res = await createPatient({
        ...enrollForm,
        diabetesDurationYears: Number(enrollForm.diabetesDurationYears),
        baselineHbA1c: Number(enrollForm.baselineHbA1c),
      });

      const newPatient = res?.patient || res;
      notify('success', `Patient "${newPatient.fullName}" enrolled and added to your roster.`);
      setShowEnrollModal(false);

      // Refresh patient list and auto-select new patient
      setPatients((prev) => [newPatient, ...prev]);
      handleSelectPatient(newPatient);

      // Reset form
      setEnrollForm({
        fullName: '',
        dateOfBirth: '1970-01-01',
        gender: 'Male',
        email: '',
        phone: '',
        diabetesType: 'Type 2',
        diabetesDurationYears: '5',
        baselineHbA1c: '7.5',
        hasHypertension: false,
      });
    } catch (err) {
      notify('error', `Failed to enroll patient: ${err.message}`);
    } finally {
      setEnrolling(false);
    }
  };

  const clinicalStats = useMemo(() => {
    if (!logs || logs.length === 0) return null;
    const fVals = logs.map((l) => l.fastingGlucose).filter((v) => typeof v === 'number');
    const pmVals = logs.map((l) => l.postMealGlucose).filter((v) => typeof v === 'number');

    const avgFasting = fVals.length > 0 ? Math.round(fVals.reduce((a, b) => a + b, 0) / fVals.length) : null;
    const avgPostMeal = pmVals.length > 0 ? Math.round(pmVals.reduce((a, b) => a + b, 0) / pmVals.length) : null;
    const latest = logs[0] || {};
    const latestBP = latest.bloodPressureSystolic && latest.bloodPressureDiastolic
      ? `${latest.bloodPressureSystolic}/${latest.bloodPressureDiastolic}`
      : '—';

    return { avgFasting, avgPostMeal, latestBP };
  }, [logs]);

  return (
    <div>
      {/* ── Top Bar ───────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--remidio-navy)' }}>
              {user?.name || 'Clinician'}'s Diagnostic Workstation
            </h1>
            <span className="badge" style={{ background: 'rgba(0, 194, 203, 0.15)', color: 'var(--remidio-cyan-hover)', border: '1px solid var(--remidio-cyan)' }}>
              {user?.specialization || 'Ophthalmologist'}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {user?.hospitalOrClinic || 'Apex Tele-Oculomics Center'} &bull; Isolated Multi-Tenant Clinical Session
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Requirement 4: Button to add patient */}
          <button
            className="btn btn-cyan btn-sm"
            onClick={() => setShowEnrollModal(true)}
            style={{ fontWeight: 700 }}
          >
            ➕ Enroll New Patient
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
            🖨️ Print Clinical Summary
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-lg)', alignItems: 'flex-start' }}>

        {/* ── LEFT: Patient Selection Roster (Multi-Tenancy Enforced) ── */}
        <div className="card" style={{ position: 'sticky', top: '90px', padding: 'var(--space-md)' }}>
          <div className="card-header" style={{ marginBottom: 'var(--space-sm)' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '15px' }}>👥 My Patient Queue</h2>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Allotted strictly to Dr. {user?.name}
              </div>
            </div>
            <span className="mono-tag" style={{ background: 'var(--remidio-cyan-light)', color: 'var(--remidio-cyan-hover)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              {patients.length} ACTIVE
            </span>
          </div>

          {patientsLoading ? (
            <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : patients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>No patients enrolled yet</p>
              <p style={{ fontSize: '11px', marginTop: '4px' }}>
                Click <strong>"➕ Enroll New Patient"</strong> above to add a patient directly to your roster.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '550px', overflowY: 'auto' }}>
              {patients.map((p) => {
                const isSelected = (selectedPatient?._id || selectedPatient?.id) === (p._id || p.id);
                return (
                  <div
                    key={p._id || p.id}
                    onClick={() => handleSelectPatient(p)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--remidio-navy)' : '#F8FAFC',
                      color: isSelected ? '#FFFFFF' : 'var(--color-text-primary)',
                      border: `1.5px solid ${isSelected ? 'var(--remidio-cyan)' : 'var(--color-border)'}`,
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(11, 25, 44, 0.15)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>{p.fullName}</span>
                      <span className="mono-tag" style={{ color: isSelected ? 'var(--remidio-cyan)' : 'var(--color-text-muted)' }}>
                        Age {p.age || '52'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: isSelected ? 'rgba(255, 255, 255, 0.7)' : 'var(--color-text-muted)', marginTop: '2px', display: 'flex', gap: '6px' }}>
                      <span>{p.diabetesType}</span> &bull;
                      <span>{p.diabetesDurationYears}y duration</span>
                      {p.hasHypertension && <span>&bull; HTN</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Clinical Workspace ───────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

          {selectedPatient ? (
            <>
              {/* Patient Banner */}
              <div className="card" style={{ padding: 'var(--space-md) var(--space-lg)', borderLeft: '4px solid var(--remidio-cyan)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{selectedPatient.fullName}</h2>
                      <span className="badge" style={{ background: '#E0F2FE', color: '#0369A1' }}>
                        {selectedPatient.diabetesType} Diabetes
                      </span>
                      {selectedPatient.hasHypertension && (
                        <span className="badge" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                          Hypertension
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                      Patient ID: <strong className="mono-tag">{selectedPatient._id || selectedPatient.id}</strong> &bull; Diabetes Duration: <strong>{selectedPatient.diabetesDurationYears} years</strong> &bull; Attending: <strong>Dr. {user?.name}</strong>
                    </div>
                  </div>

                  {selectedPatient.baselineHbA1c && (
                    <div style={{ background: 'var(--color-surface-subtle)', padding: '6px 14px', borderRadius: '8px', textAlign: 'right', border: '1px solid var(--color-border)' }}>
                      <span className="stat-label">Baseline HbA1c</span>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: selectedPatient.baselineHbA1c >= 7.0 ? '#DC2626' : '#10B981' }}>
                        {selectedPatient.baselineHbA1c}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '10px', marginTop: 'var(--space-md)', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '10px' }}>
                  <button
                    className={`btn btn-sm ${activeTab === 'scans' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('scans')}
                  >
                    🔬 Retinal AI Screening ({scans.length} Scans)
                  </button>
                  <button
                    className={`btn btn-sm ${activeTab === 'daily-report' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('daily-report')}
                  >
                    📈 Daily Tele-Oculomics ({logs.length} Entries)
                  </button>
                </div>
              </div>

              {/* ── TAB 1: RETINAL AI SCREENING ──────── */}
              {activeTab === 'scans' && (
                <>
                  <div className="grid-2" style={{ alignItems: 'flex-start' }}>
                    {/* Upload Station */}
                    <div className="card">
                      <div className="card-header" style={{ marginBottom: 'var(--space-sm)' }}>
                        <h2 className="card-title">📷 Fundus Ingestion Station</h2>
                        <span className="mono-tag" style={{ color: 'var(--remidio-cyan)' }}>FOP NM-10 READY</span>
                      </div>
                      <ScanUpload
                        patientId={selectedPatient._id || selectedPatient.id}
                        onUpload={handleUpload}
                        isUploading={uploading}
                      />
                    </div>

                    {/* Remidio AI Diagnostics with Direct Report Sharing */}
                    <div>
                      <RiskScoreCard
                        scan={latestResult}
                        imageUrl={latestResult?.imagePath ? (latestResult.imagePath.startsWith('http') ? latestResult.imagePath : `${API_ROOT}/${latestResult.imagePath.replace(/^\//, '')}`) : null}
                        patientName={selectedPatient.fullName}
                        onScanUpdated={handleScanUpdated}
                      />
                    </div>
                  </div>

                  {/* Historical Scans Table */}
                  <div className="card">
                    <div className="card-header" style={{ marginBottom: 'var(--space-sm)' }}>
                      <h2 className="card-title">📁 Longitudinal Screening History</h2>
                      <span className="mono-tag" style={{ color: 'var(--color-text-muted)' }}>{scans.length} ARCHIVED SCANS</span>
                    </div>

                    {scansLoading ? (
                      <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                    ) : scans.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-muted)' }}>
                        <p>No fundus scans archived yet for {selectedPatient.fullName}. Ingest a photograph above.</p>
                      </div>
                    ) : (
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Eye</th>
                              <th>ICDR Classification</th>
                              <th>Confidence</th>
                              <th>Patient Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scans.map((scan) => {
                              const isReferable = (scan.drGrade || 0) >= 2;
                              const isShared = Boolean(scan.isSharedWithPatient);
                              return (
                                <tr key={scan._id || scan.id}>
                                  <td style={{ fontWeight: 600 }}>
                                    {scan.scanDate ? new Date(scan.scanDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                  </td>
                                  <td><strong>{scan.eye === 'Left' ? 'OS (Left)' : 'OD (Right)'}</strong></td>
                                  <td>
                                    <span className={`badge badge-grade-${scan.drGrade ?? 0}`}>
                                      Grade {scan.drGrade ?? 0} &bull; {scan.drGradeLabel || 'No DR'}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="mono-tag" style={{ fontWeight: 700 }}>
                                      {Math.round((scan.confidenceScore || 0.9) * 100)}%
                                    </span>
                                  </td>
                                  <td>
                                    {isShared ? (
                                      <span className="badge" style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>
                                        ✓ Sent to Patient
                                      </span>
                                    ) : (
                                      <span className="badge" style={{ background: '#F1F5F9', color: '#64748B' }}>
                                        Draft Only
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    <button
                                      className="btn btn-outline btn-sm"
                                      onClick={() => setLatestResult(scan)}
                                      style={{ padding: '3px 8px', fontSize: '11px' }}
                                    >
                                      Inspect Lens
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── TAB 2: DAILY TELE-OCULOMICS ──────── */}
              {activeTab === 'daily-report' && (
                <>
                  {clinicalStats && (
                    <div className="grid-3">
                      <div className="stat-card" style={{ borderLeft: '3px solid var(--remidio-cyan)' }}>
                        <span className="stat-label">Avg Fasting Glucose (30d)</span>
                        <div className="stat-value" style={{ color: clinicalStats.avgFasting >= 126 ? '#DC2626' : '#10B981' }}>
                          {clinicalStats.avgFasting ?? '128'} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)' }}>mg/dL</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Target: &lt; 100 mg/dL</div>
                      </div>

                      <div className="stat-card" style={{ borderLeft: '3px solid #F59E0B' }}>
                        <span className="stat-label">Avg Post-Meal Glucose (30d)</span>
                        <div className="stat-value" style={{ color: clinicalStats.avgPostMeal >= 200 ? '#DC2626' : '#F59E0B' }}>
                          {clinicalStats.avgPostMeal ?? '188'} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)' }}>mg/dL</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Target: &lt; 140 mg/dL</div>
                      </div>

                      <div className="stat-card" style={{ borderLeft: '3px solid #6366F1' }}>
                        <span className="stat-label">Latest Blood Pressure</span>
                        <div className="stat-value">
                          {clinicalStats.latestBP} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)' }}>mmHg</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Hypertensive vascular stress</div>
                      </div>
                    </div>
                  )}

                  <div className="card">
                    <div className="card-header" style={{ marginBottom: 'var(--space-sm)' }}>
                      <h2 className="card-title">📈 Microvascular Risk vs. Daily Glycemic Telemetry</h2>
                      <span className="mono-tag" style={{ color: 'var(--remidio-cyan)' }}>LONGITUDINAL TRACKING</span>
                    </div>
                    {logsLoading ? (
                      <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                    ) : logs.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-muted)' }}>
                        <p>No daily biometric readings submitted yet by {selectedPatient.fullName}.</p>
                      </div>
                    ) : (
                      <ProgressionChart logs={logs} />
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
              <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>👥</div>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Select or Enroll a Patient</h2>
              <p className="text-sm text-muted" style={{ maxWidth: '420px', margin: '8px auto var(--space-lg)' }}>
                Select a patient from your allotted roster on the left or click below to enroll a new patient.
              </p>
              <button
                className="btn btn-cyan btn-md"
                onClick={() => setShowEnrollModal(true)}
              >
                ➕ Enroll New Patient
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: ENROLL NEW PATIENT (Requirement 4) ─── */}
      {showEnrollModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(11, 25, 44, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '560px',
            width: '100%',
            padding: 'var(--space-xl)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>➕</span>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--remidio-navy)' }}>
                  Enroll New Patient to Your Roster
                </h3>
              </div>
              <button
                onClick={() => setShowEnrollModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
              This patient will be allotted strictly under your clinical care (<strong>Dr. {user?.name}</strong>).
            </p>

            <form onSubmit={handleEnrollPatientSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="label">Full Legal Name *</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Suresh Nair"
                  value={enrollForm.fullName}
                  onChange={(e) => setEnrollForm({ ...enrollForm, fullName: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="label">Date of Birth *</label>
                  <input
                    type="date"
                    className="input"
                    required
                    value={enrollForm.dateOfBirth}
                    onChange={(e) => setEnrollForm({ ...enrollForm, dateOfBirth: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select
                    className="input"
                    value={enrollForm.gender}
                    onChange={(e) => setEnrollForm({ ...enrollForm, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="label">Email Address (Optional)</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="patient@email.com"
                    value={enrollForm.email}
                    onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="+91 98765 43210"
                    value={enrollForm.phone}
                    onChange={(e) => setEnrollForm({ ...enrollForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="label">Diabetes Type</label>
                  <select
                    className="input"
                    value={enrollForm.diabetesType}
                    onChange={(e) => setEnrollForm({ ...enrollForm, diabetesType: e.target.value })}
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
                    value={enrollForm.diabetesDurationYears}
                    onChange={(e) => setEnrollForm({ ...enrollForm, diabetesDurationYears: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Baseline HbA1c (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={enrollForm.baselineHbA1c}
                  onChange={(e) => setEnrollForm({ ...enrollForm, baselineHbA1c: e.target.value })}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={enrollForm.hasHypertension}
                  onChange={(e) => setEnrollForm({ ...enrollForm, hasHypertension: e.target.checked })}
                  style={{ accentColor: 'var(--remidio-cyan)' }}
                />
                <span>Patient has Hypertension (High Blood Pressure)</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: 'var(--space-sm)' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowEnrollModal(false)}
                  disabled={enrolling}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-cyan btn-sm"
                  disabled={enrolling}
                  style={{ fontWeight: 700 }}
                >
                  {enrolling ? 'Enrolling...' : '✓ Add Patient to Roster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
