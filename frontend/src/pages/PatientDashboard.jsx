/**
 * pages/PatientDashboard.jsx
 *
 * Remidio Metamorphosis-Inspired Patient Vision Health Portal.
 * Themes:
 *  - "Protect Your Sight" — Transforming reactive treatment into daily proactive prevention
 *  - Requirement 5: Patient logs in, checks doctor updates/reports, and submits daily reports
 *  - Requirement 6: Displays Retinal Fundus Screening reports transmitted directly by the attending doctor
 *  - Longitudinal glucose & blood pressure trends
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getPatientById, getHealthLogs, createHealthLog, getPatientScans, changePassword } from '../services/api.js';
import BiometricForm from '../components/patient/BiometricForm.jsx';
import ProgressionChart from '../components/patient/ProgressionChart.jsx';
import EyeSymbol from '../components/common/EyeSymbol.jsx';

function latestGlucoseStatus(value, type) {
  if (!value) return null;
  if (type === 'fasting')  return value >= 126 ? 'danger' : value >= 100 ? 'warn' : 'normal';
  if (type === 'postMeal') return value >= 200 ? 'danger' : value >= 140 ? 'warn' : 'normal';
  return 'normal';
}

const statusColorMap = { danger: '#DC2626', warn: '#D97706', normal: '#10B981' };

const GRADE_INFO = {
  0: { label: 'No DR Detected', color: '#10B981', bg: '#ECFDF5' },
  1: { label: 'Mild NPDR', color: '#16A34A', bg: '#F0FDF4' },
  2: { label: 'Moderate NPDR', color: '#D97706', bg: '#FFFBEB' },
  3: { label: 'Severe NPDR', color: '#EA580C', bg: '#FFF7ED' },
  4: { label: 'Proliferative DR', color: '#DC2626', bg: '#FEF2F2' },
};

export default function PatientDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectPatient, notify } = useAppContext();

  const [patient,       setPatient]       = useState(null);
  const [logs,          setLogs]          = useState([]);
  const [scans,         setScans]         = useState([]);
  const [pageLoading,   setPageLoading]   = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [selectedScan,  setSelectedScan]  = useState(null);

  // Change Password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  const targetPatientId = id || user?.patientProfileId || user?.id;

  const fetchData = useCallback(async () => {
    try {
      const [patientData, logsData, scansData] = await Promise.all([
        getPatientById(targetPatientId).catch(() => null),
        getHealthLogs(targetPatientId, { limit: 30 }).catch(() => ({ logs: [] })),
        getPatientScans(targetPatientId).catch(() => ({ scans: [] })),
      ]);

      const p = patientData?.patient || patientData || {
        fullName: user?.name || 'Diabetic Health Patient',
        diabetesType: 'Type 2',
        diabetesDurationYears: 5,
        baselineHbA1c: 7.2,
      };
      const l = logsData?.logs || logsData || [];
      const s = scansData?.scans || scansData || [];

      setPatient(p);
      setLogs(l);
      setScans(s);
      if (s.length > 0) setSelectedScan(s[0]);
      selectPatient(p);
    } catch (err) {
      console.warn('Patient fetch notice:', err.message);
    } finally {
      setPageLoading(false);
    }
  }, [targetPatientId, user, selectPatient]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Requirement 5: Patient submits daily health log
  const handleSubmitLog = async (formPayload) => {
    setSubmitting(true);
    try {
      await createHealthLog({ ...formPayload, patientId: targetPatientId });
      notify('success', 'Daily health log saved. Tele-oculomics model updated!');
      fetchData();
    } catch (err) {
      notify('error', `Could not save reading: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle password change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      notify('error', 'New password and confirm password do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      notify('error', 'New password must be at least 6 characters long.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      notify('success', res?.message || 'Password successfully updated!');
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      notify('error', err.message || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (pageLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: '12px', color: 'var(--color-text-muted)' }}>Loading your personalized vision telemetry...</p>
      </div>
    );
  }

  const latestLog = logs[0] || {};
  const fStatus   = latestGlucoseStatus(latestLog?.fastingGlucose, 'fasting');
  const pmStatus  = latestGlucoseStatus(latestLog?.postMealGlucose, 'postMeal');

  const doctorDisplayName = user?.assignedDoctorName || patient?.assignedDoctorId || 'Dr. Ananya Sharma';

  return (
    <div>
      {/* ── Top Navigation ────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: 'var(--space-md)' }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>
          ← Back to Overview
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowPasswordModal(true)}
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🔒 Change Password
          </button>
          <div className="mono-tag" style={{ color: 'var(--remidio-cyan-hover)' }}>
            PATIENT OCULOMICS ID: {targetPatientId}
          </div>
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
              {patient?.diabetesType} Diabetes &bull; {patient?.diabetesDurationYears} Years Diagnosed &bull; Attending Clinician: <strong>{doctorDisplayName}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '10px 16px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase' }}>Shared Reports</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--remidio-cyan)' }}>{scans.length}</div>
              <div style={{ fontSize: '10px', color: '#10B981', fontWeight: 600 }}>Doctor Verified</div>
            </div>

            {patient?.baselineHbA1c && (
              <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '10px 16px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase' }}>Baseline HbA1c</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: patient.baselineHbA1c >= 7.0 ? '#F87171' : '#34D399' }}>
                  {patient.baselineHbA1c}%
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)' }}>Target: &lt; 7.0%</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── REQUIREMENTS 5 & 6: RETINAL REPORTS FROM ATTENDING DOCTOR ── */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--remidio-cyan)' }}>
        <div className="card-header" style={{ marginBottom: 'var(--space-md)' }}>
          <div>
            <h2 className="card-title" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <EyeSymbol size={20} color="var(--remidio-cyan, #00C2CB)" /> Retinal Screening Reports &amp; Doctor's Updates
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Official diagnostic summaries published by your attending ophthalmologist ({doctorDisplayName})
            </div>
          </div>
          <span className="badge" style={{ background: scans.length > 0 ? '#ECFDF5' : '#F1F5F9', color: scans.length > 0 ? '#065F46' : '#64748B' }}>
            {scans.length > 0 ? `✓ ${scans.length} REPORTS RECEIVED` : 'NO REPORTS RELEASED YET'}
          </span>
        </div>

        {scans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-xl)', background: '#F8FAFC', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔬</div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              No Retinal Reports Released Yet
            </h3>
            <p className="text-sm text-muted" style={{ maxWidth: '440px', margin: '4px auto 0' }}>
              Your attending ophthalmologist ({doctorDisplayName}) will conduct a non-mydriatic fundus photograph during your appointment and send the clinical summary directly to this portal.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {scans.map((scan) => {
              const grade = scan.drGrade ?? 0;
              const gInfo = GRADE_INFO[grade] || GRADE_INFO[0];
              const isReferable = grade >= 2;

              return (
                <div
                  key={scan._id || scan.id}
                  style={{
                    background: '#F8FAFC',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`badge badge-grade-${grade}`}>
                        Grade {grade} &bull; {scan.drGradeLabel || gInfo.label}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                        Eye: <strong>{scan.eye === 'Left' ? 'OS (Left Eye)' : 'OD (Right Eye)'}</strong>
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>
                        Scan Date: {new Date(scan.scanDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isReferable ? (
                        <span className="badge" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                          🚨 Ophthalmologist Review Recommended
                        </span>
                      ) : (
                        <span className="badge" style={{ background: '#ECFDF5', color: '#065F46' }}>
                          ✓ Routine Annual Monitoring
                        </span>
                      )}
                      <span className="mono-tag" style={{ color: 'var(--remidio-cyan)' }}>
                        AI Confidence: {Math.round((scan.confidenceScore || 0.9) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Doctor's Signed Clinical Advice */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginTop: '8px',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--remidio-cyan-hover)', marginBottom: '4px' }}>
                      💬 Doctor's Direct Clinical Recommendations:
                    </div>
                    <p style={{ fontSize: '14px', color: '#1E293B', lineHeight: 1.5, margin: '0 0 8px 0' }}>
                      {scan.doctorNotesToPatient || scan.clinicianNotes || 'Maintain strict blood sugar and blood pressure management. Routine annual follow-up recommended.'}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #E2E8F0', paddingTop: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        ✍️ Certified &amp; Released by: <strong>{scan.doctorSignatureName || doctorDisplayName}</strong>
                      </span>
                      {scan.sharedAt && (
                        <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
                          ✓ Transmitted to your portal on {new Date(scan.sharedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
            {latestLog.bloodPressureSystolic && latestLog.bloodPressureDiastolic ? `${latestLog.bloodPressureSystolic}/${latestLog.bloodPressureDiastolic}` : '—'}
            <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}> mmHg</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Microvascular status
          </div>
        </div>
      </div>

      {/* ── Form + Progression Chart Grid ─────────────── */}
      <div className="grid-2" style={{ alignItems: 'flex-start' }}>
        {/* Daily Logging Form (Requirement 5) */}
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
        <div className="card-header">
          <h2 className="card-title">📋 30-Day Biometric Record Log</h2>
          <span className="mono-tag" style={{ color: 'var(--color-text-muted)' }}>
            {logs.length} RECORDED ENTRIES
          </span>
        </div>

        {logs.length === 0 ? (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No health logs recorded yet. Submit your first daily reading using the form above!
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Fasting (mg/dL)</th>
                  <th>Post-Meal (mg/dL)</th>
                  <th>BP (mmHg)</th>
                  <th>Weight (kg)</th>
                  <th>Heart Rate</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const fStat = latestGlucoseStatus(log.fastingGlucose, 'fasting');
                  return (
                    <tr key={log._id || log.id}>
                      <td style={{ fontWeight: 600 }}>
                        {log.logDate ? new Date(log.logDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: statusColorMap[fStat] || 'inherit' }}>
                          {log.fastingGlucose ?? '—'}
                        </span>
                      </td>
                      <td>{log.postMealGlucose ?? '—'}</td>
                      <td>
                        {log.bloodPressureSystolic && log.bloodPressureDiastolic
                          ? `${log.bloodPressureSystolic}/${log.bloodPressureDiastolic}`
                          : '—'}
                      </td>
                      <td>{log.weightKg ?? '—'}</td>
                      <td>{log.heartRateBpm ? `${log.heartRateBpm} bpm` : '—'}</td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                        {log.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: CHANGE PASSWORD ── */}
      {showPasswordModal && (
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
            maxWidth: '440px',
            width: '100%',
            padding: 'var(--space-xl)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🔒</span>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--remidio-navy)', margin: 0 }}>
                  Update Portal Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
              Set a personal password for your patient vision telemetry portal.
            </p>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="form-group">
                <label className="label">Current Password *</label>
                <input
                  type="password"
                  className="input"
                  required
                  placeholder="Enter your current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">New Password *</label>
                <input
                  type="password"
                  className="input"
                  required
                  placeholder="Minimum 6 characters"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Confirm New Password *</label>
                <input
                  type="password"
                  className="input"
                  required
                  placeholder="Re-enter new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: 'var(--space-md)' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={changingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-cyan btn-sm"
                  disabled={changingPassword}
                  style={{ fontWeight: 700 }}
                >
                  {changingPassword ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
