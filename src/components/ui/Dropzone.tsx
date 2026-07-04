import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface DropzoneProps {
  onFiles: (files: FileList) => void;
  accept: string;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  multiple?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFiles,
  accept,
  title = 'Tap to Upload or Drop File Here',
  subtitle = 'Supports various formats',
  icon = <Upload size={32} color="var(--primary)" />,
  multiple = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFiles(e.dataTransfer.files);
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
        onChange={(e) => e.target.files && onFiles(e.target.files)} 
        accept={accept} 
        multiple={multiple}
        style={{ display: 'none' }} 
      />
      <div className="upload-icon-container" style={{ width: '64px', height: '64px', margin: '0 auto 1rem', backgroundColor: 'var(--bg-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
    </div>
  );
};
