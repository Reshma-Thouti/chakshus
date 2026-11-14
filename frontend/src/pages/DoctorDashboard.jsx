/**
 * pages/DoctorDashboard.jsx
 *
 * The clinician-facing view. Provides:
 *  - Patient selector panel (left)
 *  - Fundus image upload (right top) via ScanUpload component
 *  - Latest DR risk score result via RiskScoreCard component
 *  - Scan history table for the selected patient
 *
 * Data flow:
 *  1. Fetch patient list on mount
 *  2. Doctor selects a patient
 *  3. Doctor uploads a fundus image → ScanUpload fires onUpload(formData)
 *  4. DoctorDashboard calls uploadFundusScan API (Phase 4 — currently mocked)
 *  5. Response (ClinicalScan document with drGrade) shown in RiskScoreCard
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.jsx';
import { getAllPatients, getPatientScans, uploadFundusScan } from '../services/api.js';
import ScanUpload from '../components/doctor/ScanUpload.jsx';
import RiskScoreCard from '../components/doctor/RiskScoreCard.jsx';

// ── Mock data (Phase 2 — backend not yet wired) ───────────────
const MOCK_PATIENTS = [
  { _id: 'mock-001', fullName: 'Ravi Kumar',    diabetesType: 'Type 2', age: 54, diabetesDurationYears: 8  },
  { _id: 'mock-002', fullName: 'Anjali Sharma', diabetesType: 'Type 1', age: 32, diabetesDurationYears: 15 },
  { _id: 'mock-003', fullName: 'Murugan S.',    diabetesType: 'Type 2', age: 61, diabetesDurationYears: 12 },
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

// ── Grade badge helper ────────────────────────────────────────
const GRADE_LABELS = ['No DR','Mild NPDR','Moderate NPDR','Severe NPDR','Proliferative DR'];
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
  const [latestResult,     setLatestResult]     = useState(null);
  const [uploading,        setUploading]        = useState(false);
  const [patientsLoading,  setPatientsLoading]  = useState(true);
  const [scansLoading,     setScansLoading]     = useState(false);

  // ── Fetch patient list ────────────────────────────────────
  useEffect(() => {
    getAllPatients()
      .then((data) => {
        const list = data?.patients || data || [];
        setPatients(list.length > 0 ? list : MOCK_PATIENTS);
      })
      .catch(() => setPatients(MOCK_PATIENTS))
      .finally(() => setPatientsLoading(false));
  }, []);

  // ── Fetch scans for selected patient ─────────────────────
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

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    selectPatient(patient);
    setLatestResult(null);
    fetchScans(patient._id);
  };

  // ── Upload handler ────────────────────────────────────────
  const handleUpload = async (formData) => {
    setUploading(true);
    // Show pending state immediately in RiskScoreCard
    setLatestResult({ gradingSource: 'pending', drGrade: null });

    try {
      const result = await uploadFundusScan(formData);
      const scan = result?.scan || result;
      setLatestResult(scan);
      setScans((prev) => [scan, ...prev]);
      notify('success', `AI grading complete — Grade ${scan.drGrade}: ${scan.drGradeLabel}`);
    } catch (err) {
      // ── Mock response for Phase 2 (ML service not yet running) ──
      const mockResult = {
        _id:               `scan-${Date.now()}`,
        scanDate:          new Date().toISOString(),
        eye:               formData.get('eye'),
        drGrade:           2,
        drGradeLabel:      'Moderate NPDR',
        confidenceScore:   0.83,
        gradingSource:     'ai',
        gradedAt:          new Date().toISOString(),
        requiresUrgentReview: false,
        originalFileName:  formData.get('file')?.name,
        gradeProbabilities: [0.05, 0.08, 0.83, 0.03, 0.01],
      };
      setLatestResult(mockResult);
      setScans((prev) => [mockResult, ...prev]);
      notify('warning', 'Using mock AI response — ML service not yet connected (Phase 3)');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* ── Back Link ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>← Back to Home</button>
        <h1 style={{ fontSize: 'var(--font-size-xl)' }}>🩺 Doctor Dashboard</h1>
        <div />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--space-lg)', alignItems: 'flex-start' }}>

        {/* ── LEFT: Patient List Panel ───────────────── */}
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
                  onMouseEnter={e => { if(selectedPatient?._id !== p._id) e.currentTarget.style.background = 'var(--color-bg)'; }}
                  onMouseLeave={e => { if(selectedPatient?._id !== p._id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>👤 {p.fullName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {p.diabetesType} · {p.diabetesDurationYears}y · Age {p.age}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedPatient && (
            <button
              className="btn btn-outline btn-full btn-sm"
              style={{ marginTop: 'var(--space-md)' }}
              onClick={() => navigate(`/patient/${selectedPatient._id}`)}
            >
              📋 View Patient Log →
            </button>
          )}
        </div>

        {/* ── RIGHT: Upload + Result ─────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

          {!selectedPatient ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
              <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>👈</div>
              <p style={{ fontWeight: 600 }}>Select a patient to begin</p>
              <p className="text-muted text-sm">Choose from the patient list on the left</p>
            </div>
          ) : (
            <>
              {/* Upload + Result Grid */}
              <div className="grid-2" style={{ alignItems: 'flex-start' }}>
                {/* Upload Panel */}
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">🔬 Upload Fundus Scan</h2>
                  </div>
                  <div className="alert alert-info" style={{ fontSize: '12px' }}>
                    Patient: <strong>{selectedPatient.fullName}</strong> ({selectedPatient.diabetesType}, {selectedPatient.diabetesDurationYears}y)
                  </div>
                  <ScanUpload
                    patientId={selectedPatient._id}
                    onUpload={handleUpload}
                    isUploading={uploading}
                  />
                </div>

                {/* DR Result Panel */}
                <div>
                  <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                    🤖 AI Analysis Result
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
                          <th>Urgent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scans.map((scan) => (
                          <tr key={scan._id}>
                            <td style={{ fontWeight: 500 }}>
                              {scan.scanDate
                                ? new Date(scan.scanDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
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
        </div>
      </div>
    </div>
  );
}
