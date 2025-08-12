import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface BoundingBox {
  id: string;
  coords: [number, number, number, number]; // [x1, y1, x2, y2]
  label?: string;
}

interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  page: number;
}

interface PDFViewerProps {
  file: File | null;
  boundingBoxes: BoundingBox[];
  activeBoundingBox: string | null;
  onAddBoundingBox?: (bbox: BoundingBox) => void;
  textAnnotations: TextAnnotation[];
  isTextMode: boolean;
  onAddTextAnnotation?: (annotation: TextAnnotation) => void;
  currentPage: number;
  onPageChange?: (page: number) => void;
}

export const PDFViewer = ({ 
  file, 
  boundingBoxes, 
  activeBoundingBox, 
  onAddBoundingBox,
  textAnnotations,
  isTextMode,
  onAddTextAnnotation,
  currentPage,
  onPageChange
}: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(currentPage || 1);
  const [scale, setScale] = useState<number>(1.0);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [pageHeight, setPageHeight] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Text annotation state
  const [activeTextAnnotation, setActiveTextAnnotation] = useState<{ x: number; y: number; text: string } | null>(null);

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

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pageRef.current) return;
    
    const rect = pageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    if (isTextMode && onAddTextAnnotation) {
      // In text mode, create active text annotation at click position
      setActiveTextAnnotation({ x, y, text: '' });
      // Focus will be set via useEffect
    } else if (onAddBoundingBox) {
      // In bounding box mode, start drawing
      setIsDrawing(true);
      setStartPoint({ x, y });
      setCurrentBox({ x, y, width: 0, height: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint || !pageRef.current) return;
    
    const rect = pageRef.current.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / scale;
    const currentY = (e.clientY - rect.top) / scale;
    
    const x = Math.min(startPoint.x, currentX);
    const y = Math.min(startPoint.y, currentY);
    const width = Math.abs(currentX - startPoint.x);
    const height = Math.abs(currentY - startPoint.y);
    
    setCurrentBox({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox || !onAddBoundingBox) return;
    
    // Only add if the box has meaningful size
    if (currentBox.width > 5 && currentBox.height > 5) {
      const newBox: BoundingBox = {
        id: `box-${Date.now()}`,
        coords: [
          Math.round(currentBox.x * 10) / 10,
          Math.round(currentBox.y * 10) / 10,
          Math.round((currentBox.x + currentBox.width) * 10) / 10,
          Math.round((currentBox.y + currentBox.height) * 10) / 10
        ],
        label: `Box ${boundingBoxes.length + 1}`
      };
      onAddBoundingBox(newBox);
    }
    
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentBox(null);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!activeTextAnnotation || !onAddTextAnnotation) return;
    
    if (e.key === 'Enter') {
      // Submit the annotation
      if (activeTextAnnotation.text.trim()) {
        const newAnnotation: TextAnnotation = {
          id: `text-${Date.now()}`,
          x: activeTextAnnotation.x,
          y: activeTextAnnotation.y,
          text: activeTextAnnotation.text,
          fontSize: 14,
          page: pageNumber
        };
        onAddTextAnnotation(newAnnotation);
      }
      setActiveTextAnnotation(null);
    } else if (e.key === 'Escape') {
      // Cancel
      setActiveTextAnnotation(null);
    } else if (e.key === 'Backspace') {
      // Remove last character
      setActiveTextAnnotation({
        ...activeTextAnnotation,
        text: activeTextAnnotation.text.slice(0, -1)
      });
    } else if (e.key.length === 1) {
      // Add character
      setActiveTextAnnotation({
        ...activeTextAnnotation,
        text: activeTextAnnotation.text + e.key
      });
    }
  };

  // Add keyboard event listener when in text mode
  useEffect(() => {
    if (activeTextAnnotation) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [activeTextAnnotation]);

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

  const renderTextAnnotations = () => {
    if (!pageWidth || !pageHeight) return null;
    
    return textAnnotations
      .filter(ann => ann.page === pageNumber)
      .map((annotation) => (
        <div
          key={annotation.id}
          className="absolute pointer-events-none"
          style={{
            left: annotation.x * scale,
            top: annotation.y * scale,
            fontSize: `${annotation.fontSize * scale}px`,
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            whiteSpace: 'nowrap'
          }}
        >
          {annotation.text}
        </div>
      ));
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
      <div 
        ref={pageRef}
        className="relative inline-block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isTextMode ? 'text' : (onAddBoundingBox ? 'crosshair' : 'default') }}
      >
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
        {renderTextAnnotations()}
        
        {/* Active text annotation being typed */}
        {activeTextAnnotation && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: activeTextAnnotation.x * scale,
              top: activeTextAnnotation.y * scale,
              fontSize: `${14 * scale}px`,
              fontFamily: 'Arial, sans-serif',
              color: '#000000',
              whiteSpace: 'nowrap'
            }}
          >
            {activeTextAnnotation.text}
            <span className="animate-pulse">|</span>
          </div>
        )}
        
        {/* Drawing preview */}
        {currentBox && isDrawing && (
          <div
            className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 pointer-events-none"
            style={{
              left: currentBox.x * scale,
              top: currentBox.y * scale,
              width: currentBox.width * scale,
              height: currentBox.height * scale,
            }}
          />
        )}
      </div>
      
      {numPages > 0 && (
        <div className="mt-4 text-center text-muted-foreground">
          <div>Page {pageNumber} of {numPages} • Scale: {Math.round(scale * 100)}%</div>
          {activeTextAnnotation ? (
            <div className="text-sm mt-1">Type your text • Press Enter to save • Press Escape to cancel</div>
          ) : isTextMode ? (
            <div className="text-sm mt-1">Click anywhere and start typing</div>
          ) : onAddBoundingBox ? (
            <div className="text-sm mt-1">Click and drag to draw a bounding box</div>
          ) : null}
        </div>
      )}
    </div>
  );
};