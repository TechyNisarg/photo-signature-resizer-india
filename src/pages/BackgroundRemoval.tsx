import { useState, useEffect } from 'react';
import { Upload, Eraser, X } from 'lucide-react';
import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';
import type { Config } from '@imgly/background-removal';
import { Dropzone } from '../components/ui/Dropzone';
import { ResultCard } from '../components/ui/ResultCard';
import { ProcessingOverlay } from '../components/ui/ProcessingOverlay';

export function BackgroundRemoval() {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ action: string, percent: number }>({ action: '', percent: 0 });
  const [bgColor, setBgColor] = useState<string>('transparent');

  useEffect(() => {
    if (!processedBlob) {
      setPreviewUrl(null);
      return;
    }

    if (bgColor === 'transparent') {
      const url = URL.createObjectURL(processedBlob);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      const img = new Image();
      const url = URL.createObjectURL(processedBlob);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const newUrl = URL.createObjectURL(blob);
              setPreviewUrl(newUrl);
            }
          }, 'image/png');
        }
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  }, [processedBlob, bgColor]);

  const handleFiles = (files: FileList) => {
    const file = files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setSourceFile(file);
    const url = URL.createObjectURL(file);
    setSourceImage(url);
    setProcessedBlob(null);
    setPreviewUrl(null);
  };

  const removeBackground = async () => {
    if (!sourceImage) return;
    
    setIsProcessing(true);
    setProgress({ action: 'Initializing Model', percent: 0 });

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const config: Config = {
        publicPath: window.location.origin + '/models/bg-removal/',
        proxyToWorker: true,
        progress: (key, current, total) => {
          const actionText = key.includes('wasm') ? 'Downloading Engine' : 'Downloading AI Model';
          setProgress({
            action: actionText,
            percent: Math.round((current / total) * 100) || 0
          });
        }
      };

      setProgress({ action: 'Processing Image', percent: 100 });
      const blob = await imglyRemoveBackground(sourceImage, config);
      setProcessedBlob(blob);
      setBgColor('transparent');
    } catch (err: any) {
      console.error(err);
      alert('Failed to remove background: ' + (err.message || JSON.stringify(err)));
    } finally {
      setIsProcessing(false);
      setProgress({ action: '', percent: 0 });
    }
  };

  const clearImage = () => {
    if (sourceImage) URL.revokeObjectURL(sourceImage);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSourceImage(null);
    setSourceFile(null);
    setProcessedBlob(null);
    setPreviewUrl(null);
  };

  return (
    <div className="dashboard-layout">
      <ProcessingOverlay 
        isProcessing={isProcessing} 
        message={`${progress.action}...`}
        submessage={progress.percent > 0 && progress.percent < 100 ? `${progress.percent}%` : undefined}
      />
      
      {/* Left Column */}
      <div className="dashboard-left">
        {!sourceImage ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ textAlign: 'left' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  AI Background Removal
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Perfect for Passport & Exam Photos</p>
              </div>
              
              <Dropzone
                onFiles={handleFiles}
                accept="image/*"
                title="Upload Photo for Background Removal"
                subtitle="Automatically remove backgrounds using local AI"
                icon={<Upload size={48} color="var(--primary)" />}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '2rem' }}>
            {!previewUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '600px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Original Image</h3>
                <img 
                  src={sourceImage} 
                  alt="Original" 
                  style={{ width: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }} 
                />
              </div>
            ) : (
              <div className="result-view">
                <ResultCard
                  successMessage="Background Removed Successfully! 🎉"
                  downloadUrl={previewUrl}
                  downloadFilename={`bg-removed-${Date.now()}.${bgColor === 'transparent' ? 'png' : 'jpg'}`}
                  buttonText="Download Image"
                >
                  <div style={{ textAlign: 'center', width: '100%', marginBottom: '2rem', background: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 2 2\'><rect width=\'1\' height=\'1\' fill=\'%23e5e7eb\'/><rect x=\'1\' y=\'1\' width=\'1\' height=\'1\' fill=\'%23e5e7eb\'/></svg>")', backgroundSize: '20px 20px', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border-color)' }}>
                    <img src={previewUrl} alt="Processed" style={{ maxWidth: '100%', maxHeight: '40vh', objectFit: 'contain' }} />
                  </div>
                </ResultCard>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Sidebar */}
      {sourceImage && (
        <div className="dashboard-sidebar">
          <div className="dashboard-sidebar-content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>File Information</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <strong>Name:</strong> {sourceFile?.name}
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <strong>Original Size:</strong> {sourceFile ? (sourceFile.size / 1024).toFixed(2) : 0} KB
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {!previewUrl ? (
                <>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>AI Action</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Our AI model runs 100% locally in your browser. No data is sent to any server. The first time you use it, a 30MB model will be downloaded automatically.
                  </p>
                  <button
                    onClick={removeBackground}
                    disabled={isProcessing}
                    className={`btn-primary ${isProcessing ? 'processing' : ''}`}
                    style={{ width: '100%', padding: '0.75rem', fontSize: '1.1rem', marginTop: '0.5rem' }}
                  >
                    <Eraser size={20} />
                    <span>Remove Background</span>
                  </button>
                </>
              ) : (
                <>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Background Options</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button 
                      onClick={() => setBgColor('transparent')}
                      style={{ padding: '0.75rem', borderRadius: '8px', border: `2px solid ${bgColor === 'transparent' ? 'var(--primary)' : 'var(--border-color)'}`, background: 'var(--surface-solid)', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Transparent (PNG)
                    </button>
                    <button 
                      onClick={() => setBgColor('#ffffff')}
                      style={{ padding: '0.75rem', borderRadius: '8px', border: `2px solid ${bgColor === '#ffffff' ? 'var(--primary)' : 'var(--border-color)'}`, background: '#ffffff', color: '#000', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Solid White (JPG)
                    </button>
                    <button 
                      onClick={() => setBgColor('#3b82f6')}
                      style={{ padding: '0.75rem', borderRadius: '8px', border: `2px solid ${bgColor === '#3b82f6' ? 'var(--primary)' : 'var(--border-color)'}`, background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Solid Blue (JPG)
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="controls" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button 
                onClick={clearImage}
                className="btn-danger"
                style={{ width: '100%', padding: '0.75rem', fontSize: '1.1rem' }}
              >
                <X size={20} />
                <span>Clear Image</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
