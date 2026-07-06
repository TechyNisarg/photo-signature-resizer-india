import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileDown, Eraser, Loader2, RefreshCw } from 'lucide-react';
import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';
import type { Config } from '@imgly/background-removal';

export function BackgroundRemoval() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ action: string, percent: number }>({ action: '', percent: 0 });
  const [bgColor, setBgColor] = useState<string>('transparent');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // When the processed blob or background color changes, update the preview URL
    if (!processedBlob) {
      setPreviewUrl(null);
      return;
    }

    if (bgColor === 'transparent') {
      const url = URL.createObjectURL(processedBlob);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      // Draw onto canvas with background color
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

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
      // Allow React to paint the loading UI before intensive WASM initialization
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

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div className="hero-section" style={{ marginBottom: '2rem' }}>
        <h1>AI Background Removal</h1>
        <p className="subtitle" style={{ maxWidth: '600px', margin: '0 auto' }}>Perfect for Passport & Exam Photos. Runs 100% locally in your browser.</p>
      </div>

      <div className="content-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        {!sourceImage ? (
          <div 
            className="dropzone"
            onClick={() => fileInputRef.current?.click()}
            style={{ marginBottom: '2rem' }}
          >
            <Upload size={48} className="dropzone-icon" />
            <h3>Click to upload a photo</h3>
            <p>We recommend selfies with good lighting</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <div className="panel" style={{ padding: '2rem' }}>
            
            {!processedBlob && !isProcessing && (
              <div style={{ textAlign: 'center' }}>
                <img src={sourceImage} alt="Original" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', marginBottom: '1.5rem' }} />
                <button 
                  className="btn btn-primary" 
                  onClick={removeBackground}
                  style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
                >
                  <Eraser size={20} />
                  Remove Background Automatically
                </button>
                <button 
                  onClick={() => setSourceImage(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', marginTop: '1rem', cursor: 'pointer' }}
                >
                  Cancel and try another photo
                </button>
              </div>
            )}

            {isProcessing && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <Loader2 size={48} className="spinner" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                <h3 style={{ marginBottom: '0.5rem' }}>{progress.action}...</h3>
                {progress.percent > 0 && progress.percent < 100 && (
                  <p style={{ color: 'var(--text-secondary)' }}>{progress.percent}%</p>
                )}
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                  The first time you use this tool, it downloads a 30MB AI model to your browser. Future uses will be instant.
                </p>
              </div>
            )}

            {previewUrl && !isProcessing && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '2rem', background: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 2 2\'><rect width=\'1\' height=\'1\' fill=\'%23e5e7eb\'/><rect x=\'1\' y=\'1\' width=\'1\' height=\'1\' fill=\'%23e5e7eb\'/></svg>")', backgroundSize: '20px 20px', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border-color)' }}>
                  <img src={previewUrl} alt="Processed" style={{ maxWidth: '100%', maxHeight: '400px' }} />
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Background Color</p>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => setBgColor('transparent')}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: `2px solid ${bgColor === 'transparent' ? 'var(--primary)' : 'var(--border-color)'}`, background: 'var(--surface-solid)', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Transparent
                    </button>
                    <button 
                      onClick={() => setBgColor('#ffffff')}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: `2px solid ${bgColor === '#ffffff' ? 'var(--primary)' : 'var(--border-color)'}`, background: '#ffffff', color: '#000', cursor: 'pointer', fontWeight: 500 }}
                    >
                      White
                    </button>
                    <button 
                      onClick={() => setBgColor('#3b82f6')}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: `2px solid ${bgColor === '#3b82f6' ? 'var(--primary)' : 'var(--border-color)'}`, background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Blue
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = previewUrl;
                      a.download = `bg-removed-${Date.now()}.${bgColor === 'transparent' ? 'png' : 'jpg'}`;
                      a.click();
                    }}
                    style={{ flex: 2, padding: '1rem' }}
                  >
                    <FileDown size={20} />
                    Download Image
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setSourceImage(null);
                      setProcessedBlob(null);
                      setPreviewUrl(null);
                    }}
                    style={{ flex: 1, padding: '1rem' }}
                  >
                    <RefreshCw size={20} />
                    New Image
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
