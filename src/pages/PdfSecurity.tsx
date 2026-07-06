import React, { useEffect, useRef, useState } from 'react';
import { Upload, Lock, Unlock, DownloadCloud, AlertCircle, Check } from 'lucide-react';
import { isEncrypted } from '@pdfsmaller/pdf-decrypt';

type Mode = 'unlock' | 'protect';

const getErrorMessage = (error: unknown) => (
  error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error'
);

export const PdfSecurity: React.FC = () => {
  const [mode, setMode] = useState<Mode>('unlock');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [outputName, setOutputName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('../workers/pdfSecurityWorker.ts', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (event) => {
      const { success, resultBytes, error: workerError } = event.data;
      if (success) {
        const blob = new Blob([resultBytes], { type: 'application/pdf' });
        setDownloadUrl(URL.createObjectURL(blob));
        setIsProcessing(false);
      } else {
        setError(`Processing failed: ${workerError}`);
        setIsProcessing(false);
      }
    };

    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      if (workerRef.current) workerRef.current.terminate();
    };
  }, [downloadUrl]);

  const handleFiles = async (files: FileList) => {
    const selectedFile = files[0];
    if (selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf'))) {
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const { encrypted } = await isEncrypted(new Uint8Array(arrayBuffer));
        
        if (mode === 'unlock' && !encrypted) {
          setError('This PDF is not password protected. You can view it normally.');
          return;
        }
        
        if (mode === 'protect' && encrypted) {
          setError('This PDF is already password protected. Please unlock it first before protecting it again.');
          return;
        }

        setFile(selectedFile);
        setError('');
        setDownloadUrl('');
        setPassword('');
        setOutputName(
          mode === 'unlock' 
            ? selectedFile.name.replace('.pdf', '_unlocked.pdf') 
            : selectedFile.name.replace('.pdf', '_protected.pdf')
        );
      } catch (e) {
        setError('Failed to read the PDF file. It might be corrupted.');
      }
    } else {
      setError('Please select a valid PDF file.');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleProcess = async () => {
    if (!file || !password) return;
    
    setIsProcessing(true);
    setError('');
    setDownloadUrl('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const action = mode === 'unlock' ? 'decrypt' : 'encrypt';
      
      workerRef.current?.postMessage(
        { action, pdfBytes: arrayBuffer, password },
        [arrayBuffer] // transfer ownership for performance
      );
    } catch (e: unknown) {
      console.error(e);
      setError(`Error: ${getErrorMessage(e)}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="home-container" style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem' }}>
      {!file && (
        <header className="hero-section" style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {mode === 'unlock' ? <Unlock size={32} /> : <Lock size={32} />} 
            PDF {mode === 'unlock' ? 'Unlocker' : 'Protector'}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {mode === 'unlock' ? 'Remove passwords from PDFs instantly.' : 'Password-protect your PDFs securely.'}
          </p>
        </header>
      )}

      {error && (
        <div className="error-toast" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {!file ? (
        <div className="workspace">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
            <div className="preset-selector" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: 0 }}>
              <div className="pills-container" style={{ display: 'inline-flex', background: 'var(--surface-solid)', padding: '0.35rem', borderRadius: '12px', border: '1px solid var(--border-color)', gap: '0.25rem' }}>
                <button
                  onClick={() => setMode('unlock')}
                  className={`pill-btn ${mode === 'unlock' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Unlock size={16} /> <span>Unlock PDF</span>
                </button>
                <button
                  onClick={() => setMode('protect')}
                  className={`pill-btn ${mode === 'protect' ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Lock size={16} /> <span>Protect PDF</span>
                </button>
              </div>
            </div>

            <div style={{ width: '100%', maxWidth: '700px' }}>
              <div 
                className="dropzone"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                style={{ cursor: isProcessing ? 'wait' : 'pointer' }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="application/pdf"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                  style={{ display: 'none' }}
                />
                <Upload size={48} className="upload-icon" />
                <h3>Tap to Upload or Drop PDF Here</h3>
                <p>Select the PDF you want to {mode}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="workspace">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
            <div className="card" style={{ padding: '1.5rem', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{mode === 'unlock' ? 'Unlock Document' : 'Protect Document'}</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{file.name}</p>
                </div>
                <button 
                  className="btn-secondary"
                  onClick={() => { setFile(null); setDownloadUrl(''); setPassword(''); }}
                  disabled={isProcessing}
                  style={{ width: 'auto', padding: '0.5rem 1rem' }}
                >
                  Change File
                </button>
              </div>

              {!downloadUrl && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {mode === 'unlock' ? 'Current Password' : 'New Password'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && password && !isProcessing) {
                        handleProcess();
                      }
                    }}
                    placeholder={mode === 'unlock' ? "Enter the PDF password" : "Enter a strong password"}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    disabled={isProcessing}
                  />
                  {mode === 'unlock' && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      We need the password to decrypt the file locally on your device.
                    </p>
                  )}
                </div>
              )}

              {!downloadUrl ? (
                <button
                  onClick={handleProcess}
                  disabled={isProcessing || !password}
                  className={`btn-primary ${isProcessing ? 'processing' : ''}`}
                  style={{ width: '100%', padding: '1rem' }}
                >
                  {isProcessing ? (
                    <div className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'white' }}></div>
                  ) : (
                    mode === 'unlock' ? <Unlock size={20} /> : <Lock size={20} />
                  )}
                  <span>{isProcessing ? 'Processing...' : (mode === 'unlock' ? 'Unlock PDF' : 'Protect PDF')}</span>
                </button>
              ) : (
                <div className="result-card" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-solid)', borderRadius: '12px', textAlign: 'center' }}>
                  <h4 style={{ color: '#10b981', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                    {mode === 'unlock' ? 'PDF Unlocked Successfully! 🎉' : 'PDF Protected Successfully! 🎉'}
                  </h4>
                  <a
                    href={downloadUrl}
                    download={outputName}
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
                      padding: '1rem 2rem',
                      borderRadius: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      boxShadow: hasDownloaded ? '0 8px 24px rgba(16, 185, 129, 0.35)' : '0 8px 24px rgba(37,99,235,0.35)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      marginTop: '1rem',
                      maxWidth: '100%'
                    }}
                  >
                    {hasDownloaded ? <Check size={20} style={{ flexShrink: 0 }} /> : <DownloadCloud size={20} style={{ flexShrink: 0 }} />}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {hasDownloaded ? 'Downloaded!' : `Download ${outputName}`}
                    </span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="info-grid" style={{ margin: '0 auto', marginTop: file ? '2rem' : '0' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>100% Client-Side Privacy</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Unlike other online tools, we never upload your sensitive PDFs to any server. The encryption and decryption algorithms run entirely inside your browser using the native Web Crypto API.
          </p>
        </div>
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Use Cases</h2>
          <ul style={{ listStylePosition: 'inside', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>Remove passwords from Aadhaar cards for easy printing</li>
            <li>Unlock downloaded Bank Statements</li>
            <li>Secure your own private documents before sharing</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PdfSecurity;
