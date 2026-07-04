import React, { useState } from 'react';
import { DownloadCloud, Check } from 'lucide-react';

interface ResultCardProps {
  successMessage?: string;
  downloadUrl: string;
  downloadFilename: string;
  buttonText?: string;
  onDownload?: () => void;
  children?: React.ReactNode;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  successMessage = 'Processed Successfully! 🎉',
  downloadUrl,
  downloadFilename,
  buttonText = 'Download File',
  onDownload,
  children
}) => {
  const [hasDownloaded, setHasDownloaded] = useState(false);

  return (
    <div className="result-card" style={{ padding: '2rem', backgroundColor: 'var(--surface-solid)', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
      <h4 style={{ color: 'var(--success)', fontSize: '1.5rem', marginBottom: '1rem' }}>
        {successMessage}
      </h4>
      
      {children && (
        <div style={{ marginBottom: '2rem' }}>
          {children}
        </div>
      )}

      <a
        href={downloadUrl}
        download={downloadFilename}
        className="btn-success"
        onClick={() => {
          setHasDownloaded(true);
          if (onDownload) onDownload();
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
        {hasDownloaded ? 'Downloaded!' : buttonText}
      </a>
    </div>
  );
};
