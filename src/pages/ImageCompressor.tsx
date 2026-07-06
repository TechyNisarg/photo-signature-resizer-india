import React, { useEffect, useRef, useState } from 'react';
import { Upload, DownloadCloud, Check, AlertCircle, X, Loader2 } from 'lucide-react';
import ImageWorker from '../utils/worker?worker';

const getErrorMessage = (error: unknown) => (
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
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
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
    <div className="container" style={{ maxWidth: '1000px', margin: '0 auto 4rem' }}>
      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <Loader2 size={48} className="spinner" style={{ marginBottom: '1rem', borderTopColor: 'white' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{processingMessage || 'Processing...'}</h2>
        </div>
      )}
      <div className="card">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Image Compressor (Reduce KB Size)
        </h2>

        {!sourceImage ? (
          <div 
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ 
              border: '2px dashed var(--border-color)', 
              borderRadius: '16px', 
              padding: '3rem 2rem', 
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: 'var(--surface-solid)',
              transition: 'all 0.3s ease'
            }}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => e.target.files && handleFiles(e.target.files)} 
              accept="image/jpeg,image/png,image/webp,image/heic" 
              style={{ display: 'none' }} 
            />
            <div className="upload-icon-container" style={{ width: '64px', height: '64px', margin: '0 auto 1rem', backgroundColor: 'var(--bg-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={32} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Tap to Upload or Drop Image Here
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>Supports JPG, PNG, WebP</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px', backgroundColor: 'var(--surface-solid)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, alignSelf: 'flex-start' }}>Original Image</h3>
                  <img 
                    src={sourceImage.src} 
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
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Compression Settings</h3>
                
                <div className="input-group" style={{ marginBottom: '2rem' }}>
                  <label>Target Maximum Size (KB)</label>
                  <input 
                    type="number" 
                    value={targetMaxKB} 
                    onChange={(e) => setTargetMaxKB(Number(e.target.value))}
                    min={1} 
                    max={10000}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem 1rem', 
                      fontSize: '1.2rem', 
                      borderRadius: '12px', 
                      border: '1px solid var(--border-color)', 
                      outline: 'none', 
                      backgroundColor: 'var(--bg-color)', 
                      fontFamily: 'inherit',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    We will compress the image to be as close to this size as possible without exceeding it.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '2rem' }}>
                  {[20, 50, 100, 200, 500].map(size => (
                    <button
                      key={size}
                      className="btn-secondary"
                      style={{ 
                        padding: '0.5rem', 
                        fontSize: '0.9rem', 
                        backgroundColor: targetMaxKB === size ? 'var(--primary)' : undefined, 
                        color: targetMaxKB === size ? 'white' : undefined 
                      }}
                      onClick={() => { setTargetMaxKB(size); setDownloadUrl(''); }}
                    >
                      {size} KB
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleCompress}
                  disabled={isProcessing}
                  className={`btn-primary ${isProcessing ? 'processing' : ''}`}
                  style={{ width: '100%', padding: '1rem', marginTop: 'auto' }}
                >
                  {isProcessing ? (
                    <Loader2 size={20} style={{ animation: 'rotation 1s linear infinite' }} />
                  ) : (
                    <DownloadCloud size={20} />
                  )}
                  <span>{isProcessing ? 'Compressing...' : 'Compress Image'}</span>
                </button>
              </div>
            </div>

            {error && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            {downloadUrl && (
              <div ref={resultRef} className="result-card" style={{ padding: '2rem', backgroundColor: 'var(--surface-solid)', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
                <h4 style={{ color: isOutputOverTarget ? 'var(--danger)' : 'var(--success)', fontSize: '1.5rem', marginBottom: '1rem' }}>
                  {isOutputOverTarget ? 'Compressed, but still above target' : 'Compressed Successfully! 🎉'}
                </h4>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
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

                <a
                  href={downloadUrl}
                  download={`compressed-${targetMaxKB}KB.jpg`}
                  className="btn-success"
                  onClick={() => {
                    setHasDownloaded(true);
                    setTimeout(() => setHasDownloaded(false), 2500);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    backgroundColor: hasDownloaded ? 'var(--success)' : 'var(--primary)',
                    color: 'white',
                    padding: '1.25rem 2.5rem',
                    borderRadius: '12px',
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    boxShadow: hasDownloaded ? '0 8px 24px rgba(16, 185, 129, 0.35)' : '0 8px 24px rgba(37,99,235,0.35)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    width: '100%',
                    maxWidth: '400px'
                  }}
                >
                  {hasDownloaded ? <Check size={24} /> : <DownloadCloud size={24} />}
                  {hasDownloaded ? 'Downloaded!' : 'Download Image'}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
