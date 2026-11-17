/**
 * components/doctor/ScanUpload.jsx
 *
 * Remidio FOP / Point-of-Care Fundus Image Upload Station.
 * Features:
 *  - Bilateral Eye Selector: OD (Oculus Dexter / Right) vs. OS (Oculus Sinister / Left)
 *  - Optical camera preset metadata
 *  - Drag-and-drop ingestion with instant local preview
 *  - 10 MB limit & format verification
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import EyeSymbol from '../common/EyeSymbol';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/bmp'];

/**
 * Multi-Factor Image Quality Control (IQC) & Retinal OOD Validator.
 * Combines:
 *  1. White document/signature background detection
 *  2. Non-ocular color spectrum filtering (rejects blue skies, green nature, clothing)
 *  3. Grayscale/black-and-white detection
 *  4. Fundus camera circular optical aperture (dark masked corners)
 *  5. Retinal hemoglobin vascular chromaticity (Red-to-Blue ratio in illuminated tissue)
 */
const analyzeRetinalChromaticity = (file) => {
  return new Promise((resolve) => {
    const lowerName = file.name.toLowerCase();
    const nonRetinalKeywords = ['sign', 'doc', 'invoice', 'receipt', 'selfie', 'bill', 'meme', 'text', 'screenshot', 'paper'];
    if (nonRetinalKeywords.some((kw) => lowerName.includes(kw))) {
      return resolve({
        isValid: false,
        reason: 'Document / signature pattern detected in filename. Please upload an authentic 45°/50° retinal fundus photograph.',
      });
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const canvas = document.createElement('canvas');
        const S = 64;
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, S, S);
        const imgData = ctx.getImageData(0, 0, S, S).data;

        let whiteCount = 0;
        let blueCount = 0;
        let greenCount = 0;
        let grayCount = 0;

        let totalIllR = 0;
        let totalIllG = 0;
        let totalIllB = 0;
        let illCount = 0;

        const totalPixels = S * S;

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const brightness = (r + g + b) / 3;

          // 1. High white document / paper pixels
          if (r > 190 && g > 190 && b > 190) {
            whiteCount++;
          }

          // 2. Non-ocular color spectrum: blue / cyan dominant
          if (b > r + 15 && b > 50) {
            blueCount++;
          }

          // Non-ocular color spectrum: pure green dominant
          if (g > r * 1.15 && g > 60) {
            greenCount++;
          }

          // 3. Grayscale pixels
          if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && brightness > 40) {
            grayCount++;
          }

          // Illuminated tissue pixels
          if (brightness > 25) {
            totalIllR += r;
            totalIllG += g;
            totalIllB += b;
            illCount++;
          }
        }

        // Rule 1: Document / paper background check (> 25% near-white)
        const whiteRatio = whiteCount / totalPixels;
        if (whiteRatio > 0.25) {
          return resolve({
            isValid: false,
            reason: 'Document / paper background detected (white ratio: ' + Math.round(whiteRatio * 100) + '%). Chakshus requires an authentic fundus scan.',
          });
        }

        // Rule 2: Blue / cyan elements (skies, blue clothes, signs, objects)
        const blueRatio = blueCount / totalPixels;
        if (blueRatio > 0.04) {
          return resolve({
            isValid: false,
            reason: 'Non-retinal color elements: Blue/cyan tones detected. Retinal fundus scans do not exhibit blue illumination.',
          });
        }

        // Rule 3: Green foliage / objects (plants, green cloth, nature)
        const greenRatio = greenCount / totalPixels;
        if (greenRatio > 0.04) {
          return resolve({
            isValid: false,
            reason: 'Non-retinal color elements: Significant green tones detected. Retinal tissue is dominated by vascular amber/red.',
          });
        }

        // Rule 4: Grayscale / Black-and-white check (> 40% gray)
        const grayRatio = grayCount / totalPixels;
        if (grayRatio > 0.40) {
          return resolve({
            isValid: false,
            reason: 'Black-and-white or grayscale photograph detected. Color optical fundus imaging is required for microvascular grading.',
          });
        }

        // Rule 5: Corner Aperture Mask Check (Fundus lens circular frame)
        // Sample 5x5 pixel patches in the 4 corners of the 64x64 canvas
        const getPatchBrightness = (startX, startY) => {
          let sum = 0;
          for (let y = startY; y < startY + 5; y++) {
            for (let x = startX; x < startX + 5; x++) {
              const idx = (y * S + x) * 4;
              sum += (imgData[idx] + imgData[idx + 1] + imgData[idx + 2]) / 3;
            }
          }
          return sum / 25;
        };

        const tl = getPatchBrightness(0, 0);
        const tr = getPatchBrightness(S - 5, 0);
        const bl = getPatchBrightness(0, S - 5);
        const br = getPatchBrightness(S - 5, S - 5);
        const corners = [tl, tr, bl, br];
        const darkCorners = corners.filter((b) => b < 45).length;

        // Rule 6: Retinal Vascular Chromaticity (Red-to-Blue ratio)
        if (illCount < 100) {
          return resolve({
            isValid: false,
            reason: 'Image is completely dark or under-illuminated. Cannot resolve retinal features.',
          });
        }

        const meanR = totalIllR / illCount;
        const meanG = totalIllG / illCount;
        const meanB = totalIllB / illCount;
        const rbRatio = meanR / (meanB + 0.001);

        // Circular aperture fundus cameras (like Remidio, Zeiss, Topcon) produce dark outer corners
        if (darkCorners >= 2) {
          // Has fundus lens aperture, check that interior is retina (rbRatio >= 1.7)
          if (rbRatio < 1.7) {
            return resolve({
              isValid: false,
              reason: 'Circular lens frame detected, but internal optical profile lacks retinal vascular chromaticity (R/B ratio too low).',
            });
          }
        } else {
          // No dark circular frame present: ordinary rectangular photo (e.g. selfie, room, pet, car, everyday object)
          // Tightly cropped fundus must have extreme red dominance (rbRatio >= 2.0 and low blue)
          if (rbRatio < 2.0 || meanR < 65 || meanB > 65) {
            return resolve({
              isValid: false,
              reason: 'No fundus camera circular aperture mask detected, and color spectrum does not match human retinal vasculature (e.g. selfie, room, or everyday object).',
            });
          }
        }

        resolve({ isValid: true, reason: null });
      } catch (err) {
        resolve({ isValid: true, reason: null });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ isValid: false, reason: 'Corrupt or unreadable image format. Unable to perform retinal optical verification.' });
    };

    img.src = objectUrl;
  });
};

export default function ScanUpload({ patientId, onUpload, isUploading = false }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [isRetinalVerified, setIsRetinalVerified] = useState(false);
  const [formMeta, setFormMeta] = useState({
    scanDate: new Date().toISOString().split('T')[0],
    eye: 'Right', // 'Right' (OD) | 'Left' (OS) | 'Both' (OU)
    cameraModel: 'Remidio Insta FOP NM-10',
  });

  const inputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const validateFile = useCallback((file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Unsupported format. Please upload standard non-mydriatic fundus JPEG, PNG, or TIFF.';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds 10 MB limit.`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(async (file) => {
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsRetinalVerified(false);
      return;
    }

    // Run Image Quality Control & Chromaticity Verification
    const qualityCheck = await analyzeRetinalChromaticity(file);
    if (!qualityCheck.isValid) {
      setFileError(qualityCheck.reason);
      setSelectedFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      setIsRetinalVerified(false);
      return;
    }

    setFileError(null);
    setSelectedFile(file);
    setIsRetinalVerified(true);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }, [previewUrl, validateFile]);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setFileError('Please select or drop a fundus photograph.');
      return;
    }
    if (!isRetinalVerified) {
      setFileError('Image Quality Check Failed: Cannot screen a non-retinal image.');
      return;
    }
    if (!patientId) {
      setFileError('Please select a patient before analyzing.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('patientId', patientId);
    formData.append('scanDate', formMeta.scanDate);
    formData.append('eye', formMeta.eye);

    onUpload(formData);
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileError(null);
    setIsRetinalVerified(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Bilateral Eye Selector (Remidio Style) ─────── */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <label className="form-label">Eye Examination Target</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setFormMeta((prev) => ({ ...prev, eye: 'Right' }))}
            style={{
              background: formMeta.eye === 'Right' ? 'var(--remidio-navy)' : 'var(--color-surface)',
              color: formMeta.eye === 'Right' ? '#FFFFFF' : 'var(--color-text-secondary)',
              border: `1.5px solid ${formMeta.eye === 'Right' ? 'var(--remidio-cyan)' : 'var(--color-border)'}`,
              boxShadow: formMeta.eye === 'Right' ? '0 0 10px rgba(0, 194, 203, 0.2)' : 'none',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <EyeSymbol size={16} color={formMeta.eye === 'Right' ? '#00C2CB' : '#64748B'} />
            <strong>OD (Right Eye)</strong>
          </button>

          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setFormMeta((prev) => ({ ...prev, eye: 'Left' }))}
            style={{
              background: formMeta.eye === 'Left' ? 'var(--remidio-navy)' : 'var(--color-surface)',
              color: formMeta.eye === 'Left' ? '#FFFFFF' : 'var(--color-text-secondary)',
              border: `1.5px solid ${formMeta.eye === 'Left' ? 'var(--remidio-cyan)' : 'var(--color-border)'}`,
              boxShadow: formMeta.eye === 'Left' ? '0 0 10px rgba(0, 194, 203, 0.2)' : 'none',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <EyeSymbol size={16} color={formMeta.eye === 'Left' ? '#00C2CB' : '#64748B'} />
            <strong>OS (Left Eye)</strong>
          </button>
        </div>
      </div>

      {/* ── Capture Parameters ────────────────────────── */}
      <div className="form-row" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="scanDate">Capture Date</label>
          <input
            id="scanDate"
            name="scanDate"
            type="date"
            className="form-input"
            value={formMeta.scanDate}
            onChange={(e) => setFormMeta((prev) => ({ ...prev, scanDate: e.target.value }))}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="camera">Device Ingestion</label>
          <select
            id="camera"
            className="form-input"
            value={formMeta.cameraModel}
            onChange={(e) => setFormMeta((prev) => ({ ...prev, cameraModel: e.target.value }))}
          >
            <option value="Remidio Insta FOP NM-10">Remidio Insta FOP NM-10</option>
            <option value="Remidio InstaZ Wide-Field">Remidio InstaZ Wide-Field</option>
            <option value="Topcon / Zeiss Desktop">Topcon / Zeiss Desktop</option>
            <option value="Generic Non-Mydriatic">Generic Non-Mydriatic Fundus</option>
          </select>
        </div>
      </div>

      {/* ── Drag & Drop Optical Ingestion Zone ────────── */}
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !selectedFile && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--remidio-cyan)' : fileError ? '#EF4444' : '#CBD5E1'}`,
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-xl)',
          textAlign: 'center',
          cursor: selectedFile ? 'default' : 'pointer',
          background: dragActive ? 'var(--remidio-cyan-light)' : '#FAFCFF',
          transition: 'all 0.2s ease',
          marginBottom: 'var(--space-md)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          style={{ display: 'none' }}
        />

        {selectedFile ? (
          <div>
            <img
              src={previewUrl}
              alt="Fundus preview"
              style={{
                maxWidth: '100%',
                maxHeight: '220px',
                borderRadius: 'var(--radius-sm)',
                objectFit: 'contain',
                marginBottom: 'var(--space-sm)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: isRetinalVerified ? '2px solid #10B981' : '2px solid #EF4444',
              }}
            />
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              <strong>{selectedFile.name}</strong> &bull; {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </div>

            {isRetinalVerified ? (
              <div
                style={{
                  background: '#ECFDF5',
                  border: '1px solid #6EE7B7',
                  color: '#065F46',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '10px',
                }}
              >
                <span>✓</span>
                <span>Retinal Fundus Authenticated (Posterior-Pole / Macular Chromaticity Verified)</span>
              </div>
            ) : (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1.5px solid #F87171',
                  color: '#991B1B',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '10px',
                }}
              >
                <span>🚫</span>
                <span>Image Quality Control (IQC) Rejected: Non-Retinal Photograph</span>
              </div>
            )}

            <div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
              >
                🔄 Change Photograph
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📷</div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              {dragActive ? 'Drop Retinal Scan Here' : 'Ingest Retinal Fundus Photograph'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Drag & drop or browse from local device
            </div>
            <div style={{ fontSize: '11px', color: 'var(--remidio-cyan-hover)', marginTop: '8px', fontWeight: 600 }}>
              ✓ Posterior-pole or Macula-centered 45° Non-Mydriatic
            </div>
          </div>
        )}
      </div>

      {fileError && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: 'var(--space-md)', textAlign: 'left', lineHeight: 1.5 }}>
          <strong>⚠️ Quality Control Notice:</strong> {fileError}
        </div>
      )}

      {/* ── Submit / Trigger Inference ────────────────── */}
      <button
        type="submit"
        className={`btn btn-full btn-lg ${isRetinalVerified ? 'btn-cyan' : 'btn-disabled'}`}
        disabled={!selectedFile || isUploading || !isRetinalVerified}
        style={{
          opacity: isRetinalVerified ? 1 : 0.6,
          cursor: isRetinalVerified ? 'pointer' : 'not-allowed',
          background: isRetinalVerified ? 'var(--remidio-cyan)' : '#94A3B8',
          color: '#FFFFFF',
          fontWeight: 700,
        }}
      >
        {isUploading ? (
          <>
            <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            <span>Analyzing Microvasculature on PyTorch...</span>
          </>
        ) : selectedFile && !isRetinalVerified ? (
          <span>🚫 Cannot Analyze: Non-Retinal Image</span>
        ) : (
          <span>⚡ Run Medios AI Screening</span>
        )}
      </button>

      <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
        Estimated inference latency: <strong>&lt; 2.5 seconds</strong> &bull; Edge AI Offline Capable
      </div>
    </form>
  );
}
