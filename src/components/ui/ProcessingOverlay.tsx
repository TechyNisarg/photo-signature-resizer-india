import React from 'react';
import { Loader2 } from 'lucide-react';

interface ProcessingOverlayProps {
  isProcessing: boolean;
  message?: string;
  submessage?: string;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  isProcessing,
  message = 'Processing...',
  submessage
}) => {
  if (!isProcessing) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      <Loader2 size={48} className="spinner" style={{ marginBottom: '1rem', borderTopColor: 'white' }} />
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{message}</h2>
      {submessage && (
        <p style={{ marginTop: '0.5rem', fontSize: '1rem', opacity: 0.9 }}>{submessage}</p>
      )}
    </div>
  );
};
