import React, { useEffect, useRef, useState } from 'react';
import { Upload, DownloadCloud, AlertCircle, X, Loader2 } from 'lucide-react';
import { Dropzone } from '../components/ui/Dropzone';
import { ResultCard } from '../components/ui/ResultCard';
import { ProcessingOverlay } from '../components/ui/ProcessingOverlay';
import ImageWorker from '../utils/worker?worker';const getErrorMessage = (error: unknown) => (
  error instanceof Error ? error.message : 'Unknown error'
);

export const ImageCompressor: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetMaxKB, setTargetMaxKB] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [outputSizeKB, setOutputSizeKB] = useState(0);
  
  const resultRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  
  

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      if (sourceImage) URL.revokeObjectURL(sourceImage.src);
      if (workerRef.current) workerRef.current.terminate();
    };
  }, [downloadUrl, sourceImage]);

  useEffect(() => {
    if (downloadUrl && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [downloadUrl]);

  const handleFiles = (files: FileList) => {
    setIsProcessing(true);
    setError('');
    setDownloadUrl('');
    
    const file = files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG, PNG, WebP).');
      setIsProcessing(false);
      return;
    }

    setSourceFile(file);

    const processFile = async () => {
      let finalBlob: Blob = file;

      try {
        if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
          setProcessingMessage('Converting iPhone format...');
          await new Promise(resolve => setTimeout(resolve, 50));
          
          const heic2anyModule = await import('heic2any');
          const heic2any = heic2anyModule.default || heic2anyModule;
          const converted = await heic2any({ blob: file, toType: 'image/jpeg' });
          finalBlob = Array.isArray(converted) ? converted[0] : converted;
        }

        const img = new Image();
        const url = URL.createObjectURL(finalBlob);
        img.onload = () => {
          setSourceImage(img);
          setIsProcessing(false);
          setProcessingMessage('');
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          setError('Failed to load image');
          setIsProcessing(false);
          setProcessingMessage('');
        };
        img.src = url;
      } catch (e) {
        setError('Failed to load or convert image.');
        setIsProcessing(false);
        setProcessingMessage('');
      }
    };
    processFile();

  };

    const handleCompress = async () => {
    if (!sourceImage) return;
    
    setIsProcessing(true);
    setError('');
    setDownloadUrl('');
    
    let currentScale = 1.0;

    const attemptCompression = async () => {
      try {
        const bitmap = await createImageBitmap(sourceImage);
        const presetForWorker = {
          width: Math.max(10, Math.floor(sourceImage.naturalWidth * currentScale)),
          height: Math.max(10, Math.floor(sourceImage.naturalHeight * currentScale)),
          rect: {
            sx: 0,
            sy: 0,
            sw: sourceImage.naturalWidth,
            sh: sourceImage.naturalHeight
          },
          maxKB: targetMaxKB,
          minKB: 0
        };

        if (workerRef.current) workerRef.current.terminate();
        workerRef.current = new ImageWorker();
        
        workerRef.current.onmessage = (e) => {
          const data = e.data;
          if (!data.success || !data.blob) {
            if (currentScale > 0.1) {
              // Try again with smaller dimensions
              currentScale -= 0.15;
              attemptCompression();
              return;
            }
            setError(data.error || "Failed to compress image.");
            setIsProcessing(false);
            return;
          }

          if (downloadUrl) URL.revokeObjectURL(downloadUrl);
          const url = URL.createObjectURL(data.blob);
          setDownloadUrl(url);
          setOutputSizeKB(data.blob.size / 1024);
          setIsProcessing(false);
        };

        workerRef.current.onerror = () => {
          setError("Error processing image in worker.");
          setIsProcessing(false);
          setProcessingMessage('');
        };

        setProcessingMessage('Compressing...');
        await new Promise(resolve => setTimeout(resolve, 50));
        workerRef.current.postMessage({ imageBitmap: bitmap, preset: presetForWorker }, [bitmap]);
      } catch (e: unknown) {
        console.error(e);
        setError(`Compression error: ${getErrorMessage(e)}`);
        setIsProcessing(false);
      }
    };

    attemptCompression();
  };

  const clearImage = () => {
    if (sourceImage) URL.revokeObjectURL(sourceImage.src);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setSourceImage(null);
    setSourceFile(null);
    setDownloadUrl('');
    setOutputSizeKB(0);
    setError('');
  };

  const isOutputOverTarget = outputSizeKB > targetMaxKB;

  return (
    <div className="dashboard-layout">
      <ProcessingOverlay isProcessing={isProcessing} message={processingMessage || 'Processing...'} />

      {/* Left Column: Editor / Upload / Result */}
      <div className="dashboard-left" style={{ overflowY: 'auto' }}>
        {!sourceImage ? (
          <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Image Compressor
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>Reduce KB Size of your images instantly</p>
            </div>
            
            <Dropzone
              onFiles={handleFiles}
              accept="image/jpeg,image/png,image/webp,image/heic"
              title="Tap to Upload or Drop Image Here"
              subtitle="Supports JPG, PNG, WebP"
              icon={<Upload size={48} color="var(--primary)" />}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '2rem' }}>
            {error && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            {!downloadUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '600px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Original Image</h3>
                <img 
                  src={sourceImage.src} 
                  alt="Original" 
                  style={{ width: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }} 
                />
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {sourceFile?.name} <br/>
                  Original Size: {sourceFile ? (sourceFile.size / 1024).toFixed(2) : 0} KB
                </p>
              </div>
            ) : (
              <div className="result-view">
                <ResultCard
                  successMessage={isOutputOverTarget ? 'Compressed, but still above target' : 'Compressed Successfully! 🎉'}
                  downloadUrl={downloadUrl}
                  downloadFilename={`compressed-${targetMaxKB}KB.jpg`}
                  buttonText="Download Image"
                >
                  <img src={downloadUrl} alt="Compressed" style={{ maxWidth: '100%', maxHeight: '40vh', margin: '0 auto 2rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }} />
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Target Size</p>
                      <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{targetMaxKB} KB</p>
                    </div>
                    <div style={{ borderLeft: '1px solid var(--border-color)' }}></div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Output Size</p>
                      <p style={{ fontSize: '1.25rem', fontWeight: 600, color: isOutputOverTarget ? 'var(--danger)' : 'var(--success)' }}>
                        {outputSizeKB.toFixed(1)} KB
                      </p>
                    </div>
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
            <div className="card" style={{ padding: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>Compression Settings</h3>
              
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.9rem' }}>Target Maximum Size (KB)</label>
                <input 
                  type="number" 
                  value={targetMaxKB} 
                  onChange={(e) => { setTargetMaxKB(Number(e.target.value)); setDownloadUrl(''); }}
                  min={1} 
                  max={10000}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    fontSize: '1.1rem', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-color)', 
                    backgroundColor: 'var(--bg-color)' 
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {[20, 50, 100, 200, 500].map(size => (
                  <button
                    key={size}
                    className="btn-secondary"
                    style={{ 
                      padding: '0.5rem', 
                      fontSize: '0.85rem', 
                      backgroundColor: targetMaxKB === size ? 'var(--primary)' : undefined, 
                      color: targetMaxKB === size ? 'white' : undefined 
                    }}
                    onClick={() => { setTargetMaxKB(size); setDownloadUrl(''); }}
                  >
                    {size} KB
                  </button>
                ))}
              </div>
            </div>

            <div className="card controls" style={{ padding: '1rem', marginTop: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  onClick={handleCompress}
                  disabled={isProcessing}
                  className={`btn-primary ${isProcessing ? 'processing' : ''}`}
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1.1rem' }}
                >
                  {isProcessing ? (
                    <Loader2 size={20} style={{ animation: 'rotation 1s linear infinite' }} />
                  ) : (
                    <DownloadCloud size={20} />
                  )}
                  <span>{isProcessing ? 'Compressing...' : 'Compress Image'}</span>
                </button>

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
        </div>
      )}
    </div>
  );
};
