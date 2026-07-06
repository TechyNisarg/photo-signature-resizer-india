import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface DropzoneProps {
  onImageLoad: (file: File) => void;
  isProcessing: boolean;
  processingMessage: string;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onImageLoad,
  isProcessing,
  processingMessage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImageLoad(e.dataTransfer.files[0]);
    }
  };

  return (
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
        onChange={(e) => e.target.files && e.target.files.length > 0 && onImageLoad(e.target.files[0])} 
        accept="image/jpeg,image/png,image/webp" 
        style={{ display: 'none' }} 
      />
      <div className="upload-icon-container" style={{ width: '64px', height: '64px', margin: '0 auto 1rem', backgroundColor: 'var(--bg-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isProcessing ? (
          <div className="spinner" style={{ width: '24px', height: '24px', borderTopColor: 'var(--primary)' }}></div>
        ) : (
          <Upload size={32} color="var(--primary)" />
        )}
      </div>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
        {isProcessing ? (processingMessage || 'Processing...') : 'Tap to Upload or Drop File Here'}
      </h3>
      {!isProcessing && <p style={{ color: 'var(--text-secondary)' }}>Supports JPG, PNG, WEBP</p>}
    </div>
  );
};
