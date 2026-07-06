import React, { useEffect, useRef, useState } from 'react';
import { Upload, FileText, DownloadCloud, Trash2, ArrowLeft, ArrowRight, X, AlertCircle, Check } from 'lucide-react';

type PageEntry = {
  id: string;
  name: string;
  thumbUrl: string;
  sourceCanvas: HTMLCanvasElement;
};

const getErrorMessage = (error: unknown) => (
  error instanceof Error ? error.message : 'Unknown error'
);

export const PdfMerger: React.FC = () => {
  const [pages, setPages] = useState<PageEntry[]>([]);
  const [targetMaxKB, setTargetMaxKB] = useState(300);
  const [progress, setProgress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [outputSizeKB, setOutputSizeKB] = useState(0);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const generateThumb = (canvas: HTMLCanvasElement): string => {
    const thumbCanvas = document.createElement('canvas');
    const targetWidth = 150;
    const scale = targetWidth / canvas.width;
    thumbCanvas.width = targetWidth;
    thumbCanvas.height = canvas.height * scale;
    
    const ctx = thumbCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    }
    return thumbCanvas.toDataURL('image/jpeg', 0.7);
  };

  const processImageFile = (file: File): Promise<PageEntry> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          const thumbUrl = generateThumb(canvas);
          URL.revokeObjectURL(url);
          resolve({
            id: crypto.randomUUID(),
            name: file.name,
            thumbUrl,
            sourceCanvas: canvas
          });
        } else {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas 2D context not available'));
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  };

  const processPdfFile = async (file: File, onProgress: (msg: string) => void): Promise<PageEntry[]> => {
    const arrayBuffer = await file.arrayBuffer();
    
    // Lazily load pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDoc = await loadingTask.promise;
    const pageEntries: PageEntry[] = [];

    try {
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        onProgress(`Rendering page ${pageNum} of ${pdfDoc.numPages}...`);
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const canvasContext = canvas.getContext('2d');
        if (!canvasContext) {
          throw new Error('Canvas 2D context not available');
        }

        await page.render({ canvas, canvasContext, viewport }).promise;
        const thumbUrl = generateThumb(canvas);

        pageEntries.push({
          id: crypto.randomUUID(),
          name: `${file.name} (Page ${pageNum})`,
          thumbUrl,
          sourceCanvas: canvas
        });
      }
    } finally {
      await loadingTask.destroy();
    }

    return pageEntries;
  };

  const handleFiles = async (files: FileList) => {
    setIsProcessing(true);
    setError('');
    setDownloadUrl('');
    
    const newPageEntries: PageEntry[] = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const entries = await processPdfFile(file, setProgress);
          newPageEntries.push(...entries);
        } else if (file.type.startsWith('image/')) {
          setProgress(`Loading ${file.name}...`);
          const entry = await processImageFile(file);
          newPageEntries.push(entry);
        } else {
          setError(`Skipped unsupported file: ${file.name}`);
        }
      }
      
      setPages(prev => [...prev, ...newPageEntries]);
    } catch (e: unknown) {
      console.error(e);
      setError(`Error importing files: ${getErrorMessage(e)}`);
    } finally {
      setIsProcessing(false);
      setProgress('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removePage = (id: string) => {
    setPages(prev => prev.filter(p => p.id !== id));
    setDownloadUrl('');
  };

  const movePage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;
    
    setPages(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
    setDownloadUrl('');
  };

  const compressToTargetSize = async (canvas: HTMLCanvasElement, targetKB: number): Promise<string> => {
    let minQ = 0.01;
    let maxQ = 1.0;
    let quality = 0.75;
    let bestDataUrl = '';
    
    for (let i = 0; i < 8; i++) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const sizeKB = (dataUrl.length * 3 / 4) / 1024;
      
      if (sizeKB <= targetKB) {
        bestDataUrl = dataUrl;
        minQ = quality;
      } else {
        maxQ = quality;
      }
      quality = (minQ + maxQ) / 2;
    }
    
    if (!bestDataUrl) {
      bestDataUrl = canvas.toDataURL('image/jpeg', 0.01);
    }
    
    return bestDataUrl;
  };

  const createPdfBlob = async (perPageKB: number): Promise<Blob> => {
      const { jsPDF } = await import('jspdf');
      
      const firstCanvas = pages[0].sourceCanvas;
      const orientation = firstCanvas.width > firstCanvas.height ? 'l' : 'p';
      const initialWidth = 210;
      const initialHeight = 210 * (firstCanvas.height / firstCanvas.width);

      const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: [initialWidth, initialHeight]
      });

      for (let i = 0; i < pages.length; i++) {
        setProgress(`Compressing page ${i + 1} of ${pages.length}...`);
        const canvas = pages[i].sourceCanvas;
        const w = canvas.width;
        const h = canvas.height;
        
        const pageWidth = 210;
        const pageHeight = 210 * (h / w);
        const pageOrientation = w > h ? 'l' : 'p';

        if (i > 0) {
          doc.addPage([pageWidth, pageHeight], pageOrientation);
        }

        const imgData = await compressToTargetSize(canvas, perPageKB);
        doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
      }

      return doc.output('blob');
  };

  const handleCompress = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);
    setError('');
    setDownloadUrl('');

    try {
      const overheadKB = 12;
      const usableKB = Math.max(targetMaxKB - overheadKB, targetMaxKB * 0.7);
      let perPageKB = (usableKB / pages.length) * 0.95;

      setProgress('Generating PDF...');
      let blob = await createPdfBlob(perPageKB);

      for (let attempt = 0; attempt < 4 && blob.size / 1024 > targetMaxKB; attempt++) {
        const outputKB = blob.size / 1024;
        const reductionRatio = Math.max(0.25, (targetMaxKB / outputKB) * 0.85);
        perPageKB *= reductionRatio;
        setProgress(`Optimizing PDF size (${attempt + 1}/4)...`);
        blob = await createPdfBlob(perPageKB);
      }

      setOutputSizeKB(blob.size / 1024);
      setDownloadUrl(URL.createObjectURL(blob));

      if (blob.size / 1024 > targetMaxKB) {
        setError(`Best effort output is ${(blob.size / 1024).toFixed(1)} KB, which is still above the ${targetMaxKB} KB target. Try fewer pages or a higher limit.`);
      }
    } catch (e: unknown) {
      console.error(e);
      setError(`Failed to compress PDF: ${getErrorMessage(e)}`);
    } finally {
      setIsProcessing(false);
      setProgress('');
    }
  };

  const isOutputOverTarget = outputSizeKB > targetMaxKB;

  return (
    <div className="home-container" style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem' }}>
      {pages.length === 0 && (
        <header className="hero-section" style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <FileText size={32} /> PDF Merger
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Combine multiple images and PDFs into a single optimized PDF file.</p>
        </header>
      )}

      {error && (
        <div className="error-toast" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {pages.length === 0 ? (
        <div className="workspace">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
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
            multiple
            accept="image/jpeg, image/png, image/webp, application/pdf"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            style={{ display: 'none' }}
          />
          <Upload size={48} className="upload-icon" />
          <h3>Tap to Upload or Drop Files Here</h3>
          <p>Supports PDFs and images (JPG, PNG, WebP)</p>
        </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="workspace">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Document Pages ({pages.length})</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reorder or delete pages before compression.</p>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button 
                  className="btn-danger" 
                  onClick={() => setPages([])}
                  disabled={isProcessing}
                  style={{ width: 'auto', padding: '0.5rem 1rem' }}
                >
                  <Trash2 size={16} /> Clear All
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  style={{ width: 'auto', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Upload size={16} /> Add Files
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/jpeg, image/png, image/webp, application/pdf"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '1.25rem',
              maxHeight: '480px',
              overflowY: 'auto',
              padding: '0.5rem',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              backgroundColor: 'var(--surface-solid)'
            }}>
              {pages.map((page, index) => (
                <div 
                  key={page.id} 
                  className="card" 
                  style={{ 
                    padding: '0.75rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    position: 'relative',
                    gap: '0.5rem',
                    backgroundColor: 'var(--surface)'
                  }}
                >
                  <button 
                    onClick={() => removePage(page.id)}
                    disabled={isProcessing}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--danger)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      minHeight: '24px',
                      minWidth: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      zIndex: 10,
                      cursor: 'pointer'
                    }}
                    title="Remove Page"
                  >
                    <X size={14} />
                  </button>

                  <div style={{
                    width: '100%',
                    height: '140px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <img 
                      src={page.thumbUrl} 
                      alt={page.name} 
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                    />
                  </div>

                  <span style={{ 
                    fontSize: '0.75rem', 
                    textAlign: 'center', 
                    width: '100%', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    color: 'var(--text-primary)',
                    fontWeight: 500
                  }}>
                    {page.name}
                  </span>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button 
                      onClick={() => movePage(index, 'left')} 
                      disabled={index === 0 || isProcessing}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--surface)',
                        cursor: 'pointer',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Move Left"
                    >
                      <ArrowLeft size={12} />
                    </button>
                    <button 
                      onClick={() => movePage(index, 'right')} 
                      disabled={index === pages.length - 1 || isProcessing}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--surface)',
                        cursor: 'pointer',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Move Right"
                    >
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', fontWeight: 600 }}>Target Output Size</h3>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {[100, 200, 300, 500].map((size) => (
                <button
                  key={size}
                  onClick={() => { setTargetMaxKB(size); setDownloadUrl(''); }}
                  disabled={isProcessing}
                  style={{
                    flex: 1,
                    minWidth: '100px',
                    padding: '0.75rem',
                    backgroundColor: targetMaxKB === size ? 'var(--primary)' : 'var(--surface)',
                    color: targetMaxKB === size ? 'white' : 'var(--text-primary)',
                    border: `1px solid ${targetMaxKB === size ? 'var(--primary)' : 'var(--border-color)'}`,
                    borderRadius: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Under {size} KB
                </button>
              ))}
            </div>

            {progress && (
              <div style={{ 
                margin: '1rem 0', 
                padding: '1rem', 
                backgroundColor: 'rgba(59, 130, 246, 0.05)', 
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px', 
                textAlign: 'center',
                color: 'var(--primary)',
                fontWeight: 600
              }}>
                {progress}
              </div>
            )}

            <button
              onClick={handleCompress}
              disabled={isProcessing || pages.length === 0}
              className={`btn-primary ${isProcessing ? 'processing' : ''}`}
              style={{ width: '100%', padding: '1rem' }}
            >
              {isProcessing ? (
                <div className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'white' }}></div>
              ) : (
                <DownloadCloud size={20} />
              )}
              <span>{isProcessing ? progress || 'Processing...' : 'Compress & Merge into PDF'}</span>
            </button>

            {downloadUrl && (
              <div className="result-card" style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--surface-solid)', borderRadius: '12px', textAlign: 'center' }}>
                <h4 style={{ color: isOutputOverTarget ? 'var(--danger)' : '#10b981', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                  {isOutputOverTarget ? 'PDF Generated, Still Above Target' : 'PDF Compressed Successfully! 🎉'}
                </h4>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Target: Under {targetMaxKB} KB | Output Size: <strong style={{ color: isOutputOverTarget ? 'var(--danger)' : '#10b981' }}>{outputSizeKB.toFixed(1)} KB</strong>
                </p>
                <a
                  href={downloadUrl}
                  download="document.pdf"
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
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {hasDownloaded ? <Check size={20} /> : <DownloadCloud size={20} />}
                  {hasDownloaded ? 'Downloaded!' : 'Download document.pdf'}
                </a>
              </div>
            )}
          </div>
        </div>
        </div>
        </div>
      )}

      <div className="info-grid" style={{ margin: '0 auto' }}>

        {pages.length === 0 && (
          <>
            <div className="card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Requirements (From You)</h2>
              <ul style={{ listStylePosition: 'inside', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>Upload single or multiple PDFs/Images</li>
                <li>Set your desired maximum output file size</li>
                <li>Drag & drop to seamlessly reorder pages</li>
              </ul>
            </div>
            <div className="card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Output Specifications (By Tool)</h2>
              <ul style={{ listStylePosition: 'inside', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>100% Client side processing (Secure)</li>
                <li>Single merged & optimized PDF document</li>
                <li>High-quality smart compression algorithm</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PdfMerger;
