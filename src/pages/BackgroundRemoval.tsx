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
    <div className="container" style={{ maxWidth: '1000px', margin: '0 auto 4rem' }}>
      <ProcessingOverlay 
        isProcessing={isProcessing} 
        message={`${progress.action}...`}
        submessage={progress.percent > 0 && progress.percent < 100 ? `${progress.percent}%` : undefined}
      />
      <div className="card">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          AI Background Removal
        </h2>

        {!sourceImage ? (
          <Dropzone
            onFiles={handleFiles}
            accept="image/*"
            title="Upload Photo for Background Removal"
            subtitle="Perfect for Passport & Exam Photos"
            icon={<Upload size={32} color="var(--primary)" />}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px', backgroundColor: 'var(--surface-solid)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, alignSelf: 'flex-start' }}>Original Image</h3>
                  <img 
                    src={sourceImage} 
                    alt="Original" 
                    style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-color)' }} 
                  />
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    {sourceFile?.name} <br/>
                    Original Size: {sourceFile ? (sourceFile.size / 1024).toFixed(2) : 0} KB
                  </p>
                  <button 
                    onClick={clearImage}
                    className="btn-danger"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'auto' }}
                  >
                    <X size={16} />
                    Clear Image
                  </button>
                </div>
              </div>

              <div style={{ flex: '1 1 300px', backgroundColor: 'var(--surface-solid)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                {!previewUrl ? (
                  <>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>AI Action</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                      Our AI model runs 100% locally in your browser. No data is sent to any server. The first time you use it, a 30MB model will be downloaded automatically.
                    </p>
                    <button
                      onClick={removeBackground}
                      disabled={isProcessing}
                      className={`btn-primary ${isProcessing ? 'processing' : ''}`}
                      style={{ width: '100%', padding: '1rem', marginTop: 'auto' }}
                    >
                      <Eraser size={20} />
                      <span>Remove Background</span>
                    </button>
                  </>
                ) : (
                  <>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Background Options</h3>
                    <div style={{ textAlign: 'center', flex: 1, marginBottom: '1rem', background: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 2 2\'><rect width=\'1\' height=\'1\' fill=\'%23e5e7eb\'/><rect x=\'1\' y=\'1\' width=\'1\' height=\'1\' fill=\'%23e5e7eb\'/></svg>")', backgroundSize: '20px 20px', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border-color)' }}>
                      <img src={previewUrl} alt="Processed" style={{ maxWidth: '100%', maxHeight: '200px' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                      <button 
                        onClick={() => setBgColor('transparent')}
                        style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: `2px solid ${bgColor === 'transparent' ? 'var(--primary)' : 'var(--border-color)'}`, background: 'var(--surface-solid)', cursor: 'pointer', fontWeight: 500 }}
                      >
                        Transparent
                      </button>
                      <button 
                        onClick={() => setBgColor('#ffffff')}
                        style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: `2px solid ${bgColor === '#ffffff' ? 'var(--primary)' : 'var(--border-color)'}`, background: '#ffffff', color: '#000', cursor: 'pointer', fontWeight: 500 }}
                      >
                        White
                      </button>
                      <button 
                        onClick={() => setBgColor('#3b82f6')}
                        style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: `2px solid ${bgColor === '#3b82f6' ? 'var(--primary)' : 'var(--border-color)'}`, background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 500 }}
                      >
                        Blue
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {previewUrl && (
              <ResultCard
                successMessage="Background Removed Successfully! 🎉"
                downloadUrl={previewUrl}
                downloadFilename={`bg-removed-${Date.now()}.${bgColor === 'transparent' ? 'png' : 'jpg'}`}
                buttonText="Download Image"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
