import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface BoundingBox {
  id: string;
  coords: [number, number, number, number]; // [x1, y1, x2, y2]
  label?: string;
}

interface PDFViewerProps {
  file: File | null;
  boundingBoxes: BoundingBox[];
  activeBoundingBox: string | null;
}

export const PDFViewer = ({ file, boundingBoxes, activeBoundingBox }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [pageHeight, setPageHeight] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function onPageLoadSuccess(page: any) {
    const viewport = page.getViewport({ scale: 1.0 });
    setPageWidth(viewport.width);
    setPageHeight(viewport.height);
    
    // Calculate optimal scale to fit container
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 40; // padding
      const containerHeight = containerRef.current.clientHeight - 40;
      const scaleX = containerWidth / viewport.width;
      const scaleY = containerHeight / viewport.height;
      const optimalScale = Math.min(scaleX, scaleY, 1.5); // max scale of 1.5
      setScale(optimalScale);
    }
  }

  const renderBoundingBoxes = () => {
    if (!pageWidth || !pageHeight) return null;

    return boundingBoxes.map((bbox) => {
      const [x1, y1, x2, y2] = bbox.coords;
      const isActive = bbox.id === activeBoundingBox;
      
      return (
        <div
          key={bbox.id}
          className={`absolute border-2 transition-colors ${
            isActive 
              ? 'border-annotation bg-annotation/10' 
              : 'border-primary bg-primary/5'
          }`}
          style={{
            left: x1 * scale,
            top: y1 * scale,
            width: (x2 - x1) * scale,
            height: (y2 - y1) * scale,
          }}
        >
          {bbox.label && (
            <div className={`absolute -top-6 left-0 px-2 py-1 text-xs rounded ${
              isActive ? 'bg-annotation text-annotation-foreground' : 'bg-primary text-primary-foreground'
            }`}>
              {bbox.label}
            </div>
          )}
        </div>
      );
    });
  };

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-viewer-bg rounded-lg border-2 border-dashed border-border">
        <div className="text-center text-muted-foreground">
          <div className="text-4xl mb-4">📄</div>
          <p className="text-lg">Upload a PDF to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 bg-viewer-bg rounded-lg p-4 overflow-auto">
      <div className="relative inline-block">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }
          error={
            <div className="text-center text-destructive p-8">
              <p>Failed to load PDF. Please try again.</p>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            onLoadSuccess={onPageLoadSuccess}
            loading={
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            }
          />
        </Document>
        {renderBoundingBoxes()}
      </div>
      
      {numPages > 0 && (
        <div className="mt-4 text-center text-muted-foreground">
          Page {pageNumber} of {numPages} • Scale: {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
};