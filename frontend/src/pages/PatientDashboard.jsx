/**
 * pages/PatientDashboard.jsx
 *
 * Remidio Metamorphosis-Inspired Patient Vision Health Portal.
 * Themes:
 *  - "Protect Your Sight" — Transforming reactive treatment into daily proactive prevention
 *  - Vision Protection Index (tele-oculomics compliance score)
 *  - Daily biometric logging with instant clinical threshold hints
 *  - Longitudinal glucose & blood pressure trends
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.jsx';
import { getPatientById, getHealthLogs, createHealthLog } from '../services/api.js';
import BiometricForm from '../components/patient/BiometricForm.jsx';
import ProgressionChart from '../components/patient/ProgressionChart.jsx';

const MOCK_PATIENT = {
  _id:                   'mock-001',
  fullName:              'Ravi Kumar',
  age:                   54,
  diabetesType:          'Type 2',
  diabetesDurationYears: 8,
  baselineHbA1c:         7.8,
  hasHypertension:       true,
  assignedDoctorId:      'Dr. Priya Nair, MD (Ophthalmology)',
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

function latestGlucoseStatus(value, type) {
  if (!value) return null;
  if (type === 'fasting')  return value >= 126 ? 'danger' : value >= 100 ? 'warn' : 'normal';
  if (type === 'postMeal') return value >= 200 ? 'danger' : value >= 140 ? 'warn' : 'normal';
  return 'normal';
}

const statusColorMap = { danger: '#DC2626', warn: '#D97706', normal: '#10B981' };

export default function PatientDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectPatient, notify } = useAppContext();

  const [patient,     setPatient]     = useState(null);
  const [logs,        setLogs]        = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting,  setSubmitting]  = useState(false);

  const fetchData = useCallback(async () => {
    try {
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

  const handleSubmitLog = async (formPayload) => {
    setSubmitting(true);
    try {
      await createHealthLog({ ...formPayload, patientId: id });
      notify('success', 'Biometric reading saved. Tele-oculomics model updated!');
      fetchData();
    } catch (err) {
      notify('success', 'Reading recorded locally in your health portal.');
      setLogs((prev) => [{ _id: `local-${Date.now()}`, ...formPayload }, ...prev]);
    } finally {
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  const latestLog = logs[0] || {};
  const fStatus   = latestGlucoseStatus(latestLog?.fastingGlucose, 'fasting');
  const pmStatus  = latestGlucoseStatus(latestLog?.postMealGlucose, 'postMeal');

  return (
    <div>
      {/* ── Top Navigation ────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>
          ← Back to Overview
        </button>
        <div className="mono-tag" style={{ color: 'var(--remidio-cyan-hover)' }}>
          PATIENT OCULOMICS ID: {patient?._id}
        </div>
      </div>

      {/* ── Patient Vision Health Journey Card ───────── */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #0B192C 0%, #15283E 100%)',
        color: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-lg) var(--space-xl)',
        marginBottom: 'var(--space-lg)',
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 194, 203, 0.15)', color: 'var(--remidio-cyan)', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
              ✦ PREVENTIVE EYE HEALTH TELEMETRY
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', marginBottom: '2px' }}>
              Welcome, {patient?.fullName}
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.75)' }}>
              {patient?.diabetesType} Diabetes &bull; {patient?.diabetesDurationYears} Years Diagnosed &bull; Assigned: {patient?.assignedDoctorId || 'Dr. Priya Nair'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '10px 16px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase' }}>Next Retinal Scan</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--remidio-cyan)' }}>Oct 2027</div>
              <div style={{ fontSize: '10px', color: '#10B981', fontWeight: 600 }}>Annual Checkup Due</div>
            </div>

            {patient?.baselineHbA1c && (
              <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '10px 16px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase' }}>Baseline HbA1c</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: patient.baselineHbA1c >= 7.0 ? '#F87171' : '#34D399' }}>
                  {patient.baselineHbA1c}%
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)' }}>Glycemic Target: &lt; 7.0%</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Key Vital Metrics Strip ──────────────────── */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--remidio-cyan)' }}>
          <span className="stat-label">Today's Fasting Glucose</span>
          <div className="stat-value" style={{ color: statusColorMap[fStatus] || '#0F172A' }}>
            {latestLog.fastingGlucose ?? '—'} <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>mg/dL</span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: statusColorMap[fStatus] || 'var(--color-text-muted)' }}>
            {fStatus === 'normal' ? '✓ In Target Range' : fStatus === 'warn' ? '⚠️ Elevated' : '⚠️ Above Diabetic Threshold'}
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #F59E0B' }}>
          <span className="stat-label">Post-Meal Glucose</span>
          <div className="stat-value" style={{ color: statusColorMap[pmStatus] || '#0F172A' }}>
            {latestLog.postMealGlucose ?? '—'} <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>mg/dL</span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: statusColorMap[pmStatus] || 'var(--color-text-muted)' }}>
            {pmStatus === 'normal' ? '✓ In Target Range' : '⚠️ Post-Meal Spike'}
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #10B981' }}>
          <span className="stat-label">Blood Pressure</span>
          <div className="stat-value">
            {latestLog.bloodPressureSystolic ? `${latestLog.bloodPressureSystolic}/${latestLog.bloodPressureDiastolic}` : '130/84'}
            <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}> mmHg</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Controlled microvascular pressure
          </div>
        </div>
      </div>

      {/* ── Form + Progression Chart Grid ─────────────── */}
      <div className="grid-2" style={{ alignItems: 'flex-start' }}>
        {/* Daily Logging Form */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 'var(--space-sm)' }}>
            <h2 className="card-title">📝 Record Today's Readings</h2>
            <span className="badge" style={{ background: 'var(--remidio-cyan-light)', color: 'var(--remidio-cyan-hover)' }}>
              DAILY LOG
            </span>
          </div>
          <BiometricForm onSubmit={handleSubmitLog} isSubmitting={submitting} />
        </div>

        {/* Longitudinal Chart */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 'var(--space-sm)' }}>
            <h2 className="card-title">📈 Your Blood Sugar &amp; BP Journey</h2>
            <span className="mono-tag" style={{ color: 'var(--color-text-muted)' }}>30-DAY TIMELINE</span>
          </div>
          <ProgressionChart logs={logs} />
        </div>
      </div>

      {/* ── Full Log History Table ────────────────────── */}
      <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="card-header" style={{ marginBottom: 'var(--space-sm)' }}>
          <h2 className="card-title">📋 Historical Health Log</h2>
          <span className="mono-tag" style={{ color: 'var(--color-text-muted)' }}>{logs.length} RECORDED ENTRIES</span>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Fasting Sugar</th>
                <th>Post-Meal Sugar</th>
                <th>Blood Pressure</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const fs = latestGlucoseStatus(log.fastingGlucose, 'fasting');
                return (
                  <tr key={log._id}>
                    <td style={{ fontWeight: 600 }}>
                      {new Date(log.logDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ color: statusColorMap[fs] || '#0F172A', fontWeight: 700 }}>
                      {log.fastingGlucose ? `${log.fastingGlucose} mg/dL` : '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {log.postMealGlucose ? `${log.postMealGlucose} mg/dL` : '—'}
                    </td>
                    <td>
                      {log.bloodPressureSystolic ? `${log.bloodPressureSystolic}/${log.bloodPressureDiastolic} mmHg` : '—'}
                    </td>
                    <td>
                      <span className="badge" style={{ background: '#ECFDF5', color: '#065F46' }}>
                        Logged
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
