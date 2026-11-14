/**
 * components/patient/ProgressionChart.jsx
 *
 * A multi-line Chart.js chart visualising a patient's glucose readings
 * and blood pressure over time.
 *
 * Chart.js Tree-shaking:
 *   We import only the specific Chart.js components we use and register them
 *   manually. This keeps the bundle smaller than importing the full library.
 *
 * Data flow:
 *   The parent (PatientDashboard) passes `logs` as a prop — an array of
 *   DailyHealthLog documents sorted ascending by logDate.
 *   This component is purely presentational: it receives data and renders a chart.
 *
 * Clinical reference lines:
 *   Horizontal annotation lines at the diabetic thresholds (126 fasting,
 *   200 post-meal) help the clinician quickly assess control quality.
 *   We draw these as datasets (dashed lines) since the annotation plugin
 *   requires an extra dependency.
 */

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register only what we use — mandatory in Chart.js v4
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ── Clinical Threshold Constants ──────────────────────────────
const FASTING_DIABETIC_THRESHOLD    = 126; // mg/dL
const POSTMEAL_DIABETIC_THRESHOLD   = 200; // mg/dL
const SYSTOLIC_HYPERTENSION_STAGE2  = 140; // mmHg

// ── Chart Configuration Factory ───────────────────────────────
function buildChartOptions(title, yLabel, yMin, yMax, thresholdValue) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',    // Show tooltip for all datasets at the hovered x position
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Inter', size: 12 },
          usePointStyle: true,
          pointStyleWidth: 10,
          boxHeight: 8,
        },
      },
      title: {
        display: true,
        text: title,
        font: { family: 'Inter', size: 14, weight: '600' },
        color: '#1A202C',
        padding: { bottom: 16 },
      },
      tooltip: {
        callbacks: {
          // Show the clinical interpretation alongside the raw number
          afterLabel: (ctx) => {
            if (!thresholdValue) return '';
            if (ctx.dataset.label?.includes('Threshold')) return '';
            const v = ctx.parsed.y;
            if (v >= thresholdValue) return '⚠ Above diabetic threshold';
            return '';
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: {
          font: { family: 'Inter', size: 11 },
          color: '#718096',
          maxTicksLimit: 10,
        },
      },
      y: {
        min: yMin,
        max: yMax,
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: {
          font: { family: 'Inter', size: 11 },
          color: '#718096',
        },
        title: {
          display: true,
          text: yLabel,
          font: { family: 'Inter', size: 11 },
          color: '#718096',
        },
      },
    },
  };
}

// ── Component ────────────────────────────────────────────────
export default function ProgressionChart({ logs = [] }) {
  // ── Derived chart data (memoised to avoid recompute on every render) ──
  const { labels, glucoseData, bpData } = useMemo(() => {
    // Sort logs chronologically (oldest first)
    const sorted = [...logs].sort((a, b) => new Date(a.logDate) - new Date(b.logDate));

    const labels = sorted.map((log) =>
      new Date(log.logDate).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      })
    );

    const fasting    = sorted.map((l) => l.fastingGlucose   ?? null);
    const postMeal   = sorted.map((l) => l.postMealGlucose  ?? null);
    const random     = sorted.map((l) => l.randomGlucose    ?? null);
    const systolic   = sorted.map((l) => l.bloodPressureSystolic  ?? null);
    const diastolic  = sorted.map((l) => l.bloodPressureDiastolic ?? null);

    // Threshold reference lines (constant value for every x label)
    const fastingThreshold  = sorted.map(() => FASTING_DIABETIC_THRESHOLD);
    const postMealThreshold = sorted.map(() => POSTMEAL_DIABETIC_THRESHOLD);
    const bpThreshold       = sorted.map(() => SYSTOLIC_HYPERTENSION_STAGE2);

    return {
      labels,
      glucoseData: { fasting, postMeal, random, fastingThreshold, postMealThreshold },
      bpData: { systolic, diastolic, bpThreshold },
    };
  }, [logs]);

  // ── MOCK DATA — shown when no real logs exist yet ─────────
  const haslogs = logs.length > 0;

  const mockLabels = ['Nov 1','Nov 2','Nov 3','Nov 4','Nov 5','Nov 6','Nov 7',
                      'Nov 8','Nov 9','Nov 10','Nov 11','Nov 12','Nov 13','Nov 14'];

  const displayLabels     = haslogs ? labels : mockLabels;
  const mockFasting       = [128,132,118,145,138,122,130,125,115,142,136,120,128,131];
  const mockPostMeal      = [185,195,172,210,205,180,190,185,165,215,200,175,195,188];
  const mockSystolic      = [130,135,128,142,138,132,136,130,125,140,137,129,133,136];
  const mockDiastolic     = [82,86,80,90,88,83,87,82,78,91,88,80,84,87];
  const thresholdArr      = displayLabels.map(() => FASTING_DIABETIC_THRESHOLD);
  const postThresholdArr  = displayLabels.map(() => POSTMEAL_DIABETIC_THRESHOLD);
  const bpThresholdArr    = displayLabels.map(() => SYSTOLIC_HYPERTENSION_STAGE2);

  // ── Chart Datasets ────────────────────────────────────────
  const glucoseChartData = {
    labels: displayLabels,
    datasets: [
      {
        label: 'Fasting Glucose (mg/dL)',
        data: haslogs ? glucoseData.fasting : mockFasting,
        borderColor: '#3182CE',
        backgroundColor: 'rgba(49,130,206,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        spanGaps: true,
      },
      {
        label: 'Post-Meal Glucose (mg/dL)',
        data: haslogs ? glucoseData.postMeal : mockPostMeal,
        borderColor: '#E53E3E',
        backgroundColor: 'rgba(229,62,62,0.06)',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        spanGaps: true,
      },
      {
        label: `Fasting Threshold (${FASTING_DIABETIC_THRESHOLD})`,
        data: haslogs ? glucoseData.fastingThreshold : thresholdArr,
        borderColor: 'rgba(49,130,206,0.35)',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      },
      {
        label: `Post-Meal Threshold (${POSTMEAL_DIABETIC_THRESHOLD})`,
        data: haslogs ? glucoseData.postMealThreshold : postThresholdArr,
        borderColor: 'rgba(229,62,62,0.35)',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const bpChartData = {
    labels: displayLabels,
    datasets: [
      {
        label: 'Systolic BP (mmHg)',
        data: haslogs ? bpData.systolic : mockSystolic,
        borderColor: '#805AD5',
        backgroundColor: 'rgba(128,90,213,0.07)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        spanGaps: true,
      },
      {
        label: 'Diastolic BP (mmHg)',
        data: haslogs ? bpData.diastolic : mockDiastolic,
        borderColor: '#00A878',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        spanGaps: true,
      },
      {
        label: `Hypertension Stage 2 (${SYSTOLIC_HYPERTENSION_STAGE2} mmHg)`,
        data: haslogs ? bpData.bpThreshold : bpThresholdArr,
        borderColor: 'rgba(128,90,213,0.35)',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  return (
    <div>
      {!haslogs && (
        <div
          className="alert alert-info"
          style={{ marginBottom: 'var(--space-md)', fontSize: '12px' }}
        >
          ℹ️ Showing <strong>sample data</strong> — log your first biometric entry to see your real progression.
        </div>
      )}

      {/* Glucose Trend Chart */}
      <div style={{ height: '280px', marginBottom: 'var(--space-xl)' }}>
        <Line
          data={glucoseChartData}
          options={buildChartOptions(
            'Blood Glucose Trend',
            'mg/dL',
            60,
            280,
            FASTING_DIABETIC_THRESHOLD
          )}
        />
      </div>

      {/* Blood Pressure Trend Chart */}
      <div style={{ height: '240px' }}>
        <Line
          data={bpChartData}
          options={buildChartOptions(
            'Blood Pressure Trend',
            'mmHg',
            50,
            200,
            SYSTOLIC_HYPERTENSION_STAGE2
          )}
        />
      </div>
    </div>
  );
}
