import React, { useEffect, useRef, useState } from 'react';
import { Upload, Lock, Unlock, AlertCircle, FileText, X } from 'lucide-react';
import { isEncrypted } from '@pdfsmaller/pdf-decrypt';
import { Dropzone } from '../components/ui/Dropzone';
import { ResultCard } from '../components/ui/ResultCard';
import { ProcessingOverlay } from '../components/ui/ProcessingOverlay';

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
  const [outputName, setOutputName] = useState('');
  
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
    <div className="container" style={{ maxWidth: '1000px', margin: '0 auto 4rem' }}>
      <ProcessingOverlay isProcessing={isProcessing} message="Processing PDF..." />

      <div className="card">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          {mode === 'unlock' ? <Unlock size={32} /> : <Lock size={32} />} 
          PDF {mode === 'unlock' ? 'Unlocker' : 'Protector'}
        </h2>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <div className="preset-selector" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '2rem' }}>
          <div className="pills-container" style={{ display: 'inline-flex', background: 'var(--surface-solid)', padding: '0.35rem', borderRadius: '12px', border: '1px solid var(--border-color)', gap: '0.25rem' }}>
            <button
              onClick={() => { setMode('unlock'); setFile(null); setDownloadUrl(''); setPassword(''); }}
              className={`pill-btn ${mode === 'unlock' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Unlock size={16} /> <span>Unlock PDF</span>
            </button>
            <button
              onClick={() => { setMode('protect'); setFile(null); setDownloadUrl(''); setPassword(''); }}
              className={`pill-btn ${mode === 'protect' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Lock size={16} /> <span>Protect PDF</span>
            </button>
          </div>
        </div>

        {!file ? (
          <Dropzone
            onFiles={handleFiles}
            accept="application/pdf"
            title="Tap to Upload or Drop PDF Here"
            subtitle={`Select the PDF you want to ${mode}`}
            icon={<Upload size={32} color="var(--primary)" />}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              
              <div style={{ flex: '1 1 300px', backgroundColor: 'var(--surface-solid)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', height: '100%' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, alignSelf: 'flex-start' }}>Original Document</h3>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <FileText size={64} color="var(--primary)" opacity={0.8} />
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{file.name}</strong> <br/>
                      Size: {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button 
                    onClick={() => { setFile(null); setDownloadUrl(''); setPassword(''); }}
                    className="btn-danger"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'auto' }}
                  >
                    <X size={16} />
                    Clear File
                  </button>
                </div>
              </div>

              <div style={{ flex: '1 1 300px', backgroundColor: 'var(--surface-solid)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Security Settings</h3>
                
                <div style={{ marginBottom: '2rem' }}>
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
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-color)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                    disabled={isProcessing}
                  />
                  {mode === 'unlock' ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      Required to decrypt the file locally on your device.
                    </p>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      Make sure you remember this password!
                    </p>
                  )}
                </div>

                <button
                  onClick={handleProcess}
                  disabled={isProcessing || !password}
                  className={`btn-primary ${isProcessing ? 'processing' : ''}`}
                  style={{ width: '100%', padding: '1rem', marginTop: 'auto' }}
                >
                  {mode === 'unlock' ? <Unlock size={20} /> : <Lock size={20} />}
                  <span>{mode === 'unlock' ? 'Unlock PDF' : 'Protect PDF'}</span>
                </button>
              </div>
            </div>

            {downloadUrl && (
              <ResultCard
                successMessage={mode === 'unlock' ? 'PDF Unlocked Successfully! 🎉' : 'PDF Protected Successfully! 🎉'}
                downloadUrl={downloadUrl}
                downloadFilename={outputName}
                buttonText={`Download ${outputName}`}
              />
            )}
          </div>
        )}
      </div>

      <div className="info-grid" style={{ margin: '2rem auto 0' }}>
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
