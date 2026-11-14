/**
 * components/doctor/ScanUpload.jsx
 *
 * Drag-and-drop + click-to-browse file upload component for fundus photographs.
 *
 * Key design decisions:
 *  - Uses a hidden <input type="file"> triggered by button/drag area click.
 *    This gives full control over the visual design without relying on the
 *    browser's default file input appearance.
 *  - Drag events are handled manually (onDragEnter, onDragOver, onDrop) for
 *    the drop zone — the visual state changes via local state.
 *  - Client-side validation: file type (image/* only) and size (max 10 MB)
 *    before the FormData is handed to the parent's onUpload callback.
 *  - Image preview uses URL.createObjectURL() for instant local preview
 *    without a server round-trip. The URL is revoked when component unmounts
 *    to prevent memory leaks.
 *  - The actual API call is in the parent (DoctorDashboard) — this component
 *    only assembles the FormData and fires the callback.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/bmp'];

export default function ScanUpload({ patientId, onUpload, isUploading = false }) {
  const [dragActive, setDragActive]   = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl]   = useState(null);
  const [fileError, setFileError]     = useState(null);
  const [formMeta, setFormMeta]       = useState({ scanDate: new Date().toISOString().split('T')[0], eye: 'Right' });

  const inputRef = useRef(null);

  // ── Cleanup object URL on unmount ─────────────────────────
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ── File Validation ───────────────────────────────────────
  const validateFile = useCallback((file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Only JPEG, PNG, TIFF, or BMP images are accepted.';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds the 10 MB limit.`;
    }
    return null;
  }, []);

  // ── File Selection Handler ────────────────────────────────
  const handleFileSelect = useCallback((file) => {
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
    // Revoke previous preview URL to free memory
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }, [previewUrl, validateFile]);

  // ── Drag Handlers ─────────────────────────────────────────
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
  const handleDragOver  = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop      = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  // ── Input Change ──────────────────────────────────────────
  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  // ── Form Meta Change ──────────────────────────────────────
  const handleMetaChange = (e) => {
    const { name, value } = e.target;
    setFormMeta((prev) => ({ ...prev, [name]: value }));
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) { setFileError('Please select a fundus image first.'); return; }
    if (!patientId)    { setFileError('No patient selected. Please select a patient first.'); return; }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('patientId',  patientId);
    formData.append('scanDate',   formMeta.scanDate);
    formData.append('eye',        formMeta.eye);

    onUpload(formData);
  };

  // ── Clear Selection ───────────────────────────────────────
  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <form onSubmit={handleSubmit}>

      {/* ── Scan Metadata ──────────────────────────────── */}
      <div className="form-row" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="scanDate">Scan Date</label>
          <input
            id="scanDate"
            name="scanDate"
            type="date"
            className="form-input"
            value={formMeta.scanDate}
            onChange={handleMetaChange}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="eye">Eye</label>
          <select id="eye" name="eye" className="form-input form-select" value={formMeta.eye} onChange={handleMetaChange}>
            <option value="Right">Right Eye (OD)</option>
            <option value="Left">Left Eye (OS)</option>
            <option value="Both">Both Eyes (OU)</option>
          </select>
        </div>
      </div>

      {/* ── Drop Zone ──────────────────────────────────── */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !selectedFile && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--color-primary)' : fileError ? 'var(--color-danger)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-xl)',
          textAlign: 'center',
          cursor: selectedFile ? 'default' : 'pointer',
          background: dragActive ? 'var(--color-primary-pale)' : 'var(--color-bg)',
          transition: 'all var(--transition-fast)',
          marginBottom: 'var(--space-md)',
          position: 'relative',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          style={{ display: 'none' }}
          aria-label="Upload fundus photograph"
        />

        {selectedFile ? (
          /* ── Preview ─────────────────────────────────── */
          <div>
            <img
              src={previewUrl}
              alt="Fundus preview"
              style={{
                maxWidth: '100%',
                maxHeight: '240px',
                borderRadius: 'var(--radius-md)',
                objectFit: 'contain',
                marginBottom: 'var(--space-md)',
                boxShadow: 'var(--shadow-md)',
              }}
            />
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-sm)' }}>
              <strong>{selectedFile.name}</strong>
              <span className="text-muted"> — {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
            >
              🗑 Remove & choose another
            </button>
          </div>
        ) : (
          /* ── Empty State ──────────────────────────────── */
          <div>
            <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>🔬</div>
            <p style={{ fontWeight: 600, marginBottom: 'var(--space-xs)', color: 'var(--color-text-primary)' }}>
              {dragActive ? 'Drop the image here' : 'Drag & drop a fundus photograph'}
            </p>
            <p className="text-muted text-sm">or click to browse</p>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 'var(--space-sm)' }}>
              Accepts: JPEG, PNG, TIFF, BMP — Max 10 MB
            </p>
          </div>
        )}
      </div>

      {/* ── Error Message ──────────────────────────────── */}
      {fileError && (
        <div className="alert alert-danger" style={{ marginBottom: 'var(--space-md)' }}>
          ❌ {fileError}
        </div>
      )}

      {/* ── Upload Button ──────────────────────────────── */}
      <button
        type="submit"
        className="btn btn-accent btn-full btn-lg"
        disabled={!selectedFile || isUploading}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      >
        {isUploading ? (
          <>
            <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            Analyzing with AI...
          </>
        ) : (
          '🤖 Analyze with AI — Get DR Grade'
        )}
      </button>

      {!patientId && (
        <p className="text-muted text-sm text-center mt-sm">
          ⚠ Select a patient above before uploading
        </p>
      )}
    </form>
  );
}
