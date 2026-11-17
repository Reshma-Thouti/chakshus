/**
 * pages/AdminDashboard.jsx
 *
 * Enterprise Master Administrative Console for चक्षुस् (Chakshus).
 * Provides cross-system governance, multi-tenant doctor-patient roster oversight,
 * full clinical telemetry, and AI retinal scan diagnostics repository.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppContext } from '../context/AppContext.jsx';
import {
  getAdminOverview,
  getAdminDoctors,
  getAdminPatients,
  getAdminScans,
  reassignPatientDoctor,
  deleteAdminPatient,
  getAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
  deleteAdminRequest,
  API_ROOT,
} from '../services/api.js';
import EyeSymbol from '../components/common/EyeSymbol.jsx';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { notify } = useAppContext();
  const navigate = useNavigate();

  // Navigation tab: 'overview' | 'requests' | 'doctors' | 'patients' | 'scans'
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [scans, setScans] = useState([]);
  const [requests, setRequests] = useState([]);

  // Search & Filter states
  const [doctorSearch, setDoctorSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [patientDoctorFilter, setPatientDoctorFilter] = useState('ALL');
  const [scanGradeFilter, setScanGradeFilter] = useState('ALL');
  const [requestStatusFilter, setRequestStatusFilter] = useState('ALL');

  // Modals
  const [selectedPatientForInspect, setSelectedPatientForInspect] = useState(null);
  const [selectedScanForInspect, setSelectedScanForInspect] = useState(null);
  const [reassignModalPatient, setReassignModalPatient] = useState(null);
  const [selectedNewDoctorId, setSelectedNewDoctorId] = useState('');
  const [reassigning, setReassigning] = useState(false);

  // Load all admin data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, doctorsRes, patientsRes, scansRes, requestsRes] = await Promise.all([
        getAdminOverview(),
        getAdminDoctors(),
        getAdminPatients(),
        getAdminScans(),
        getAdminRequests(),
      ]);

      setOverviewData(overviewRes?.data || null);
      setDoctors(doctorsRes?.doctors || []);
      setPatients(patientsRes?.patients || []);
      setScans(scansRes?.scans || []);
      setRequests(requestsRes?.requests || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      notify?.(`Error loading administrative data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle registration request approval
  const handleApproveRequest = async (id, name, role) => {
    try {
      const res = await approveAdminRequest(id);
      notify?.(res?.message || `Approved ${role} account for ${name}!`, 'success');
      loadDashboardData();
    } catch (err) {
      notify?.(err.message || 'Failed to approve request', 'error');
    }
  };

  // Handle registration request rejection (permanently deletes data from DB)
  const handleRejectRequest = async (id, name) => {
    if (!window.confirm(`Are you sure you want to reject the registration request for ${name}? This will permanently delete their account data from the database.`)) {
      return;
    }
    try {
      const res = await rejectAdminRequest(id);
      notify?.(res?.message || `Rejected and removed registration request for ${name}.`, 'info');
      loadDashboardData();
    } catch (err) {
      notify?.(err.message || 'Failed to reject request', 'error');
    }
  };

  // Handle registration request permanent deletion
  const handleDeleteRequest = async (id, name) => {
    if (!window.confirm(`Permanently remove registration request for ${name}? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await deleteAdminRequest(id);
      notify?.(res?.message || `Removed request for ${name}.`, 'info');
      loadDashboardData();
    } catch (err) {
      notify?.(err.message || 'Failed to remove request', 'error');
    }
  };

  // Handle patient reassignment
  const handleReassignDoctor = async (e) => {
    e.preventDefault();
    if (!reassignModalPatient || !selectedNewDoctorId) return;

    setReassigning(true);
    try {
      const res = await reassignPatientDoctor(reassignModalPatient._id, selectedNewDoctorId);
      notify?.(res.message || 'Patient successfully reassigned!', 'success');
      setReassignModalPatient(null);
      setSelectedNewDoctorId('');
      // Reload fresh state
      loadDashboardData();
    } catch (err) {
      notify?.(err.message || 'Failed to reassign patient', 'error');
    } finally {
      setReassigning(false);
    }
  };

  // Filtered Doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const q = doctorSearch.toLowerCase();
      return (
        doc.name?.toLowerCase().includes(q) ||
        doc.email?.toLowerCase().includes(q) ||
        doc.hospitalOrClinic?.toLowerCase().includes(q) ||
        doc.specialization?.toLowerCase().includes(q)
      );
    });
  }, [doctors, doctorSearch]);

  // Filtered Patients
  const filteredPatients = useMemo(() => {
    return patients.filter((pt) => {
      const q = patientSearch.toLowerCase();
      const matchesSearch =
        pt.fullName?.toLowerCase().includes(q) ||
        pt.email?.toLowerCase().includes(q) ||
        pt.phone?.toLowerCase().includes(q) ||
        pt.assignedDoctorName?.toLowerCase().includes(q);

      const matchesDoctor =
        patientDoctorFilter === 'ALL' || String(pt.assignedDoctorId) === String(patientDoctorFilter);

      return matchesSearch && matchesDoctor;
    });
  }, [patients, patientSearch, patientDoctorFilter]);

  // Filtered Scans
  const filteredScans = useMemo(() => {
    return scans.filter((s) => {
      if (scanGradeFilter === 'ALL') return true;
      if (scanGradeFilter === 'URGENT') return s.requiresUrgentReview || s.drGrade >= 3;
      return String(s.drGrade) === String(scanGradeFilter);
    });
  }, [scans, scanGradeFilter]);

  // Filtered Registration Requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (requestStatusFilter === 'ALL') return true;
      return r.approvalStatus === requestStatusFilter;
    });
  }, [requests, requestStatusFilter]);

  const getGradeBadge = (grade) => {
    switch (Number(grade)) {
      case 0:
        return { label: 'Grade 0: No DR', bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' };
      case 1:
        return { label: 'Grade 1: Mild NPDR', bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' };
      case 2:
        return { label: 'Grade 2: Moderate NPDR', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' };
      case 3:
        return { label: 'Grade 3: Severe NPDR', bg: '#FFEDD5', color: '#9A3412', border: '#FED7AA' };
      case 4:
        return { label: 'Grade 4: Proliferative DR', bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' };
      default:
        return { label: 'Pending Review', bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: 'var(--space-lg) var(--space-md)' }}>
      {/* ── Enterprise Header ─────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0B192C 0%, #1E293B 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-xl)',
        color: '#FFFFFF',
        marginBottom: 'var(--space-xl)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        boxShadow: '0 8px 24px rgba(7, 17, 29, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-md)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.2)',
            border: '1px solid rgba(245, 158, 11, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}>
            ⚙️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                चक्षुस् Enterprise Administrator Console
              </h1>
              <span style={{
                background: '#F59E0B',
                color: '#1E293B',
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
              }}>
                Master Admin
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.75)' }}>
              Cross-system oversight of all attending ophthalmologists, enrolled patients, and AI retinal diagnostics.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={loadDashboardData}
            className="btn btn-outline btn-sm"
            style={{
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: '#FFFFFF',
              background: 'rgba(255, 255, 255, 0.08)',
              fontSize: '12px',
              padding: '8px 14px',
            }}
          >
            🔄 Refresh System Data
          </button>
        </div>
      </div>

      {/* ── Top Level KPIs ────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-xl)',
      }}>
        <div
          onClick={() => setActiveTab('patients')}
          className="card"
          style={{
            padding: 'var(--space-lg)',
            cursor: 'pointer',
            borderLeft: '4px solid #00C2CB',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Total Enrolled Patients
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--remidio-navy)', marginTop: '4px' }}>
            {loading ? '...' : overviewData?.metrics?.totalPatients ?? patients.length}
          </div>
          <div style={{ fontSize: '11px', color: '#00878E', fontWeight: 600, marginTop: '4px' }}>
            View Master Patient Registry &rarr;
          </div>
        </div>

        <div
          onClick={() => setActiveTab('doctors')}
          className="card"
          style={{
            padding: 'var(--space-lg)',
            cursor: 'pointer',
            borderLeft: '4px solid #D97706',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Certified Clinicians
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
            {loading ? '...' : overviewData?.metrics?.totalDoctors ?? doctors.length}
          </div>
          <div style={{ fontSize: '11px', color: '#B45309', fontWeight: 600, marginTop: '4px' }}>
            Inspect Doctor Directory & Workload &rarr;
          </div>
        </div>

        <div
          onClick={() => setActiveTab('scans')}
          className="card"
          style={{
            padding: 'var(--space-lg)',
            cursor: 'pointer',
            borderLeft: '4px solid #3B82F6',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Total AI Retinal Scans
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1E40AF', marginTop: '4px' }}>
            {loading ? '...' : overviewData?.metrics?.totalScans ?? scans.length}
          </div>
          <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600, marginTop: '4px' }}>
            Browse Retinal AI Diagnostics &rarr;
          </div>
        </div>

        <div
          onClick={() => setActiveTab('requests')}
          className="card"
          style={{
            padding: 'var(--space-lg)',
            cursor: 'pointer',
            borderLeft: '4px solid #10B981',
            background: requests.filter((r) => r.approvalStatus === 'pending').length > 0 ? '#ECFDF5' : undefined,
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: requests.filter((r) => r.approvalStatus === 'pending').length > 0 ? '#065F46' : 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Access Requests
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            {loading ? '...' : (overviewData?.metrics?.pendingRequestsCount ?? requests.filter((r) => r.approvalStatus === 'pending').length)}
          </div>
          <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700, marginTop: '4px' }}>
            {requests.filter((r) => r.approvalStatus === 'pending').length > 0
              ? `Review ${requests.filter((r) => r.approvalStatus === 'pending').length} Pending Approvals →`
              : 'Review Doctor & Patient Signups →'}
          </div>
        </div>

        <div
          onClick={() => { setActiveTab('scans'); setScanGradeFilter('URGENT'); }}
          className="card"
          style={{
            padding: 'var(--space-lg)',
            cursor: 'pointer',
            borderLeft: '4px solid #EF4444',
            background: '#FEF2F2',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>
            High-Risk Alerts (Grade 3/4)
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
            {loading ? '...' : overviewData?.metrics?.urgentScansCount ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: '#B91C1C', fontWeight: 700, marginTop: '4px' }}>
            Requires Immediate Specialist Care &rarr;
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '2px solid var(--color-border)',
        marginBottom: 'var(--space-xl)',
      }}>
        {[
          { id: 'overview', label: '📊 System Overview & Analytics' },
          { id: 'requests', label: `🔔 Access Requests (${requests.filter((r) => r.approvalStatus === 'pending').length} Pending)` },
          { id: 'doctors', label: `👨‍⚕️ Clinicians & Rosters (${doctors.length})` },
          { id: 'patients', label: `👥 Master Patient Registry (${patients.length})` },
          { id: 'scans', label: `🔬 Retinal AI Diagnostics Archive (${scans.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === tab.id ? '3px solid #D97706' : '3px solid transparent',
              color: activeTab === tab.id ? '#D97706' : 'var(--color-text-secondary)',
              fontWeight: activeTab === tab.id ? 800 : 600,
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 1: OVERVIEW & ANALYTICS                             */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          {/* DR Distribution Card */}
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: 'var(--space-md)', color: 'var(--remidio-navy)' }}>
              Diabetic Retinopathy (DR) Severity Distribution (Point-of-Care Edge AI)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
              {[
                { grade: 'Grade 0: Normal', count: overviewData?.drDistribution?.grade0 ?? 0, color: '#059669', bg: '#ECFDF5' },
                { grade: 'Grade 1: Mild NPDR', count: overviewData?.drDistribution?.grade1 ?? 0, color: '#2563EB', bg: '#EFF6FF' },
                { grade: 'Grade 2: Moderate NPDR', count: overviewData?.drDistribution?.grade2 ?? 0, color: '#D97706', bg: '#FFFBEB' },
                { grade: 'Grade 3: Severe NPDR', count: overviewData?.drDistribution?.grade3 ?? 0, color: '#EA580C', bg: '#FFF7ED' },
                { grade: 'Grade 4: Proliferative', count: overviewData?.drDistribution?.grade4 ?? 0, color: '#DC2626', bg: '#FEF2F2' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    background: item.bg,
                    border: `1px solid ${item.color}33`,
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: item.color }}>{item.grade}</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: item.color, marginTop: '4px' }}>
                    {item.count}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {overviewData?.metrics?.totalScans > 0
                      ? `${Math.round((item.count / overviewData.metrics.totalScans) * 100)}% of scans`
                      : '0% of scans'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Tables: Recent Scans & Doctors */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 'var(--space-lg)' }}>
            {/* Recent Retinal Ingestions */}
            <div className="card" style={{ padding: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--remidio-navy)' }}>
                  Recent Retinal AI Scans
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveTab('scans')}
                  className="btn btn-sm btn-outline"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  View All &rarr;
                </button>
              </div>

              {overviewData?.recentScans?.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>No retinal scans recorded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {overviewData?.recentScans?.slice(0, 5).map((scan) => {
                    const badge = getGradeBadge(scan.drGrade);
                    return (
                      <div
                        key={scan._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          background: '#F8FAFC',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--remidio-navy)' }}>
                            {scan.patientName}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            {scan.eye} Eye &bull; {new Date(scan.scanDate).toLocaleDateString()}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Registered Doctors Roster */}
            <div className="card" style={{ padding: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--remidio-navy)' }}>
                  Attending Clinicians
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveTab('doctors')}
                  className="btn btn-sm btn-outline"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  Manage Clinicians &rarr;
                </button>
              </div>

              {doctors.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>No doctors registered yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {doctors.slice(0, 5).map((doc) => (
                    <div
                      key={doc._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        background: '#F8FAFC',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--remidio-navy)' }}>
                          {doc.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {doc.hospitalOrClinic} &bull; {doc.specialization}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: 'rgba(217, 119, 6, 0.12)',
                          color: '#B45309',
                          border: '1px solid rgba(217, 119, 6, 0.3)',
                        }}
                      >
                        {doc.patientCount ?? 0} Patients Allotted
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: REGISTRATION & ACCESS REQUESTS                      */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'requests' && (
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-lg)',
          }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--remidio-navy)' }}>
                Clinician & Patient Access Requests
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Review and approve registration requests before clinicians or patients can access the platform.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                className="select"
                value={requestStatusFilter}
                onChange={(e) => setRequestStatusFilter(e.target.value)}
                style={{ width: '220px', fontSize: '13px' }}
              >
                <option value="ALL">All Requests ({requests.length})</option>
                <option value="pending">⏳ Pending Review ({requests.filter((r) => r.approvalStatus === 'pending').length})</option>
                <option value="approved">✅ Approved ({requests.filter((r) => r.approvalStatus === 'approved').length})</option>
                <option value="rejected">❌ Rejected ({requests.filter((r) => r.approvalStatus === 'rejected').length})</option>
              </select>
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-secondary)' }}>
              No access requests matching this filter.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', background: '#F8FAFC' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Applicant Name & Email</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Requested Role</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Professional / Clinical Details</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Submitted Date</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Approval Status</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((reqItem) => {
                    const isPending = reqItem.approvalStatus === 'pending';
                    const isApproved = reqItem.approvalStatus === 'approved';
                    const isRejected = reqItem.approvalStatus === 'rejected';

                    return (
                      <tr key={reqItem._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--remidio-navy)' }}>{reqItem.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{reqItem.email}</div>
                          {reqItem.phone && (
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>📞 {reqItem.phone}</div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            background: reqItem.role === 'doctor' ? 'rgba(217, 119, 6, 0.15)' : 'rgba(0, 194, 203, 0.15)',
                            color: reqItem.role === 'doctor' ? '#B45309' : '#00878E',
                            border: reqItem.role === 'doctor' ? '1px solid rgba(217, 119, 6, 0.3)' : '1px solid rgba(0, 194, 203, 0.3)',
                          }}>
                            {reqItem.role === 'doctor' ? '👨‍⚕️ Clinician' : '👤 Patient'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {reqItem.role === 'doctor' ? (
                            <div>
                              <div style={{ fontWeight: 600 }}>{reqItem.hospitalOrClinic || 'Hospital Not Provided'}</div>
                              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                {reqItem.specialization || 'General Ophthalmology'}
                                {reqItem.medicalLicenseNumber ? ` • Lic: ${reqItem.medicalLicenseNumber}` : ''}
                              </div>
                            </div>
                          ) : (
                            <div>
                              {reqItem.patientProfileId ? (
                                <div style={{ fontSize: '12px' }}>
                                  {reqItem.patientProfileId.gender || 'Patient'} &bull; {reqItem.patientProfileId.diabetesType || 'Type 2 Diabetes'} ({reqItem.patientProfileId.diabetesDurationYears || 0} yrs)
                                  <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>
                                    HbA1c: {reqItem.patientProfileId.baselineHbA1c || 'N/A'}%
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Patient profile record</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          {reqItem.createdAt ? new Date(reqItem.createdAt).toLocaleDateString() : 'Recent'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: isPending ? '#FEF3C7' : isApproved ? '#ECFDF5' : '#FEE2E2',
                            color: isPending ? '#92400E' : isApproved ? '#065F46' : '#991B1B',
                            border: `1px solid ${isPending ? '#FDE68A' : isApproved ? '#A7F3D0' : '#FECACA'}`,
                          }}>
                            {isPending && '⏳ Pending Review'}
                            {isApproved && '✅ Approved'}
                            {isRejected && '❌ Rejected'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveRequest(reqItem._id, reqItem.name, reqItem.role)}
                                  className="btn btn-sm"
                                  style={{
                                    background: '#10B981',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    fontSize: '11px',
                                    padding: '5px 10px',
                                    fontWeight: 700,
                                  }}
                                >
                                  ✅ Approve Access
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectRequest(reqItem._id, reqItem.name)}
                                  className="btn btn-sm btn-outline"
                                  style={{
                                    borderColor: '#EF4444',
                                    color: '#EF4444',
                                    fontSize: '11px',
                                    padding: '5px 8px',
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {isApproved && (
                              <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                                Active in System
                              </span>
                            )}
                            {isRejected && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleApproveRequest(reqItem._id, reqItem.name, reqItem.role)}
                                  className="btn btn-sm btn-outline"
                                  style={{
                                    fontSize: '11px',
                                    padding: '4px 8px',
                                  }}
                                >
                                  Re-approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRequest(reqItem._id, reqItem.name)}
                                  className="btn btn-sm btn-outline"
                                  style={{
                                    fontSize: '11px',
                                    padding: '4px 8px',
                                    borderColor: '#EF4444',
                                    color: '#EF4444',
                                  }}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 2: DOCTOR DIRECTORY & WORKLOAD                       */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'doctors' && (
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-lg)',
          }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--remidio-navy)' }}>
                Attending Ophthalmologists & Retina Specialists
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Complete administrative directory of clinicians authorized to ingest retinal scans and manage patient cohorts.
              </p>
            </div>

            <div style={{ width: '280px' }}>
              <input
                type="text"
                className="input"
                placeholder="Search clinician by name, clinic..."
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
              />
            </div>
          </div>

          {filteredDoctors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-secondary)' }}>
              No doctors matching your query.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', background: '#F8FAFC' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Doctor Name</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Hospital / Eye Center</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Specialization</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Email</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)', textAlign: 'center' }}>Allotted Patients</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.map((doc) => (
                    <tr key={doc._id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--remidio-navy)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>👨‍⚕️</span>
                          <span>{doc.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-text-primary)' }}>{doc.hospitalOrClinic}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>{doc.specialization}</td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{doc.email}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          background: doc.patientCount > 0 ? '#ECFDF5' : '#F1F5F9',
                          color: doc.patientCount > 0 ? '#065F46' : '#64748B',
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontWeight: 800,
                          fontSize: '12px',
                        }}>
                          {doc.patientCount} Patients
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setPatientDoctorFilter(doc._id);
                            setActiveTab('patients');
                          }}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '11px', padding: '5px 10px' }}
                        >
                          View Patients &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 3: MASTER PATIENT REGISTRY (ACROSS ALL DOCTORS)      */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'patients' && (
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-lg)',
          }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--remidio-navy)' }}>
                Master Cross-System Patient Registry
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Unified clinical access to all diabetic patients enrolled across every attending physician.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Doctor filter dropdown */}
              <select
                className="select"
                value={patientDoctorFilter}
                onChange={(e) => setPatientDoctorFilter(e.target.value)}
                style={{ width: '220px', fontSize: '13px' }}
              >
                <option value="ALL">All Attending Doctors</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {/* Search bar */}
              <input
                type="text"
                className="input"
                placeholder="Search patient name, email..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                style={{ width: '240px', fontSize: '13px' }}
              />

              {patientDoctorFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setPatientDoctorFilter('ALL')}
                  className="btn btn-sm btn-outline"
                  style={{ fontSize: '11px', padding: '6px 10px' }}
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>

          {filteredPatients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-secondary)' }}>
              No patients found for the specified criteria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', background: '#F8FAFC' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Patient Name</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Gender / Age</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Diabetes Baseline</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Assigned Clinician</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)', textAlign: 'center' }}>Scans</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)', textAlign: 'right' }}>Administrative Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((pt) => {
                    const birthYear = pt.dateOfBirth ? new Date(pt.dateOfBirth).getFullYear() : null;
                    const age = birthYear ? new Date().getFullYear() - birthYear : 'N/A';

                    return (
                      <tr key={pt._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--remidio-navy)' }}>{pt.fullName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{pt.email || pt.phone || 'No direct contact'}</div>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--color-text-primary)' }}>
                          {pt.gender} &bull; {age} yrs
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600 }}>{pt.diabetesType} ({pt.diabetesDurationYears} yrs)</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            HbA1c: <strong>{pt.baselineHbA1c}%</strong> {pt.hasHypertension && '• HTN'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#EFF6FF',
                            color: '#1E40AF',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}>
                            Dr. {pt.assignedDoctorName}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{
                            background: pt.scanCount > 0 ? '#ECFDF5' : '#F1F5F9',
                            color: pt.scanCount > 0 ? '#065F46' : '#64748B',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontWeight: 700,
                            fontSize: '11px',
                          }}>
                            {pt.scanCount} Scans
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedPatientForInspect(pt)}
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                              Inspect Details
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReassignModalPatient(pt);
                                setSelectedNewDoctorId(pt.assignedDoctorId || (doctors[0]?._id ?? ''));
                              }}
                              className="btn btn-sm"
                              style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                background: '#FEF3C7',
                                color: '#92400E',
                                border: '1px solid #FDE68A',
                                fontWeight: 700,
                              }}
                            >
                              Reassign Doctor
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 4: RETINAL AI DIAGNOSTICS ARCHIVE                    */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'scans' && (
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-lg)',
          }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--remidio-navy)' }}>
                Master Retinal AI Diagnostics Repository
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                All fundus photographs graded by the ResNet-18 neural network across the network.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                className="select"
                value={scanGradeFilter}
                onChange={(e) => setScanGradeFilter(e.target.value)}
                style={{ width: '220px', fontSize: '13px' }}
              >
                <option value="ALL">All Diagnostic Grades</option>
                <option value="URGENT">⚠️ Urgent / Severe Only (Grade 3/4)</option>
                <option value="0">Grade 0: Normal / No DR</option>
                <option value="1">Grade 1: Mild NPDR</option>
                <option value="2">Grade 2: Moderate NPDR</option>
                <option value="3">Grade 3: Severe NPDR</option>
                <option value="4">Grade 4: Proliferative DR</option>
              </select>
            </div>
          </div>

          {filteredScans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-secondary)' }}>
              No retinal scans matching this filter.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', background: '#F8FAFC' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Scan Image</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Patient</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Eye</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>Attending Doctor</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>AI Prediction Grade</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)' }}>AI Confidence</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--remidio-navy)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScans.map((s) => {
                    const badge = getGradeBadge(s.drGrade);
                    return (
                      <tr key={s._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '10px 14px' }}>
                          {s.imagePath ? (
                            <img
                              src={s.imagePath.startsWith('http') ? s.imagePath : `${API_ROOT}/${s.imagePath.replace(/^\//, '')}`}
                              alt="Fundus"
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '6px',
                                objectFit: 'cover',
                                border: '1px solid var(--color-border)',
                                cursor: 'pointer',
                              }}
                              onClick={() => setSelectedScanForInspect(s)}
                            />
                          ) : (
                            <div style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '6px',
                              background: '#F1F5F9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '20px',
                            }}>
                              👁️
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--remidio-navy)' }}>
                          {s.patientName}
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 400 }}>
                            {new Date(s.scanDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{s.eye} Eye</span>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>
                          {s.doctorName || 'Clinical Specialist'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}>
                            {s.requiresUrgentReview && '🚨 '}
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                          {s.confidenceScore ? `${Math.round(s.confidenceScore * 100)}%` : 'N/A'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedScanForInspect(s)}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                          >
                            Inspect AI Scan &rarr;
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
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL: REASSIGN PATIENT DOCTOR                           */}
      {/* ════════════════════════════════════════════════════════ */}
      {reassignModalPatient && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(7, 17, 29, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--space-md)',
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: 'var(--space-xl)', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--remidio-navy)', marginTop: 0 }}>
              Reassign Patient to New Clinician
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Patient: <strong>{reassignModalPatient.fullName}</strong><br />
              Current Doctor: <strong>Dr. {reassignModalPatient.assignedDoctorName}</strong>
            </p>

            <form onSubmit={handleReassignDoctor} style={{ display: 'flex', flexDirection: 'column', marginTop: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="label">Select New Attending Doctor *</label>
                <select
                  className="input select"
                  value={selectedNewDoctorId}
                  onChange={(e) => setSelectedNewDoctorId(e.target.value)}
                  required
                >
                  {doctors.map((doc) => (
                    <option key={doc._id} value={doc._id}>
                      Dr. {doc.name} ({doc.hospitalOrClinic} — {doc.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: 'var(--space-md)' }}>
                <button
                  type="button"
                  onClick={() => setReassignModalPatient(null)}
                  className="btn btn-outline btn-md"
                  disabled={reassigning}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-cyan btn-md"
                  disabled={reassigning}
                >
                  {reassigning ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL: INSPECT PATIENT CLINICAL SUMMARY                  */}
      {/* ════════════════════════════════════════════════════════ */}
      {selectedPatientForInspect && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(7, 17, 29, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--space-md)',
        }}>
          <div className="card" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-xl)', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>👤</span>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--remidio-navy)' }}>
                    {selectedPatientForInspect.fullName}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Patient ID: {selectedPatientForInspect._id}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatientForInspect(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', fontSize: '13px', marginBottom: 'var(--space-lg)' }}>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Gender & Birth</div>
                <div style={{ fontWeight: 700, marginTop: '2px' }}>{selectedPatientForInspect.gender} &bull; {selectedPatientForInspect.dateOfBirth ? new Date(selectedPatientForInspect.dateOfBirth).toLocaleDateString() : 'N/A'}</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Attending Clinician</div>
                <div style={{ fontWeight: 700, color: '#1E40AF', marginTop: '2px' }}>Dr. {selectedPatientForInspect.assignedDoctorName}</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Diabetes Baseline</div>
                <div style={{ fontWeight: 700, marginTop: '2px' }}>{selectedPatientForInspect.diabetesType} ({selectedPatientForInspect.diabetesDurationYears} years)</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Baseline Glycemic HbA1c</div>
                <div style={{ fontWeight: 700, marginTop: '2px', color: '#D97706' }}>{selectedPatientForInspect.baselineHbA1c}%</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  const pt = selectedPatientForInspect;
                  setSelectedPatientForInspect(null);
                  navigate(`/patient/${pt._id}`);
                }}
                className="btn btn-outline btn-md"
              >
                Open Full Telemetry Portal &rarr;
              </button>
              <button
                type="button"
                onClick={() => setSelectedPatientForInspect(null)}
                className="btn btn-primary btn-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL: INSPECT SCAN AI DETAILS                           */}
      {/* ════════════════════════════════════════════════════════ */}
      {selectedScanForInspect && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(7, 17, 29, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--space-md)',
        }}>
          <div className="card" style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-xl)', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--remidio-navy)' }}>
                Retinal AI Diagnostic Evaluation
              </h3>
              <button
                type="button"
                onClick={() => setSelectedScanForInspect(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
              {selectedScanForInspect.imagePath && (
                <div style={{ flex: '1 1 240px', textAlign: 'center' }}>
                  <img
                    src={selectedScanForInspect.imagePath.startsWith('http') ? selectedScanForInspect.imagePath : `${API_ROOT}/${selectedScanForInspect.imagePath.replace(/^\//, '')}`}
                    alt="Retinal Fundus"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '260px',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-md)',
                      border: '1px solid var(--color-border)',
                    }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
                    {selectedScanForInspect.eye} Eye Fundus Photograph
                  </div>
                </div>
              )}

              <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Patient</div>
                  <div style={{ fontWeight: 800, color: 'var(--remidio-navy)' }}>{selectedScanForInspect.patientName}</div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>AI Retinopathy Diagnosis</div>
                  <div style={{ fontWeight: 800, marginTop: '2px', color: getGradeBadge(selectedScanForInspect.drGrade).color }}>
                    {selectedScanForInspect.drGradeLabel || getGradeBadge(selectedScanForInspect.drGrade).label}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    Model Confidence: <strong>{Math.round((selectedScanForInspect.confidenceScore || 0) * 100)}%</strong>
                  </div>
                </div>

                {selectedScanForInspect.clinicianNotes && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px 12px', borderRadius: 'var(--radius-sm)', color: '#92400E' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Clinical Assessment & Action</div>
                    <div style={{ marginTop: '2px', fontSize: '12px', lineHeight: 1.4 }}>{selectedScanForInspect.clinicianNotes}</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button
                type="button"
                onClick={() => setSelectedScanForInspect(null)}
                className="btn btn-primary btn-md"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
