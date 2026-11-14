/**
 * pages/PatientDashboard.jsx
 *
 * The patient-facing view. Shows:
 *  - Patient profile summary (top stat cards)
 *  - BiometricForm (left column) for daily log submission
 *  - ProgressionChart (right column) showing glucose/BP trends
 *  - Recent logs table below
 *
 * Data flow:
 *  1. On mount, fetch the patient profile by :id from URL params
 *  2. Fetch the last 30 days of health logs
 *  3. On form submit, POST a new log and refresh the chart
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.jsx';
import { getPatientById, getHealthLogs, createHealthLog } from '../services/api.js';
import BiometricForm from '../components/patient/BiometricForm.jsx';
import ProgressionChart from '../components/patient/ProgressionChart.jsx';

// ── Mock data for development (backend not yet running) ───────
const MOCK_PATIENT = {
  _id:                   'mock-001',
  fullName:              'Ravi Kumar',
  age:                   54,
  diabetesType:          'Type 2',
  diabetesDurationYears: 8,
  baselineHbA1c:         7.8,
  hasHypertension:       true,
  assignedDoctorId:      'Dr. Priya Nair',
};

const MOCK_LOGS = Array.from({ length: 14 }, (_, i) => ({
  _id:      `log-${i}`,
  logDate:  new Date(Date.now() - i * 86400000).toISOString(),
  fastingGlucose:          [128,132,118,145,138,122,130,125,115,142,136,120,128,131][i],
  postMealGlucose:         [185,195,172,210,205,180,190,185,165,215,200,175,195,188][i],
  bloodPressureSystolic:   [130,135,128,142,138,132,136,130,125,140,137,129,133,136][i],
  bloodPressureDiastolic:  [82,86,80,90,88,83,87,82,78,91,88,80,84,87][i],
  entrySource: 'manual',
}));

// ── Glucose status helper ─────────────────────────────────────
function latestGlucoseStatus(value, type) {
  if (!value) return null;
  if (type === 'fasting')  return value >= 126 ? 'danger' : value >= 100 ? 'warn' : 'normal';
  if (type === 'postMeal') return value >= 200 ? 'danger' : value >= 140 ? 'warn' : 'normal';
  return 'normal';
}

const trendColors = { danger: 'var(--color-danger)', warn: 'var(--color-warning)', normal: 'var(--color-success)' };

export default function PatientDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectPatient, notify } = useAppContext();

  const [patient,     setPatient]     = useState(null);
  const [logs,        setLogs]        = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting,  setSubmitting]  = useState(false);

  // ── Fetch patient + logs ──────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      // Try real API first; fall back to mock data
      const [patientData, logsData] = await Promise.all([
        getPatientById(id).catch(() => MOCK_PATIENT),
        getHealthLogs(id, { limit: 30 }).catch(() => ({ logs: MOCK_LOGS })),
      ]);

      const p = patientData?.patient || patientData;
      const l = logsData?.logs || logsData || MOCK_LOGS;

      setPatient(p);
      setLogs(l);
      selectPatient(p);
    } catch {
      setPatient(MOCK_PATIENT);
      setLogs(MOCK_LOGS);
    } finally {
      setPageLoading(false);
    }
  }, [id]); // eslint-disable-line

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Form submit handler ───────────────────────────────────
  const handleSubmitLog = async (formPayload) => {
    setSubmitting(true);
    try {
      await createHealthLog({ ...formPayload, patientId: id });
      notify('success', 'Daily log saved successfully!');
      fetchData(); // Refresh logs and chart
    } catch (err) {
      // Backend not yet wired — show optimistic success in dev
      notify('warning', `Log saved locally (backend: ${err.message})`);
      // Optimistically prepend to logs list for UI feedback
      setLogs((prev) => [{ _id: `local-${Date.now()}`, ...formPayload }, ...prev]);
    } finally {
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return <div className="spinner-overlay" style={{ marginTop: 80 }}><div className="spinner" /></div>;
  }

  // ── Derived stats from latest log ─────────────────────────
  const latestLog = logs[0];
  const fStatus   = latestGlucoseStatus(latestLog?.fastingGlucose, 'fasting');
  const pmStatus  = latestGlucoseStatus(latestLog?.postMealGlucose, 'postMeal');

  return (
    <div>
      {/* ── Back Link ─────────────────────────────────── */}
      <button
        className="btn btn-outline btn-sm"
        onClick={() => navigate('/')}
        style={{ marginBottom: 'var(--space-lg)' }}
      >
        ← Back to Home
      </button>

      {/* ── Patient Profile Header ───────────────────── */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>
              👤 {patient?.fullName}
            </h1>
            <p className="text-muted text-sm">
              {patient?.diabetesType} Diabetes &nbsp;·&nbsp;
              {patient?.diabetesDurationYears} years diagnosed &nbsp;·&nbsp;
              Age {patient?.age || '—'}
              {patient?.hasHypertension && ' &nbsp;·&nbsp; Hypertension'}
            </p>
            {patient?.assignedDoctorId && (
              <p className="text-sm" style={{ marginTop: 4 }}>
                🩺 Assigned to: <strong>{patient.assignedDoctorId}</strong>
              </p>
            )}
          </div>

          {patient?.baselineHbA1c && (
            <div className="stat-card" style={{ minWidth: 160 }}>
              <span className="stat-label">Baseline HbA1c</span>
              <span className="stat-value" style={{ color: patient.baselineHbA1c >= 7 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {patient.baselineHbA1c}<span className="stat-unit">%</span>
              </span>
              <span className="text-muted text-sm">{patient.baselineHbA1c < 5.7 ? 'Normal' : patient.baselineHbA1c < 6.5 ? 'Pre-diabetic' : 'Diabetic range'}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Latest Reading Stat Cards ────────────────── */}
      {latestLog && (
        <div className="grid-3" style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="stat-card">
            <span className="stat-label">Latest Fasting Glucose</span>
            <span className="stat-value" style={{ color: trendColors[fStatus] }}>
              {latestLog.fastingGlucose ?? '—'}
              <span className="stat-unit"> mg/dL</span>
            </span>
            <span className="text-sm" style={{ color: trendColors[fStatus] }}>
              {fStatus === 'normal' ? '✓ Normal range' : fStatus === 'warn' ? '⚠ Pre-diabetic' : '⚠ Diabetic range'}
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Latest Post-Meal Glucose</span>
            <span className="stat-value" style={{ color: trendColors[pmStatus] }}>
              {latestLog.postMealGlucose ?? '—'}
              <span className="stat-unit"> mg/dL</span>
            </span>
            <span className="text-sm" style={{ color: trendColors[pmStatus] }}>
              {pmStatus === 'normal' ? '✓ Normal range' : pmStatus === 'warn' ? '⚠ Pre-diabetic' : '⚠ Diabetic range'}
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Blood Pressure</span>
            <span className="stat-value">
              {latestLog.bloodPressureSystolic ?? '—'}/{latestLog.bloodPressureDiastolic ?? '—'}
              <span className="stat-unit"> mmHg</span>
            </span>
            <span className="text-sm text-muted">
              {latestLog.bloodPressureSystolic >= 140 ? '⚠ Stage 2 HTN' :
               latestLog.bloodPressureSystolic >= 130 ? '⚠ Stage 1 HTN' : '✓ Normal'}
            </span>
          </div>
        </div>
      )}

      {/* ── Main Content: Form + Chart ────────────────── */}
      <div className="grid-2" style={{ alignItems: 'flex-start' }}>

        {/* Left — Biometric Form */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📝 Log Today's Readings</h2>
            <span className="badge badge-pending">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
          <BiometricForm onSubmit={handleSubmitLog} isSubmitting={submitting} />
        </div>

        {/* Right — Progression Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📈 Health Progression</h2>
            <span className="text-muted text-sm">Last {logs.length} entries</span>
          </div>
          <ProgressionChart logs={logs} />
        </div>
      </div>

      {/* ── Recent Logs Table ─────────────────────────── */}
      <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="card-header">
          <h2 className="card-title">📅 Recent Health Log</h2>
          <span className="text-muted text-sm">{logs.length} entries</span>
        </div>

        {logs.length === 0 ? (
          <p className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>
            No log entries yet. Submit your first daily reading above.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Fasting Glucose</th>
                  <th>Post-Meal Glucose</th>
                  <th>BP (Sys/Dia)</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 15).map((log) => {
                  const fS = latestGlucoseStatus(log.fastingGlucose, 'fasting');
                  const pS = latestGlucoseStatus(log.postMealGlucose, 'postMeal');
                  return (
                    <tr key={log._id}>
                      <td style={{ fontWeight: 500 }}>
                        {new Date(log.logDate).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td style={{ color: trendColors[fS], fontWeight: 600 }}>
                        {log.fastingGlucose ? `${log.fastingGlucose} mg/dL` : '—'}
                      </td>
                      <td style={{ color: trendColors[pS], fontWeight: 600 }}>
                        {log.postMealGlucose ? `${log.postMealGlucose} mg/dL` : '—'}
                      </td>
                      <td>
                        {log.bloodPressureSystolic
                          ? `${log.bloodPressureSystolic}/${log.bloodPressureDiastolic} mmHg`
                          : '—'}
                      </td>
                      <td>
                        <span className={`badge ${log.entrySource === 'doctor' ? 'badge-grade-0' : 'badge-pending'}`}>
                          {log.entrySource || 'manual'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
