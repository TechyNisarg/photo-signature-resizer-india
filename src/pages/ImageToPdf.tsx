import React, { useState, useRef } from 'react';
import { Upload, FileDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface UploadedImage {
  id: string;
  file: File;
  url: string;
}

export function ImageToPdf() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newImages: UploadedImage[] = [];
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        newImages.push({
          id: Math.random().toString(36).substring(7),
          file,
          url: URL.createObjectURL(file)
        });
      }
    });
    setImages(prev => [...prev, ...newImages]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    setImages(newImages);
  };

  const moveDown = (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    setImages(newImages);
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    URL.revokeObjectURL(newImages[index].url);
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const loadImageDimensions = (url: string): Promise<{ width: number, height: number, img: HTMLImageElement }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height, img });
      img.onerror = reject;
      img.src = url;
    });
  };

  const convertToPdf = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);

    try {
      let pdf: jsPDF | null = null;

      for (let i = 0; i < images.length; i++) {
        const { width, height, img } = await loadImageDimensions(images[i].url);
        const format = [width, height];
        const orientation = width > height ? 'l' : 'p';

        if (i === 0) {
          pdf = new jsPDF({ orientation, unit: 'px', format });
        } else {
          pdf!.addPage(format, orientation);
        }

        const imgType = images[i].file.type === 'image/png' ? 'PNG' : 'JPEG';
        pdf!.addImage(img, imgType, 0, 0, width, height);
      }

      pdf!.save('converted.pdf');
    } catch (err) {
      console.error(err);
      alert('Error converting to PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div className="hero-section" style={{ marginBottom: '2rem' }}>
        <h1>Image to PDF Converter</h1>
        <p className="subtitle" style={{ maxWidth: '600px', margin: '0 auto' }}>Combine multiple images into a single PDF document. 100% offline & secure.</p>
      </div>

      <div className="content-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div 
          className={`dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{ marginBottom: '2rem' }}
        >
          <Upload size={48} className="dropzone-icon" />
          <h3>Drag & Drop Images Here</h3>
          <p>or click to browse</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
          />
        </div>

        {images.length > 0 && (
          <div className="panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Selected Images ({images.length})</span>
              <button 
                onClick={() => setImages([])} 
                style={{ fontSize: '0.85rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Clear All
              </button>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {images.map((img, index) => (
                <div key={img.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <img src={img.url} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ margin: 0, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.file.name}</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{(img.file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => moveUp(index)} disabled={index === 0} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-solid)', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.5 : 1 }}>
                      <ArrowUp size={16} />
                    </button>
                    <button onClick={() => moveDown(index)} disabled={index === images.length - 1} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-solid)', cursor: index === images.length - 1 ? 'not-allowed' : 'pointer', opacity: index === images.length - 1 ? 0.5 : 1 }}>
                      <ArrowDown size={16} />
                    </button>
                    <button onClick={() => removeImage(index)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--danger)', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', cursor: 'pointer' }}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              className="btn btn-primary" 
              onClick={convertToPdf} 
              disabled={isProcessing}
              style={{ width: '100%', marginTop: '1.5rem', padding: '1rem' }}
            >
              {isProcessing ? 'Generating PDF...' : (
                <>
                  <FileDown size={20} />
                  Download PDF
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
