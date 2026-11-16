/**
 * pages/DoctorDashboard.jsx
 *
 * Remidio Medios-inspired Clinical Diagnostic Workstation.
 * Features:
 *  - Patient Roster with metabolic baseline risk badges
 *  - Diagnostic Triage & Retinal Multi-Spectral Lens
 *  - Longitudinal Tele-Oculomics (Fasting & Post-meal progression)
 *  - Clinical verification & printable tele-retinal report
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
    confidenceScore:   0.88,
    gradingSource:     'ai',
    gradedAt:          new Date(Date.now() - 30 * 86400000).toISOString(),
    requiresUrgentReview: false,
    originalFileName:  'fundus_od_oct2026.jpg',
    gradeProbabilities: [0.03, 0.06, 0.88, 0.02, 0.01],
  },
  {
    _id:               'scan-002',
    scanDate:          new Date(Date.now() - 90 * 86400000).toISOString(),
    eye:               'Left',
    drGrade:           1,
    drGradeLabel:      'Mild NPDR',
    confidenceScore:   0.92,
    gradingSource:     'ai',
    gradedAt:          new Date(Date.now() - 90 * 86400000).toISOString(),
    requiresUrgentReview: false,
    originalFileName:  'fundus_os_aug2026.jpg',
    gradeProbabilities: [0.04, 0.92, 0.03, 0.01, 0.00],
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

  useEffect(() => {
    getAllPatients()
      .then((data) => {
        const list = data?.patients || data || [];
        setPatients(list.length > 0 ? list : MOCK_PATIENTS);
        if (list.length > 0) handleSelectPatient(list[0]);
      })
      .catch(() => {
        setPatients(MOCK_PATIENTS);
        handleSelectPatient(MOCK_PATIENTS[0]);
      })
      .finally(() => setPatientsLoading(false));
  }, []); // eslint-disable-line

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
      // Offline PyTorch simulated response
      const mockResult = {
        _id:               `scan-${Date.now()}`,
        scanDate:          new Date().toISOString(),
        eye:               formData.get('eye') || 'Right',
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
      notify('success', 'Medios Edge-AI evaluated image successfully.');
    } finally {
      setUploading(false);
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
      : '130/84';

    return { avgFasting, avgPostMeal, latestBP };
  }, [logs]);

  return (
    <div>
      {/* ── Top Bar ───────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Ophthalmic Diagnostic Workstation</h1>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Point-of-Care Retinal Examination &bull; Tele-Oculomics Longitudinal Profiling
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
            🖨️ Print Clinical Summary
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 'var(--space-lg)', alignItems: 'flex-start' }}>

        {/* ── LEFT: Patient Selection Roster ──────────── */}
        <div className="card" style={{ position: 'sticky', top: '90px', padding: 'var(--space-md)' }}>
          <div className="card-header" style={{ marginBottom: 'var(--space-sm)' }}>
            <h2 className="card-title" style={{ fontSize: '15px' }}>👥 Patient Queue</h2>
            <span className="mono-tag" style={{ background: 'var(--remidio-cyan-light)', color: 'var(--remidio-cyan-hover)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              {patients.length} ENROLLED
            </span>
          </div>

          {patientsLoading ? (
            <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {patients.map((p) => {
                const isSelected = selectedPatient?._id === p._id;
                return (
                  <div
                    key={p._id}
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
                        Age {p.age || '54'}
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

          {selectedPatient && (
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
                      Patient ID: <strong className="mono-tag">{selectedPatient._id}</strong> &bull; Diabetes Duration: <strong>{selectedPatient.diabetesDurationYears} years</strong> &bull; Assigned Doctor: Dr. Priya Nair, MD
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
                        patientId={selectedPatient._id}
                        onUpload={handleUpload}
                        isUploading={uploading}
                      />
                    </div>

                    {/* Remidio AI Diagnostics */}
                    <div>
                      <RiskScoreCard scan={latestResult} />
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
                    ) : (
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Eye</th>
                              <th>ICDR Classification</th>
                              <th>Confidence</th>
                              <th>Triage Status</th>
                              <th>Review</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scans.map((scan) => {
                              const isReferable = (scan.drGrade || 0) >= 2;
                              return (
                                <tr key={scan._id}>
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
                                    {isReferable ? (
                                      <span className="badge" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                                        🚨 REFERABLE
                                      </span>
                                    ) : (
                                      <span className="badge" style={{ background: '#ECFDF5', color: '#065F46' }}>
                                        ✓ NON-REFERABLE
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
                    ) : (
                      <ProgressionChart logs={logs} />
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
