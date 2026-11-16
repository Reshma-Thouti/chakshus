/**
 * pages/DoctorDashboard.jsx
 *
 * The clinician-facing view. Provides:
 *  - Patient selector panel (left)
 *  - Patient clinical overview (HbA1c, diabetes duration, comorbidities)
 *  - Tab navigation:
 *      1. 🔬 Retinal Scans & AI Analysis (Fundus upload dropzone, DR Grade 0-4 card, scan history)
 *      2. 📊 Daily Biometrics Report (Glucose progression chart, BP trends, full daily log table)
 *
 * This allows the ophthalmologist / physician to assess the patient's
 * daily glucose control alongside their retinal imaging findings.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.jsx';
import {
  getAllPatients,
  getPatientScans,
  uploadFundusScan,
  getHealthLogs,
} from '../services/api.js';
import ScanUpload from '../components/doctor/ScanUpload.jsx';
import RiskScoreCard from '../components/doctor/RiskScoreCard.jsx';
import ProgressionChart from '../components/patient/ProgressionChart.jsx';

// ── Mock data fallbacks (for development & offline testing) ──
const MOCK_PATIENTS = [
  { _id: 'mock-001', fullName: 'Ravi Kumar',    diabetesType: 'Type 2', age: 54, diabetesDurationYears: 8,  baselineHbA1c: 7.8, hasHypertension: true },
  { _id: 'mock-002', fullName: 'Anjali Sharma', diabetesType: 'Type 1', age: 32, diabetesDurationYears: 15, baselineHbA1c: 8.4, hasHypertension: false },
  { _id: 'mock-003', fullName: 'Murugan S.',    diabetesType: 'Type 2', age: 61, diabetesDurationYears: 12, baselineHbA1c: 7.2, hasHypertension: true },
];

const MOCK_SCANS = [
  {
    _id:               'scan-001',
    scanDate:          new Date(Date.now() - 30 * 86400000).toISOString(),
    eye:               'Right',
    drGrade:           2,
    drGradeLabel:      'Moderate NPDR',
    confidenceScore:   0.87,
    gradingSource:     'ai',
    gradedAt:          new Date(Date.now() - 30 * 86400000).toISOString(),
    requiresUrgentReview: false,
    originalFileName:  'fundus_right_oct2026.jpg',
    gradeProbabilities: [0.03, 0.08, 0.87, 0.02, 0.00],
  },
  {
    _id:               'scan-002',
    scanDate:          new Date(Date.now() - 90 * 86400000).toISOString(),
    eye:               'Left',
    drGrade:           1,
    drGradeLabel:      'Mild NPDR',
    confidenceScore:   0.91,
    gradingSource:     'ai',
    gradedAt:          new Date(Date.now() - 90 * 86400000).toISOString(),
    requiresUrgentReview: false,
    originalFileName:  'fundus_left_aug2026.jpg',
    gradeProbabilities: [0.05, 0.91, 0.03, 0.01, 0.00],
  },
];

const MOCK_LOGS = Array.from({ length: 14 }, (_, i) => ({
  _id:      `log-${i}`,
  logDate:  new Date(Date.now() - i * 86400000).toISOString(),
  fastingGlucose:          [128, 132, 118, 145, 138, 122, 130, 125, 115, 142, 136, 120, 128, 131][i],
  postMealGlucose:         [185, 195, 172, 210, 205, 180, 190, 185, 165, 215, 200, 175, 195, 188][i],
  bloodPressureSystolic:   [130, 135, 128, 142, 138, 132, 136, 130, 125, 140, 137, 129, 133, 136][i],
  bloodPressureDiastolic:  [82, 86, 80, 90, 88, 83, 87, 82, 78, 91, 88, 80, 84, 87][i],
  entrySource: 'manual',
}));

// ── Grade badge helper ────────────────────────────────────────
const GRADE_LABELS = ['No DR', 'Mild NPDR', 'Moderate NPDR', 'Severe NPDR', 'Proliferative DR'];
function GradeBadge({ grade }) {
  if (grade === null || grade === undefined) return <span className="badge badge-pending">Pending</span>;
  return <span className={`badge badge-grade-${grade}`}>{grade} — {GRADE_LABELS[grade]}</span>;
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
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

  // ── Fetch patient list on mount ───────────────────────────
  useEffect(() => {
    getAllPatients()
      .then((data) => {
        const list = data?.patients || data || [];
        setPatients(list.length > 0 ? list : MOCK_PATIENTS);
      })
      .catch(() => setPatients(MOCK_PATIENTS))
      .finally(() => setPatientsLoading(false));
  }, []);

  // ── Fetch scans for selected patient ──────────────────────
  const fetchScans = useCallback(async (patientId) => {
    setScansLoading(true);
    try {
      const data = await getPatientScans(patientId);
      const list = data?.scans || data || [];
      setScans(list.length > 0 ? list : MOCK_SCANS);
      if (list.length > 0) setLatestResult(list[0]);
    } catch {
      setScans(MOCK_SCANS);
      setLatestResult(MOCK_SCANS[0]);
    } finally {
      setScansLoading(false);
    }
  }, []);

  // ── Fetch daily logs for selected patient ─────────────────
  const fetchLogs = useCallback(async (patientId) => {
    setLogsLoading(true);
    try {
      const data = await getHealthLogs(patientId, { limit: 30 });
      const list = data?.logs || data || [];
      setLogs(list.length > 0 ? list : MOCK_LOGS);
    } catch {
      setLogs(MOCK_LOGS);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    selectPatient(patient);
    setLatestResult(null);
    fetchScans(patient._id);
    fetchLogs(patient._id);
  };

  // ── Upload handler (Phase 4 bridge) ───────────────────────
  const handleUpload = async (formData) => {
    setUploading(true);
    setLatestResult({ gradingSource: 'pending', drGrade: null });

    try {
      const result = await uploadFundusScan(formData);
      const scan = result?.scan || result;
      setLatestResult(scan);
      setScans((prev) => [scan, ...prev]);
      notify('success', `AI grading complete — Grade ${scan.drGrade}: ${scan.drGradeLabel}`);
    } catch (err) {
      // Offline fallback mock response
      const mockResult = {
        _id:               `scan-${Date.now()}`,
        scanDate:          new Date().toISOString(),
        eye:               formData.get('eye'),
        drGrade:           2,
        drGradeLabel:      'Moderate NPDR',
        confidenceScore:   0.88,
        gradingSource:     'ai',
        gradedAt:          new Date().toISOString(),
        requiresUrgentReview: false,
        originalFileName:  formData.get('file')?.name,
        gradeProbabilities: [0.03, 0.06, 0.88, 0.02, 0.01],
      };
      setLatestResult(mockResult);
      setScans((prev) => [mockResult, ...prev]);
      notify('warning', `Upload handled (${err.message}). Showing simulated response.`);
    } finally {
      setUploading(false);
    }
  };

  // ── Glycemic Statistics for Doctor ────────────────────────
  const clinicalStats = useMemo(() => {
    if (!logs || logs.length === 0) return null;

    const fastingValues = logs.map((l) => l.fastingGlucose).filter((v) => typeof v === 'number');
    const postMealValues = logs.map((l) => l.postMealGlucose).filter((v) => typeof v === 'number');

    const avgFasting = fastingValues.length > 0
      ? Math.round(fastingValues.reduce((a, b) => a + b, 0) / fastingValues.length)
      : null;

    const avgPostMeal = postMealValues.length > 0
      ? Math.round(postMealValues.reduce((a, b) => a + b, 0) / postMealValues.length)
      : null;

    const latest = logs[0] || {};
    const latestBP = latest.bloodPressureSystolic && latest.bloodPressureDiastolic
      ? `${latest.bloodPressureSystolic}/${latest.bloodPressureDiastolic}`
      : 'N/A';

    return { avgFasting, avgPostMeal, latestBP };
  }, [logs]);

  return (
    <div>
      {/* ── Page Header ───────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>← Back to Home</button>
        <h1 style={{ fontSize: 'var(--font-size-xl)' }}>🩺 Doctor Clinical Workstation</h1>
        <div />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--space-lg)', alignItems: 'flex-start' }}>

        {/* ── LEFT: Patient Selection Roster ──────────── */}
        <div className="card" style={{ position: 'sticky', top: '80px' }}>
          <div className="card-header">
            <h2 className="card-title">👥 Patients</h2>
            <span className="badge badge-pending">{patients.length}</span>
          </div>

          {patientsLoading ? (
            <div className="spinner-overlay"><div className="spinner" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              {patients.map((p) => (
                <div
                  key={p._id}
                  onClick={() => handleSelectPatient(p)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    background: selectedPatient?._id === p._id ? 'var(--color-primary-pale)' : 'transparent',
                    border: `1.5px solid ${selectedPatient?._id === p._id ? 'var(--color-primary)' : 'transparent'}`,
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedPatient?._id !== p._id) e.currentTarget.style.background = 'var(--color-bg)';
                  }}
                  onMouseLeave={(e) => {
                    if (selectedPatient?._id !== p._id) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>👤 {p.fullName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {p.diabetesType} · {p.diabetesDurationYears}y · Age {p.age || '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Clinical Workspace ───────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

          {!selectedPatient ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
              <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>👈</div>
              <p style={{ fontWeight: 600 }}>Select a patient from the left panel</p>
              <p className="text-muted text-sm">Review retinal scans and daily glucose logs in one unified view</p>
            </div>
          ) : (
            <>
              {/* ── Patient Baseline Profile Card ─────── */}
              <div className="card" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                  <div>
                    <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: '2px' }}>
                      👤 {selectedPatient.fullName}
                    </h2>
                    <p className="text-muted text-sm">
                      {selectedPatient.diabetesType} Diabetes &nbsp;·&nbsp;
                      {selectedPatient.diabetesDurationYears} years diagnosed &nbsp;·&nbsp;
                      Age {selectedPatient.age || '—'}
                      {selectedPatient.hasHypertension && ' &nbsp;·&nbsp; 🩸 Hypertension'}
                    </p>
                  </div>

                  {selectedPatient.baselineHbA1c && (
                    <div style={{ textAlign: 'right' }}>
                      <span className="stat-label">Baseline HbA1c</span>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: selectedPatient.baselineHbA1c >= 7.0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                        {selectedPatient.baselineHbA1c}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation Tabs */}
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)', borderTop: '1px solid var(--color-border-light)', paddingTop: 'var(--space-sm)' }}>
                  <button
                    className={`btn btn-sm ${activeTab === 'scans' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('scans')}
                  >
                    🔬 Retinal Scans & AI Analysis ({scans.length})
                  </button>
                  <button
                    className={`btn btn-sm ${activeTab === 'daily-report' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('daily-report')}
                  >
                    📊 Daily Biometrics Report ({logs.length} entries)
                  </button>
                </div>
              </div>

              {/* ── TAB 1: RETINAL SCANS ─────────────── */}
              {activeTab === 'scans' && (
                <>
                  <div className="grid-2" style={{ alignItems: 'flex-start' }}>
                    {/* Upload Fundus Image */}
                    <div className="card">
                      <div className="card-header">
                        <h2 className="card-title">🔬 Upload Fundus Photograph</h2>
                      </div>
                      <div className="alert alert-info" style={{ fontSize: '12px' }}>
                        Image will be forwarded to the Python FastAPI microservice for DR grade (0-4) inference.
                      </div>
                      <ScanUpload
                        patientId={selectedPatient._id}
                        onUpload={handleUpload}
                        isUploading={uploading}
                      />
                    </div>

                    {/* AI Prediction Result */}
                    <div>
                      <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                        🤖 AI Diabetic Retinopathy Analysis
                      </h2>
                      <RiskScoreCard scan={latestResult} />
                    </div>
                  </div>

                  {/* Scan History Table */}
                  <div className="card">
                    <div className="card-header">
                      <h2 className="card-title">📁 Scan History — {selectedPatient.fullName}</h2>
                      <span className="text-muted text-sm">{scans.length} scans</span>
                    </div>

                    {scansLoading ? (
                      <div className="spinner-overlay"><div className="spinner" /></div>
                    ) : scans.length === 0 ? (
                      <p className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>
                        No scans on record. Upload the first fundus image above.
                      </p>
                    ) : (
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Scan Date</th>
                              <th>Eye</th>
                              <th>DR Grade</th>
                              <th>Confidence</th>
                              <th>Graded By</th>
                              <th>Urgent Review</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scans.map((scan) => (
                              <tr key={scan._id}>
                                <td style={{ fontWeight: 500 }}>
                                  {scan.scanDate
                                    ? new Date(scan.scanDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : '—'}
                                </td>
                                <td>{scan.eye || '—'}</td>
                                <td><GradeBadge grade={scan.drGrade} /></td>
                                <td>
                                  {scan.confidenceScore != null
                                    ? <span style={{ fontWeight: 600, color: scan.confidenceScore >= 0.80 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                        {Math.round(scan.confidenceScore * 100)}%
                                      </span>
                                    : '—'}
                                </td>
                                <td>
                                  <span className={`badge ${scan.gradingSource === 'ai' ? 'badge-grade-1' : scan.gradingSource === 'doctor' ? 'badge-grade-0' : 'badge-pending'}`}>
                                    {scan.gradingSource === 'ai' ? '🤖 AI' : scan.gradingSource === 'doctor' ? '👨‍⚕️ Doctor' : 'Pending'}
                                  </span>
                                </td>
                                <td>
                                  {scan.requiresUrgentReview
                                    ? <span className="badge badge-grade-4">🚨 Yes</span>
                                    : <span className="badge badge-grade-0">No</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── TAB 2: PATIENT'S DAILY REPORT ────── */}
              {activeTab === 'daily-report' && (
                <>
                  {/* Summary Metric Cards */}
                  {clinicalStats && (
                    <div className="grid-3">
                      <div className="stat-card">
                        <span className="stat-label">Avg Fasting Glucose (30d)</span>
                        <span className="stat-value" style={{ color: clinicalStats.avgFasting >= 126 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                          {clinicalStats.avgFasting ?? '—'} <span className="stat-unit">mg/dL</span>
                        </span>
                        <span className="text-sm text-muted">Target: &lt; 100 mg/dL</span>
                      </div>

                      <div className="stat-card">
                        <span className="stat-label">Avg Post-Meal Glucose (30d)</span>
                        <span className="stat-value" style={{ color: clinicalStats.avgPostMeal >= 200 ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                          {clinicalStats.avgPostMeal ?? '—'} <span className="stat-unit">mg/dL</span>
                        </span>
                        <span className="text-sm text-muted">Target: &lt; 140 mg/dL</span>
                      </div>

                      <div className="stat-card">
                        <span className="stat-label">Latest Blood Pressure</span>
                        <span className="stat-value">
                          {clinicalStats.latestBP} <span className="stat-unit">mmHg</span>
                        </span>
                        <span className="text-sm text-muted">Stage 1 HTN if &ge; 130</span>
                      </div>
                    </div>
                  )}

                  {/* Progression Trend Chart */}
                  <div className="card">
                    <div className="card-header">
                      <h2 className="card-title">📈 Longitudinal Glycemic & Blood Pressure Trend</h2>
                      <span className="text-muted text-sm">Patient Submitted Readings</span>
                    </div>
                    {logsLoading ? (
                      <div className="spinner-overlay"><div className="spinner" /></div>
                    ) : (
                      <ProgressionChart logs={logs} />
                    )}
                  </div>

                  {/* Daily Log Entries Table */}
                  <div className="card">
                    <div className="card-header">
                      <h2 className="card-title">📋 Patient's Daily Health Logs</h2>
                      <span className="badge badge-pending">{logs.length} entries</span>
                    </div>

                    {logs.length === 0 ? (
                      <p className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>
                        No daily logs recorded yet by this patient.
                      </p>
                    ) : (
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Log Date</th>
                              <th>Fasting Glucose</th>
                              <th>Post-Meal Glucose</th>
                              <th>Blood Pressure</th>
                              <th>Weight</th>
                              <th>Heart Rate</th>
                              <th>Source</th>
                            </tr>
                          </thead>
                          <tbody>
                            {logs.map((log) => (
                              <tr key={log._id}>
                                <td style={{ fontWeight: 500 }}>
                                  {new Date(log.logDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td style={{ fontWeight: 600, color: log.fastingGlucose >= 126 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                  {log.fastingGlucose ? `${log.fastingGlucose} mg/dL` : '—'}
                                </td>
                                <td style={{ fontWeight: 600, color: log.postMealGlucose >= 200 ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                                  {log.postMealGlucose ? `${log.postMealGlucose} mg/dL` : '—'}
                                </td>
                                <td>
                                  {log.bloodPressureSystolic
                                    ? `${log.bloodPressureSystolic}/${log.bloodPressureDiastolic} mmHg`
                                    : '—'}
                                </td>
                                <td>{log.weightKg ? `${log.weightKg} kg` : '—'}</td>
                                <td>{log.heartRateBpm ? `${log.heartRateBpm} bpm` : '—'}</td>
                                <td>
                                  <span className={`badge ${log.entrySource === 'doctor' ? 'badge-grade-0' : 'badge-pending'}`}>
                                    {log.entrySource || 'manual'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
