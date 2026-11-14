/**
 * components/doctor/RiskScoreCard.jsx
 *
 * Displays the AI-predicted Diabetic Retinopathy grade for a clinical scan.
 * This is the primary output component that a doctor sees after uploading
 * a fundus photograph.
 *
 * Visual design:
 *  - Large, bold grade number for instant recognition
 *  - Color-coded severity strip (green → red scale)
 *  - Confidence score with a visual progress bar
 *  - Grade probability distribution (from ML model's softmax output)
 *  - Urgency flag banner for Grade ≥ 3 or low confidence
 *  - Clinical action recommendation text per grade
 */

import React from 'react';

// ── DR Grade Metadata ─────────────────────────────────────────
const GRADE_META = {
  0: {
    label:       'No DR',
    color:       'var(--color-grade-0)',
    bgColor:     '#F0FFF4',
    borderColor: '#9AE6B4',
    emoji:       '✅',
    recommendation: 'No diabetic retinopathy detected. Continue routine annual screening.',
  },
  1: {
    label:       'Mild NPDR',
    color:       'var(--color-grade-1)',
    bgColor:     '#E6FFED',
    borderColor: '#9AE6B4',
    emoji:       '🟢',
    recommendation: 'Mild non-proliferative changes. Optimise glycaemic and blood pressure control. Re-screen in 12 months.',
  },
  2: {
    label:       'Moderate NPDR',
    color:       'var(--color-grade-2)',
    bgColor:     '#FFFBEB',
    borderColor: '#FBBF24',
    emoji:       '🟡',
    recommendation: 'Moderate changes present. Refer to ophthalmologist. Re-screen in 6 months.',
  },
  3: {
    label:       'Severe NPDR',
    color:       'var(--color-grade-3)',
    bgColor:     '#FFF5ED',
    borderColor: '#FBD38D',
    emoji:       '🟠',
    recommendation: 'Severe NPDR with high risk of progression. Urgent ophthalmology referral required. Consider PRP laser.',
  },
  4: {
    label:       'Proliferative DR',
    color:       'var(--color-grade-4)',
    bgColor:     '#FFF5F5',
    borderColor: '#FEB2B2',
    emoji:       '🔴',
    recommendation: 'Proliferative DR detected. URGENT surgical consultation required. High risk of vision loss.',
  },
};

// ── Probability Bar ───────────────────────────────────────────
function ProbabilityBar({ grade, probability, isActive }) {
  const meta = GRADE_META[grade];
  const pct  = Math.round((probability || 0) * 100);

  return (
    <div style={{ marginBottom: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ fontSize: '11px', fontWeight: isActive ? 700 : 400, color: isActive ? meta.color : 'var(--color-text-muted)' }}>
          {meta.emoji} Grade {grade} — {meta.label}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: meta.color }}>{pct}%</span>
      </div>
      <div style={{ background: '#EDF2F7', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: meta.color,
            borderRadius: '999px',
            transition: 'width 0.8s ease',
            opacity: isActive ? 1 : 0.5,
          }}
        />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function RiskScoreCard({ scan }) {
  if (!scan) {
    return (
      <div
        className="card"
        style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-muted)' }}
      >
        <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>🔬</div>
        <p style={{ fontWeight: 500 }}>No scan result yet</p>
        <p className="text-sm">Upload a fundus photograph to see the AI analysis</p>
      </div>
    );
  }

  // Handle the pending state (image uploaded but not yet graded)
  if (scan.gradingSource === 'pending' || scan.drGrade === null) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <div className="spinner-overlay">
          <div className="spinner" style={{ width: 48, height: 48 }} />
        </div>
        <p style={{ fontWeight: 600, marginTop: 'var(--space-md)' }}>Awaiting AI Analysis</p>
        <p className="text-muted text-sm">The ML service is processing the image...</p>
      </div>
    );
  }

  const grade  = scan.drGrade;
  const meta   = GRADE_META[grade];
  const conf   = scan.confidenceScore ? Math.round(scan.confidenceScore * 100) : null;
  const probs  = scan.gradeProbabilities || [];
  const isUrgent = scan.requiresUrgentReview;

  return (
    <div className="card" style={{ border: `1.5px solid ${meta.borderColor}` }}>

      {/* ── Urgency Banner ────────────────────────────── */}
      {isUrgent && (
        <div style={{
          background: grade === 4 ? '#FED7D7' : '#FEEBC8',
          color:      grade === 4 ? '#742A2A' : '#7B341E',
          padding:    '10px 16px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 'var(--space-md)',
          fontWeight: 600,
          fontSize:   'var(--font-size-sm)',
          display:    'flex',
          alignItems: 'center',
          gap:        '8px',
        }}>
          🚨 Urgent Clinical Review Required
          {conf !== null && conf < 65 && ' — Low model confidence'}
        </div>
      )}

      {/* ── Grade Display ─────────────────────────────── */}
      <div style={{
        background:   meta.bgColor,
        border:       `1px solid ${meta.borderColor}`,
        borderRadius: 'var(--radius-md)',
        padding:      'var(--space-lg)',
        textAlign:    'center',
        marginBottom: 'var(--space-lg)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '4px' }}>{meta.emoji}</div>
        <div style={{ fontSize: '72px', fontWeight: 800, color: meta.color, lineHeight: 1 }}>
          {grade}
        </div>
        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: meta.color, marginTop: '4px' }}>
          {meta.label}
        </div>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Graded by {scan.gradingSource === 'ai' ? '🤖 AI Model' : '👨‍⚕️ Clinician'}
          {scan.gradedAt && ` on ${new Date(scan.gradedAt).toLocaleDateString('en-IN')}`}
        </div>
      </div>

      {/* ── Confidence Score ──────────────────────────── */}
      {conf !== null && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Model Confidence</span>
            <span style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 700,
              color: conf >= 80 ? 'var(--color-success)' : conf >= 65 ? 'var(--color-warning)' : 'var(--color-danger)',
            }}>
              {conf}%
              {conf < 65 && ' ⚠ Low — human review recommended'}
            </span>
          </div>
          <div style={{ background: '#EDF2F7', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
            <div style={{
              width: `${conf}%`,
              height: '100%',
              background: conf >= 80 ? 'var(--color-success)' : conf >= 65 ? 'var(--color-warning)' : 'var(--color-danger)',
              borderRadius: '999px',
              transition: 'width 1s ease',
            }} />
          </div>
        </div>
      )}

      {/* ── Grade Probability Distribution ───────────── */}
      {probs.length === 5 && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
            Grade Probability Distribution
          </p>
          {[0,1,2,3,4].map((g) => (
            <ProbabilityBar
              key={g}
              grade={g}
              probability={probs[g]}
              isActive={g === grade}
            />
          ))}
        </div>
      )}

      {/* ── Clinical Recommendation ───────────────────── */}
      <div style={{
        background: meta.bgColor,
        border:     `1px solid ${meta.borderColor}`,
        borderRadius: 'var(--radius-sm)',
        padding:    'var(--space-md)',
      }}>
        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '4px', color: meta.color }}>
          🩺 Clinical Recommendation
        </p>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          {meta.recommendation}
        </p>
      </div>

      {/* ── Scan Metadata ─────────────────────────────── */}
      <div style={{
        marginTop:  'var(--space-md)',
        paddingTop: 'var(--space-md)',
        borderTop:  '1px solid var(--color-border-light)',
        display:    'grid',
        gridTemplateColumns: '1fr 1fr',
        gap:        'var(--space-sm)',
        fontSize:   'var(--font-size-xs)',
        color:      'var(--color-text-muted)',
      }}>
        <span>📅 Scan Date: {scan.scanDate ? new Date(scan.scanDate).toLocaleDateString('en-IN') : '—'}</span>
        <span>👁 Eye: {scan.eye || '—'}</span>
        {scan.originalFileName && <span style={{ gridColumn: '1/-1' }}>📁 File: {scan.originalFileName}</span>}
      </div>
    </div>
  );
}
