import React, { useEffect, useRef, useState } from 'react';
import { DownloadCloud, AlertCircle, X, Loader2, Image as ImageIcon } from 'lucide-react';

const getErrorMessage = (error: unknown) => (
  error instanceof Error ? error.message : 'Unknown error'
);

export const HeicToJpg: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [outputSizeKB, setOutputSizeKB] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      if (sourceImage) URL.revokeObjectURL(sourceImage.src);
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

    if (!file.type.includes('heic') && !file.type.includes('heif') && !file.name.toLowerCase().endsWith('.heic') && !file.name.toLowerCase().endsWith('.heif')) {
      setError('Please upload a valid HEIC or HEIF image file.');
      setIsProcessing(false);
      return;
    }

    setSourceFile(file);

    const processFile = async () => {
      try {
        setProcessingMessage('Converting iPhone format...');
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const heic2anyModule = await import('heic2any');
        const heic2any = heic2anyModule.default || heic2anyModule;
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
        const finalBlob = Array.isArray(converted) ? converted[0] : converted;

        const img = new Image();
        const url = URL.createObjectURL(finalBlob);
        
        img.onload = () => {
          setSourceImage(img);
          setDownloadUrl(url);
          setOutputSizeKB(finalBlob.size / 1024);
          setIsProcessing(false);
          setProcessingMessage('');
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(url);
          setError('Failed to load converted image');
          setIsProcessing(false);
          setProcessingMessage('');
        };
        
        img.src = url;
      } catch (e) {
        setError(`Failed to convert HEIC image: ${getErrorMessage(e)}`);
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

  const clearImage = () => {
    if (sourceImage) URL.revokeObjectURL(sourceImage.src);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setSourceImage(null);
    setSourceFile(null);
    setDownloadUrl('');
    setOutputSizeKB(0);
    setError('');
  };

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
          HEIC to JPG Converter
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
              accept=".heic,.heif,image/heic,image/heif" 
              style={{ display: 'none' }} 
            />
            <div className="upload-icon-container" style={{ width: '64px', height: '64px', margin: '0 auto 1rem', backgroundColor: 'var(--bg-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={32} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Upload iPhone Photo (.heic)
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>Instantly convert to universally accepted JPG format</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ flex: '1 1 300px', maxWidth: '500px', backgroundColor: 'var(--surface-solid)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <img 
                    src={sourceImage.src} 
                    alt="Converted JPG" 
                    style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-color)' }} 
                  />
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    {sourceFile?.name} <br/>
                    Original File Size: {sourceFile ? (sourceFile.size / 1024).toFixed(2) : 0} KB
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
            </div>

            {error && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            {downloadUrl && (
              <div ref={resultRef} className="result-card" style={{ padding: '2rem', backgroundColor: 'var(--surface-solid)', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
                <h4 style={{ color: 'var(--success)', fontSize: '1.5rem', marginBottom: '1rem' }}>
                  Converted Successfully! 🎉
                </h4>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Format</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>JPG</p>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-color)' }}></div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Output Size</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success)' }}>
                      {outputSizeKB.toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <a
                  href={downloadUrl}
                  download={`${sourceFile?.name.replace(/\.heic|\.heif/i, '') || 'converted'}.jpg`}
                  className="btn-success"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: '12px', textDecoration: 'none' }}
                >
                  <DownloadCloud size={24} />
                  Download JPG
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
