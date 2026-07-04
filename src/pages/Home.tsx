import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dropzone } from '../components/ui/Dropzone';
import { ImagePreview } from '../components/ImagePreview';
import { PresetSelector } from '../components/PresetSelector';
import { LandingPage } from '../components/LandingPage';
import { useImageProcessor } from '../hooks/useImageProcessor';
import type { PresetCategory, PresetType, Preset } from '../utils/presetData';
import { getPresetByRoute, getPresetRoute, getPresetsByCategory } from '../utils/presetData';
import { SEO_CONTENT } from '../utils/seoContent';
import { Trash2, DownloadCloud, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { ResultCard } from '../components/ui/ResultCard';
import { ProcessingOverlay } from '../components/ui/ProcessingOverlay';

export const Home: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [customWidth, setCustomWidth] = useState(420);
  const [customHeight, setCustomHeight] = useState(525);
  const [customMaxKB, setCustomMaxKB] = useState(20);

  const [overlayName, setOverlayName] = useState('');
  const [overlayDate, setOverlayDate] = useState('');

  const routePreset = getPresetByRoute(location.pathname);
  const category = routePreset?.category || 'rto';
  const type = routePreset?.type || 'photo';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleCategorySelect = (cat: PresetCategory) => {
    const newType = cat === 'custom' ? 'custom' : 'photo';
    updateUrl(cat, newType);
  };

  const handleTypeSelect = (t: PresetType) => {
    updateUrl(category, t);
  };

  const updateUrl = (cat: PresetCategory, t: PresetType) => {
    navigate(getPresetRoute(cat, t));
  };

  const availablePresets = getPresetsByCategory(category);
  const activePresetBase = availablePresets.find(p => p.type === type) || availablePresets[0];

  const activePreset: Preset = category === 'custom' 
    ? { ...activePresetBase, width: customWidth, height: customHeight, maxKB: customMaxKB }
    : activePresetBase;

  const availableTypes = availablePresets.map(p => ({
    type: p.type,
    label: p.type === 'photo' ? 'Photo' : p.type === 'signature' ? 'Signature' : p.type === 'thumb' ? 'Thumb Impression' : p.type === 'handwritten' ? 'Declaration' : p.type === 'postcard' ? 'Postcard Photo' : 'Custom'
  }));

  const {
    sourceImage, sourceObjectURL, loadImage, clearImage, processImage: _processImage,
    isProcessing, processingMessage, error, crop, setCrop, zoom, setZoom, onCropComplete,
    downloadObjectURL, sourceSizeKB, finalSizeKB
  } = useImageProcessor();

  const handleFiles = (files: FileList) => {
    if (files.length > 0) {
      loadImage(files[0], ({ width, height }) => {
        if (category === 'custom') {
          setCustomWidth(width);
          setCustomHeight(height);
        }
      });
    }
  };

  const processImage = () => {
    _processImage(activePreset, overlayName, overlayDate);
  };

  const instructions = activePreset?.instructions || [];

  const isOutputSpec = (inst: string) => {
    const lowercaseInst = inst.toLowerCase();
    return (
      lowercaseInst.startsWith('width:') ||
      lowercaseInst.startsWith('height:') ||
      lowercaseInst.startsWith('dimensions:') ||
      lowercaseInst.startsWith('min dimensions:') ||
      lowercaseInst.startsWith('aspect ratio:') ||
      lowercaseInst.startsWith('final output size:') ||
      lowercaseInst.includes('px') ||
      lowercaseInst.includes('kb') ||
      lowercaseInst.includes('cm') ||
      lowercaseInst.includes('mm') ||
      lowercaseInst.includes('inch')
    );
  };

  const userRequirements = category === 'custom'
    ? ['Upload any image of your choice', 'Manually adjust the crop box to frame the image']
    : instructions.filter(inst => !isOutputSpec(inst));

  const outputSpecs = category === 'custom'
    ? [
        `Width: ${customWidth}px`,
        `Height: ${customHeight}px`,
        `Final Output Size: Max ${customMaxKB}KB`
      ]
    : instructions.filter(inst => isOutputSpec(inst));

  if (location.pathname === '/') {
    return <LandingPage />;
  }

  return (
    <div className="dashboard-layout">
      <ProcessingOverlay isProcessing={isProcessing} message={processingMessage || 'Processing...'} />

      {/* Left Column: Editor / Upload / Result */}
      <div className="dashboard-left">
        {!sourceImage ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ textAlign: 'left' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {activePreset?.buttonText || "Resize Image"}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Upload your file below to get started</p>
              </div>
              
              <Dropzone 
                onFiles={handleFiles} 
                accept="image/jpeg, image/png, image/webp" 
                title="Tap to Upload or Drop Image Here"
                subtitle="Supports JPG, PNG, WebP"
                icon={<ImageIcon size={48} color="var(--primary)" />}
              />
            </div>

            {SEO_CONTENT[category] && (
              <div className="seo-text" style={{ color: 'var(--text-secondary)', textAlign: 'left', padding: '0' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>{SEO_CONTENT[category].title}</h2>
                {SEO_CONTENT[category].content.map((paragraph, idx) => (
                  <p key={idx} style={{ fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1rem' }}>
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : downloadObjectURL ? (
          <div className="result-view">
            <ResultCard
              successMessage="Success! 🎉"
              downloadUrl={downloadObjectURL}
              downloadFilename={`${activePreset?.filename || 'resized'}-${finalSizeKB.toFixed(2)}KB.jpg`}
              buttonText="Download Image"
            >
              <img src={downloadObjectURL} alt="Resized" style={{ maxWidth: '100%', maxHeight: '40vh', margin: '0 auto 2rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }} />
              <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ color: 'var(--text-secondary)' }}>Original Size</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{sourceSizeKB.toFixed(2)} KB</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-secondary)' }}>Compressed Size</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success)' }}>{finalSizeKB.toFixed(2)} KB</p>
                </div>
              </div>
            </ResultCard>
          </div>
        ) : (
          <ImagePreview 
            imageSrc={sourceObjectURL}
            crop={crop}
            zoom={zoom}
            aspect={activePreset.width / activePreset.height}
            hasFaceGuide={activePreset.hasFaceGuide}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        )}
      </div>

      {/* Right Column: Sidebar */}
      <div className="dashboard-sidebar">
        <div className="dashboard-sidebar-content">
          <PresetSelector 
            currentCategory={category} 
            onCategorySelect={handleCategorySelect}
            currentType={type}
            onTypeSelect={handleTypeSelect}
            availableTypes={availableTypes}
          />

          {category === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Output Specifications (Manual)</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Width (px)
                  <input type="number" value={customWidth} onChange={e => setCustomWidth(Number(e.target.value) || 1)} style={{ width: '100px', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', minHeight: 'auto' }} />
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Height (px)
                  <input type="number" value={customHeight} onChange={e => setCustomHeight(Number(e.target.value) || 1)} style={{ width: '100px', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', minHeight: 'auto' }} />
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Max Size (KB)
                  <input type="number" value={customMaxKB} onChange={e => setCustomMaxKB(Number(e.target.value) || 1)} style={{ width: '100px', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', minHeight: 'auto' }} />
                </label>
              </div>
            </div>
          )}

          {userRequirements.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Requirements</h2>
              <ul style={{ listStyleType: 'none', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                {userRequirements.map((inst, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{inst}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {category !== 'custom' && outputSpecs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Output Specifications</h2>
              <ul style={{ listStyleType: 'none', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                {outputSpecs.map((inst, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{inst}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sourceImage && (
            <div className="controls" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!downloadObjectURL && activePreset?.hasOverlayOption && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="input-group">
                    <label style={{ fontSize: '0.9rem' }}>Name on Photo (Optional)</label>
                    <input 
                      type="text" 
                      value={overlayName} 
                      onChange={(e) => setOverlayName(e.target.value)} 
                      placeholder="YOUR NAME" 
                      style={{ textTransform: 'uppercase', minHeight: '40px' }}
                    />
                  </div>
                  <div className="input-group">
                    <label style={{ fontSize: '0.9rem' }}>Date of Photo (Optional)</label>
                    <input 
                      type="text" 
                      value={overlayDate} 
                      onChange={(e) => setOverlayDate(e.target.value)} 
                      placeholder="DD/MM/YYYY" 
                      style={{ minHeight: '40px' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {!downloadObjectURL && (
                  <button 
                    className={`btn-primary ${isProcessing ? 'processing' : ''}`}
                    onClick={processImage}
                    disabled={isProcessing}
                    style={{ padding: '0.75rem', fontSize: '1.1rem' }}
                  >
                    <DownloadCloud size={20} />
                    <span>{activePreset?.buttonText || 'Resize'}</span>
                  </button>
                )}

                <button className="btn-danger" onClick={clearImage} title="Clear Image" style={{ padding: '0.75rem', fontSize: '1.1rem' }}>
                  <Trash2 size={20} />
                  <span>Clear Image</span>
                </button>
              </div>
            </div>
          )}

          {error && <div className="error-toast">{error}</div>}
        </div>
      </div>
    </div>
  );
};
