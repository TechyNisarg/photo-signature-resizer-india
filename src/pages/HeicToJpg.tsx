import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, X, Image as ImageIcon } from 'lucide-react';
import { Dropzone } from '../components/ui/Dropzone';
import { ResultCard } from '../components/ui/ResultCard';
import { ProcessingOverlay } from '../components/ui/ProcessingOverlay';
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
    <div className="dashboard-layout">
      <ProcessingOverlay isProcessing={isProcessing} message={processingMessage || 'Processing...'} />
      
      {/* Left Column: Upload / Result */}
      <div className="dashboard-left">
        {!sourceImage ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ textAlign: 'left' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  HEIC to JPG Converter
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Instantly convert iPhone photos to universally accepted JPG format</p>
              </div>
              
              <Dropzone
                onFiles={handleFiles}
                accept=".heic,.heif,image/heic,image/heif"
                title="Upload iPhone Photo (.heic)"
                subtitle="Instantly convert to universally accepted JPG format"
                icon={<ImageIcon size={48} color="var(--primary)" />}
              />
            </div>
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
                  successMessage="Converted Successfully! 🎉"
                  downloadUrl={downloadUrl}
                  downloadFilename={`${sourceFile?.name.replace(/\.heic|\.heif/i, '') || 'converted'}.jpg`}
                  buttonText="Download JPG"
                >
                  <img src={downloadUrl} alt="Converted JPG" style={{ maxWidth: '100%', maxHeight: '40vh', margin: '0 auto 2rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }} />
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
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
};
