import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dropzone } from '../components/Dropzone';
import { ImagePreview } from '../components/ImagePreview';
import { PresetSelector } from '../components/PresetSelector';
import { LandingPage } from '../components/LandingPage';
import { useImageProcessor } from '../hooks/useImageProcessor';
import type { PresetCategory, PresetType, Preset } from '../utils/presetData';
import { getPresetByRoute, getPresetRoute, getPresetsByCategory } from '../utils/presetData';
import { SEO_CONTENT } from '../utils/seoContent';
import { Trash2, DownloadCloud, Check } from 'lucide-react';

export const Home: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [customWidth, setCustomWidth] = useState(420);
  const [customHeight, setCustomHeight] = useState(525);
  const [customMaxKB, setCustomMaxKB] = useState(20);

  const [hasDownloaded, setHasDownloaded] = useState(false);
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

  const handleImageLoad = (file: File) => {
    loadImage(file, ({ width, height }) => {
      if (category === 'custom') {
        setCustomWidth(width);
        setCustomHeight(height);
      }
    });
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
    <div className="home-container">
      {!sourceImage && (
        <div className="hero-section">
          <h1>{activePreset?.buttonText || "Resize Image"}</h1>
        </div>
      )}

      <div className="workspace">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '1rem', maxWidth: '900px' }}>
          <PresetSelector 
            currentCategory={category} 
            onCategorySelect={handleCategorySelect}
            currentType={type}
            onTypeSelect={handleTypeSelect}
            availableTypes={availableTypes}
          />

          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            {!sourceImage ? (
              <div style={{ width: '100%', maxWidth: '700px' }}>
                <Dropzone onImageLoad={handleImageLoad} isProcessing={isProcessing} processingMessage={processingMessage} />
              </div>
            ) : downloadObjectURL ? (
              <div className="card result-view" style={{ width: '100%', maxWidth: '800px', textAlign: 'center', padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                <h2 style={{ color: '#10b981', fontSize: '2rem', marginBottom: '1rem' }}>Success! 🎉</h2>
                <img src={downloadObjectURL} alt="Resized" style={{ maxWidth: '100%', maxHeight: '40vh', margin: '0 auto 2rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }} />
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                   <div>
                     <p style={{ color: 'var(--text-secondary)' }}>Original Size</p>
                     <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{sourceSizeKB.toFixed(2)} KB</p>
                   </div>
                   <div>
                     <p style={{ color: 'var(--text-secondary)' }}>Compressed Size</p>
                     <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success)' }}>{finalSizeKB.toFixed(2)} KB</p>
                   </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', width: '100%', maxWidth: '500px' }}>
                  <a 
                    href={downloadObjectURL} 
                    download={`${activePreset?.filename || 'resized'}-${finalSizeKB.toFixed(2)}KB.jpg`} 
                    className="btn-primary" 
                    onClick={() => {
                      setHasDownloaded(true);
                      setTimeout(() => setHasDownloaded(false), 2500);
                    }}
                    style={{ 
                      width: '100%', 
                      textDecoration: 'none', 
                      padding: '1.25rem', 
                      fontSize: '1.2rem', 
                      borderRadius: '16px', 
                      boxShadow: hasDownloaded ? '0 8px 24px rgba(16, 185, 129, 0.35)' : '0 8px 24px rgba(37,99,235,0.35)',
                      backgroundColor: hasDownloaded ? 'var(--success)' : 'var(--primary)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    {hasDownloaded ? <Check size={28} /> : <DownloadCloud size={28} />}
                    {hasDownloaded ? 'Downloaded!' : 'Download Image'}
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', maxWidth: '800px' }}>
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
              </div>
            )}
          </div>
        </div>

        <div className="info-grid">
          {category === 'custom' && (
            <div className="card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Output Specifications (Manual)</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Width (px)
                  <input type="number" value={customWidth} onChange={e => setCustomWidth(Number(e.target.value) || 1)} style={{ width: '120px', padding: '0 0.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Height (px)
                  <input type="number" value={customHeight} onChange={e => setCustomHeight(Number(e.target.value) || 1)} style={{ width: '120px', padding: '0 0.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Max Size (KB)
                  <input type="number" value={customMaxKB} onChange={e => setCustomMaxKB(Number(e.target.value) || 1)} style={{ width: '120px', padding: '0 0.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
                </label>
              </div>
            </div>
          )}

          {!sourceImage && userRequirements.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Requirements (From You)</h2>
              <ul style={{ listStylePosition: 'inside', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {userRequirements.map((inst, idx) => (
                  <li key={idx}>{inst}</li>
                ))}
              </ul>
            </div>
          )}

          {category !== 'custom' && outputSpecs.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Output Specifications (By Tool)</h2>
              <ul style={{ listStylePosition: 'inside', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {outputSpecs.map((inst, idx) => (
                  <li key={idx}>{inst}</li>
                ))}
              </ul>
            </div>
          )}

          {sourceImage && (
            <div className="card controls">
              <div className="controls-row">
                <button className="btn-danger" onClick={clearImage} title="Clear Image">
                  <Trash2 size={20} />
                  <span>Clear Image</span>
                </button>
              </div>

              {!downloadObjectURL && activePreset?.hasOverlayOption && (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label>Name on Photo (Optional)</label>
                    <input 
                      type="text" 
                      value={overlayName} 
                      onChange={(e) => setOverlayName(e.target.value)} 
                      placeholder="YOUR NAME" 
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label>Date of Photo (Optional)</label>
                    <input 
                      type="text" 
                      value={overlayDate} 
                      onChange={(e) => setOverlayDate(e.target.value)} 
                      placeholder="DD/MM/YYYY" 
                    />
                  </div>
                </div>
              )}

              {!downloadObjectURL && (
                <button 
                  className={`btn-primary ${isProcessing ? 'processing' : ''}`}
                  onClick={processImage}
                  disabled={isProcessing}
                  style={{ marginTop: '1rem' }}
                >
                  {isProcessing ? (
                    <div className="spinner" style={{ width: '24px', height: '24px', borderTopColor: 'white' }}></div>
                  ) : (
                    <DownloadCloud size={24} />
                  )}
                  <span>{isProcessing ? 'Processing...' : activePreset?.buttonText || 'Resize'}</span>
                </button>
              )}
            </div>
          )}

          {error && <div className="error-toast">{error}</div>}
        </div>
      </div>
      
      {!sourceImage && SEO_CONTENT[category] && (
        <div className="seo-text" style={{ width: '100%', maxWidth: '700px', margin: '2rem auto 0 auto', color: 'var(--text-secondary)', textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>{SEO_CONTENT[category].title}</h2>
          {SEO_CONTENT[category].content.map((paragraph, idx) => (
            <p key={idx} style={{ fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1rem' }}>
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
