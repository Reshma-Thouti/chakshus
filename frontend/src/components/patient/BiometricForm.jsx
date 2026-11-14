/**
 * components/patient/BiometricForm.jsx
 *
 * A controlled form for submitting daily biometric readings.
 *
 * Key design decisions:
 *  - Controlled inputs (useState) so we always have a single source of truth
 *    for form data. No uncontrolled refs.
 *  - Client-side range validation with real clinical thresholds gives
 *    immediate feedback before hitting the server.
 *  - The form calls the `onSubmit` prop callback — it does NOT call the API
 *    directly. The parent page component manages API calls and error state.
 *    This keeps the form purely presentational and easily testable.
 *  - `logDate` defaults to today but is editable so doctors can backfill.
 */

import React, { useState } from 'react';

// ── Clinical Reference Ranges ─────────────────────────────────
// Used for inline validation warnings shown to users
const RANGES = {
  fastingGlucose:          { warn: 100, danger: 126,  max: 600,  unit: 'mg/dL' },
  postMealGlucose:         { warn: 140, danger: 200,  max: 800,  unit: 'mg/dL' },
  randomGlucose:           { warn: 140, danger: 200,  max: 800,  unit: 'mg/dL' },
  bloodPressureSystolic:   { warn: 130, danger: 140,  max: 300,  unit: 'mmHg'  },
  bloodPressureDiastolic:  { warn: 80,  danger: 90,   max: 200,  unit: 'mmHg'  },
};

function getGlucoseStatus(field, value) {
  if (!value) return null;
  const v = Number(value);
  const r = RANGES[field];
  if (!r) return null;
  if (v >= r.danger) return 'danger';
  if (v >= r.warn)   return 'warn';
  return 'normal';
}

const statusColors = {
  normal: 'var(--color-glucose-normal)',
  warn:   'var(--color-glucose-elevated)',
  danger: 'var(--color-glucose-high)',
};

const statusLabels = {
  fastingGlucose: {
    normal: '< 100 mg/dL — Normal',
    warn:   '100–125 mg/dL — Pre-diabetic range',
    danger: '≥ 126 mg/dL — Diabetic range',
  },
  postMealGlucose: {
    normal: '< 140 mg/dL — Normal',
    warn:   '140–199 mg/dL — Pre-diabetic range',
    danger: '≥ 200 mg/dL — Diabetic range',
  },
  bloodPressureSystolic: {
    normal: '< 130 mmHg — Normal',
    warn:   '130–139 mmHg — Stage 1 HTN',
    danger: '≥ 140 mmHg — Stage 2 HTN',
  },
};

// ── Form Initial State ────────────────────────────────────────
const getTodayString = () => new Date().toISOString().split('T')[0];

const INITIAL_FORM = {
  logDate:                getTodayString(),
  fastingGlucose:         '',
  postMealGlucose:        '',
  randomGlucose:          '',
  bloodPressureSystolic:  '',
  bloodPressureDiastolic: '',
  weightKg:               '',
  heartRateBpm:           '',
  notes:                  '',
  entrySource:            'manual',
};

// ── Component ────────────────────────────────────────────────
export default function BiometricForm({ onSubmit, isSubmitting = false }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});

  // ── Controlled Input Handler ──────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear individual field error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // ── Client-side Validation ────────────────────────────────
  const validate = () => {
    const errs = {};

    if (!form.logDate) errs.logDate = 'Date is required';

    // At least one glucose reading must be provided
    const hasGlucose = form.fastingGlucose || form.postMealGlucose || form.randomGlucose;
    if (!hasGlucose) {
      errs.fastingGlucose = 'At least one glucose reading is required';
    }

    // Numeric range checks
    const numericFields = [
      { key: 'fastingGlucose',        min: 20,  max: 600  },
      { key: 'postMealGlucose',       min: 20,  max: 800  },
      { key: 'randomGlucose',         min: 20,  max: 800  },
      { key: 'bloodPressureSystolic', min: 60,  max: 300  },
      { key: 'bloodPressureDiastolic',min: 30,  max: 200  },
      { key: 'weightKg',              min: 20,  max: 300  },
      { key: 'heartRateBpm',          min: 30,  max: 250  },
    ];

    numericFields.forEach(({ key, min, max }) => {
      if (form[key] !== '') {
        const v = Number(form[key]);
        if (isNaN(v))       errs[key] = 'Must be a number';
        else if (v < min)   errs[key] = `Minimum value is ${min}`;
        else if (v > max)   errs[key] = `Maximum value is ${max} — please verify`;
      }
    });

    // Both BP fields required if either is provided
    const hasSys = form.bloodPressureSystolic !== '';
    const hasDia = form.bloodPressureDiastolic !== '';
    if (hasSys && !hasDia) errs.bloodPressureDiastolic = 'Diastolic required if systolic is entered';
    if (hasDia && !hasSys) errs.bloodPressureSystolic  = 'Systolic required if diastolic is entered';

    return errs;
  };

  // ── Submit Handler ────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    // Build clean payload — only include non-empty fields
    const payload = { logDate: form.logDate, entrySource: form.entrySource };
    const numericKeys = [
      'fastingGlucose','postMealGlucose','randomGlucose',
      'bloodPressureSystolic','bloodPressureDiastolic','weightKg','heartRateBpm',
    ];
    numericKeys.forEach((key) => {
      if (form[key] !== '') payload[key] = Number(form[key]);
    });
    if (form.notes.trim()) payload.notes = form.notes.trim();

    // Delegate API call to parent
    onSubmit(payload);
    setForm(INITIAL_FORM); // Reset after successful parent callback
  };

  // ── Inline status indicator ───────────────────────────────
  const StatusHint = ({ field }) => {
    const status = getGlucoseStatus(field, form[field]);
    if (!status || !statusLabels[field]) return null;
    return (
      <small style={{ color: statusColors[status], fontSize: '11px', fontWeight: 500, marginTop: 2 }}>
        {status === 'normal' ? '✓' : status === 'warn' ? '⚠' : '⚠'} {statusLabels[field][status]}
      </small>
    );
  };

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* ── Log Date ─────────────────────────────────── */}
      <div className="form-group">
        <label className="form-label" htmlFor="logDate">Log Date</label>
        <input
          id="logDate"
          name="logDate"
          type="date"
          className="form-input"
          value={form.logDate}
          onChange={handleChange}
          max={getTodayString()}
        />
        {errors.logDate && <small style={{ color: 'var(--color-danger)' }}>{errors.logDate}</small>}
      </div>

      {/* ── Glucose Readings ──────────────────────────── */}
      <fieldset style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px' }}>
        <legend style={{ padding: '0 8px', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          🩸 Glucose Readings (mg/dL)
        </legend>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="fastingGlucose">
              Fasting Glucose <span className="unit">(after 8h fast)</span>
            </label>
            <input
              id="fastingGlucose"
              name="fastingGlucose"
              type="number"
              className="form-input"
              placeholder="e.g. 95"
              value={form.fastingGlucose}
              onChange={handleChange}
              min="20" max="600"
            />
            <StatusHint field="fastingGlucose" />
            {errors.fastingGlucose && <small style={{ color: 'var(--color-danger)' }}>{errors.fastingGlucose}</small>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="postMealGlucose">
              Post-Meal Glucose <span className="unit">(2h after meal)</span>
            </label>
            <input
              id="postMealGlucose"
              name="postMealGlucose"
              type="number"
              className="form-input"
              placeholder="e.g. 140"
              value={form.postMealGlucose}
              onChange={handleChange}
              min="20" max="800"
            />
            <StatusHint field="postMealGlucose" />
            {errors.postMealGlucose && <small style={{ color: 'var(--color-danger)' }}>{errors.postMealGlucose}</small>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="randomGlucose">
            Random Glucose <span className="unit">(any time)</span>
          </label>
          <input
            id="randomGlucose"
            name="randomGlucose"
            type="number"
            className="form-input"
            placeholder="e.g. 160 (optional)"
            value={form.randomGlucose}
            onChange={handleChange}
            min="20" max="800"
          />
        </div>
      </fieldset>

      {/* ── Blood Pressure ────────────────────────────── */}
      <fieldset style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px' }}>
        <legend style={{ padding: '0 8px', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          💓 Blood Pressure (mmHg)
        </legend>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="bloodPressureSystolic">
              Systolic <span className="unit">(upper)</span>
            </label>
            <input
              id="bloodPressureSystolic"
              name="bloodPressureSystolic"
              type="number"
              className="form-input"
              placeholder="e.g. 120"
              value={form.bloodPressureSystolic}
              onChange={handleChange}
              min="60" max="300"
            />
            <StatusHint field="bloodPressureSystolic" />
            {errors.bloodPressureSystolic && <small style={{ color: 'var(--color-danger)' }}>{errors.bloodPressureSystolic}</small>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bloodPressureDiastolic">
              Diastolic <span className="unit">(lower)</span>
            </label>
            <input
              id="bloodPressureDiastolic"
              name="bloodPressureDiastolic"
              type="number"
              className="form-input"
              placeholder="e.g. 80"
              value={form.bloodPressureDiastolic}
              onChange={handleChange}
              min="30" max="200"
            />
            {errors.bloodPressureDiastolic && <small style={{ color: 'var(--color-danger)' }}>{errors.bloodPressureDiastolic}</small>}
          </div>
        </div>
      </fieldset>

      {/* ── Additional Metrics ────────────────────────── */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="weightKg">
            Weight <span className="unit">(kg, optional)</span>
          </label>
          <input
            id="weightKg"
            name="weightKg"
            type="number"
            className="form-input"
            placeholder="e.g. 72.5"
            value={form.weightKg}
            onChange={handleChange}
            min="20" max="300" step="0.1"
          />
          {errors.weightKg && <small style={{ color: 'var(--color-danger)' }}>{errors.weightKg}</small>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="heartRateBpm">
            Heart Rate <span className="unit">(bpm, optional)</span>
          </label>
          <input
            id="heartRateBpm"
            name="heartRateBpm"
            type="number"
            className="form-input"
            placeholder="e.g. 75"
            value={form.heartRateBpm}
            onChange={handleChange}
            min="30" max="250"
          />
          {errors.heartRateBpm && <small style={{ color: 'var(--color-danger)' }}>{errors.heartRateBpm}</small>}
        </div>
      </div>

      {/* ── Notes ─────────────────────────────────────── */}
      <div className="form-group">
        <label className="form-label" htmlFor="notes">Notes <span className="unit">(optional)</span></label>
        <textarea
          id="notes"
          name="notes"
          className="form-input form-textarea"
          placeholder="e.g. Skipped breakfast, mild headache, stressful day..."
          value={form.notes}
          onChange={handleChange}
          maxLength={500}
        />
        <small className="text-muted" style={{ textAlign: 'right', display: 'block' }}>
          {form.notes.length}/500
        </small>
      </div>

      {/* ── Submit ────────────────────────────────────── */}
      <button
        type="submit"
        className="btn btn-primary btn-full btn-lg"
        disabled={isSubmitting}
      >
        {isSubmitting ? '⏳ Saving...' : '💾 Save Today\'s Log'}
      </button>
    </form>
  );
}
