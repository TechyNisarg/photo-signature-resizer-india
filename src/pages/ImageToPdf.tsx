import { useState, useEffect } from 'react';
import { Upload, FileDown, ArrowUp, ArrowDown, X, CheckCircle2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Dropzone } from '../components/ui/Dropzone';
import { ResultCard } from '../components/ui/ResultCard';
import { ProcessingOverlay } from '../components/ui/ProcessingOverlay';

interface UploadedImage {
  id: string;
  file: File;
  url: string;
}

export function ImageToPdf() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setDownloadUrl(''); // Reset download URL on new files
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

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    setImages(newImages);
    setDownloadUrl('');
  };

  const moveDown = (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    setImages(newImages);
    setDownloadUrl('');
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    URL.revokeObjectURL(newImages[index].url);
    newImages.splice(index, 1);
    setImages(newImages);
    setDownloadUrl('');
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
    setDownloadUrl('');

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

      const blob = pdf!.output('blob');
      setDownloadUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      alert('Error converting to PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <ProcessingOverlay isProcessing={isProcessing} message="Generating PDF..." />
      
      {/* Left Column */}
      <div className="dashboard-left">
        {images.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ textAlign: 'left' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileDown size={24} /> Image to PDF Converter
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Combine multiple images into a single PDF document. 100% offline & secure.</p>
              </div>
              
              <Dropzone
                onFiles={handleFiles}
                accept="image/*"
                multiple
                title="Drag & Drop Images Here"
                subtitle="or click to browse"
                icon={<Upload size={48} className="upload-icon" color="var(--primary)" />}
              />
            </div>

            <div className="info-grid">
              <div className="card">
                <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Requirements</h2>
                <ul style={{ listStylePosition: 'inside', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <li>Upload JPG, PNG, or WebP images</li>
                  <li>Reorder images as needed</li>
                </ul>
              </div>
              <div className="card">
                <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Features</h2>
                <ul style={{ listStyleType: 'none', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>Combine multiple images into one PDF</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>Reorder images before generating</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>Choose page size and orientation</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Selected Images ({images.length})</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reorder or delete images before generating PDF.</p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', maxHeight: 'none', overflowY: 'visible' }}>
                {images.map((img, index) => (
                  <div key={img.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '0.75rem', background: 'var(--surface-solid)', gap: '0.5rem' }}>
                    <div style={{ position: 'relative', width: '100%', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                      <img src={img.url} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      <button onClick={() => removeImage(index)} style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px', borderRadius: '50%', border: 'none', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={14} />
                      </button>
                    </div>
                    
                    <div style={{ flex: 1, overflow: 'hidden', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontWeight: 500, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.file.name}</p>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{(img.file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button onClick={() => moveUp(index)} disabled={index === 0} style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.5 : 1 }}>
                        <ArrowUp size={14} />
                      </button>
                      <button onClick={() => moveDown(index)} disabled={index === images.length - 1} style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', cursor: index === images.length - 1 ? 'not-allowed' : 'pointer', opacity: index === images.length - 1 ? 0.5 : 1 }}>
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {downloadUrl && (
              <ResultCard
                successMessage="PDF Generated Successfully! 🎉"
                downloadUrl={downloadUrl}
                downloadFilename="images-converted.pdf"
                buttonText="Download PDF"
              />
            )}
          </div>
        )}
      </div>

      {/* Right Column: Sidebar */}
      {images.length > 0 && (
        <div className="dashboard-sidebar">
          <div className="dashboard-sidebar-content">
            <div className="card controls" style={{ padding: '1rem', marginTop: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  className={`btn-primary ${isProcessing ? 'processing' : ''}`}
                  onClick={convertToPdf} 
                  disabled={isProcessing || images.length === 0}
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1.1rem' }}
                >
                  {isProcessing ? (
                    <div className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'white' }}></div>
                  ) : (
                    <>
                      <FileDown size={20} />
                      <span>Generate PDF</span>
                    </>
                  )}
                </button>
                
                <button 
                  onClick={() => {
                    setImages([]);
                    setDownloadUrl('');
                  }} 
                  disabled={isProcessing}
                  className="btn-danger"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1.1rem' }}
                >
                  <X size={20} /> Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageToPdf;
