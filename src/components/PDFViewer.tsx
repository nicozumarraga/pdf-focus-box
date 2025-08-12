import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { FormFieldOverlay } from './FormFieldOverlay';
import { FormFieldData } from '@/lib/formFields';

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
  mode: 'box' | 'text';
  onAddTextAnnotation?: (annotation: TextAnnotation) => void;
  onUpdateTextAnnotation?: (id: string, x: number, y: number) => void;
  currentPage: number;
  onPageChange?: (page: number) => void;
  formFields?: FormFieldData[];
  formValues?: Record<string, any>;
  onFormValueChange?: (fieldName: string, value: any) => void;
}

export const PDFViewer = ({ 
  file, 
  boundingBoxes, 
  activeBoundingBox, 
  onAddBoundingBox,
  textAnnotations,
  mode,
  onAddTextAnnotation,
  onUpdateTextAnnotation,
  currentPage,
  onPageChange,
  formFields = [],
  formValues = {},
  onFormValueChange
}: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [pageHeight, setPageHeight] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<Map<number, HTMLDivElement>>(new Map());
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Text annotation state
  const [activeTextAnnotation, setActiveTextAnnotation] = useState<{ x: number; y: number; text: string; page: number } | null>(null);
  
  // Dragging state for text annotations
  const [draggingAnnotation, setDraggingAnnotation] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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

  const handleTextAnnotationMouseDown = (e: React.MouseEvent<HTMLDivElement>, annotation: TextAnnotation) => {
    if (mode !== 'text') return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const pageElement = e.currentTarget.closest('[data-page]') as HTMLElement;
    if (!pageElement) return;
    
    const rect = pageElement.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / scale;
    const mouseY = (e.clientY - rect.top) / scale;
    
    setDraggingAnnotation(annotation.id);
    setDragOffset({
      x: mouseX - annotation.x,
      y: mouseY - annotation.y
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, pageNumber: number) => {
    const target = e.target as HTMLElement;
    const pageElement = e.currentTarget;
    if (!pageElement) return;
    
    const rect = pageElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    if (mode === 'text') {
      // Priority 1: Check if clicking on a form field
      const formFieldElement = target.closest('[data-form-field]');
      if (formFieldElement) {
        // Form field will handle its own interaction
        return;
      }
      
      // Priority 2: Check if clicking on an existing text annotation
      if (target.closest('[data-annotation-id]')) {
        // Let the annotation's own mouseDown handler take care of it
        return;
      }
      
      // Priority 3: Create new text annotation at click position
      if (onAddTextAnnotation) {
        setActiveTextAnnotation({ x, y, text: '', page: pageNumber });
      }
    } else if (mode === 'box' && onAddBoundingBox) {
      // In draw mode, start drawing bounding box
      setIsDrawing(true);
      setStartPoint({ x, y });
      setCurrentBox({ x, y, width: 0, height: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Skip if dragging annotation (handled by document-level listener)
    if (draggingAnnotation) return;
    
    const pageElement = e.currentTarget;
    if (!pageElement) return;
    
    const rect = pageElement.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / scale;
    const currentY = (e.clientY - rect.top) / scale;
    
    // Handle drawing bounding box
    if (!isDrawing || !startPoint) return;
    
    const x = Math.min(startPoint.x, currentX);
    const y = Math.min(startPoint.y, currentY);
    const width = Math.abs(currentX - startPoint.x);
    const height = Math.abs(currentY - startPoint.y);
    
    setCurrentBox({ x, y, width, height });
  };

  const handleMouseUp = () => {
    // Skip if dragging (handled by document-level listener)
    if (draggingAnnotation) return;
    
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
          page: activeTextAnnotation.page
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

  // Add document-level mouse tracking for smoother dragging
  useEffect(() => {
    if (!draggingAnnotation) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      // Find the page element that contains the annotation being dragged
      const annotation = textAnnotations.find(a => a.id === draggingAnnotation);
      if (!annotation) return;
      
      const pageElement = pagesRef.current.get(annotation.page);
      if (!pageElement) return;
      
      const rect = pageElement.getBoundingClientRect();
      const currentX = (e.clientX - rect.left) / scale;
      const currentY = (e.clientY - rect.top) / scale;
      
      const newX = currentX - dragOffset.x;
      const newY = currentY - dragOffset.y;
      
      if (onUpdateTextAnnotation) {
        onUpdateTextAnnotation(draggingAnnotation, newX, newY);
      }
    };

    const handleDocumentMouseUp = () => {
      setDraggingAnnotation(null);
      setDragOffset({ x: 0, y: 0 });
    };

    // Add listeners to document for smooth dragging
    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [draggingAnnotation, dragOffset, scale, textAnnotations, onUpdateTextAnnotation]);

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

  const renderTextAnnotations = (pageNumber: number) => {
    if (!pageWidth || !pageHeight) return null;
    
    return textAnnotations
      .filter(ann => ann.page === pageNumber)
      .map((annotation) => {
        const isDraggable = mode === 'text';
        return (
          <div
            key={annotation.id}
            data-annotation-id={annotation.id}
            className={`absolute ${
              draggingAnnotation === annotation.id 
                ? 'opacity-90 shadow-lg ring-2 ring-blue-500' 
                : isDraggable
                  ? 'hover:opacity-80 hover:bg-yellow-100/20' 
                  : ''
            }`}
            onMouseDown={(e) => {
              if (isDraggable) {
                e.preventDefault();
                e.stopPropagation();
                handleTextAnnotationMouseDown(e, annotation);
              }
            }}
            style={{
              left: annotation.x * scale,
              top: annotation.y * scale,
              fontSize: `${annotation.fontSize * scale}px`,
              fontFamily: 'Arial, sans-serif',
              color: '#000000',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              cursor: draggingAnnotation === annotation.id ? 'grabbing' : (isDraggable ? 'grab' : 'default'),
              pointerEvents: isDraggable ? 'auto' : 'none',
              padding: '2px 4px',
              borderRadius: '2px',
              zIndex: draggingAnnotation === annotation.id ? 1000 : 10,
              transition: draggingAnnotation === annotation.id ? 'none' : 'opacity 0.2s'
            }}
          >
            {annotation.text}
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
        {Array.from(new Array(numPages), (el, index) => {
          const pageNumber = index + 1;
          return (
            <div
              key={`page_${pageNumber}`}
              className="relative inline-block mb-4"
              data-page={pageNumber}
              ref={(el) => {
                if (el) pagesRef.current.set(pageNumber, el);
              }}
            >
              {/* Base PDF Layer */}
              <div
                onMouseDown={(e) => !draggingAnnotation && handleMouseDown(e, pageNumber)}
                onMouseMove={!draggingAnnotation ? handleMouseMove : undefined}
                onMouseUp={!draggingAnnotation ? handleMouseUp : undefined}
                onMouseLeave={!draggingAnnotation ? handleMouseUp : undefined}
                style={{ 
                  cursor: mode === 'text' ? 'text' : (mode === 'box' ? 'crosshair' : 'default')
                }}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  onLoadSuccess={pageNumber === 1 ? onPageLoadSuccess : undefined}
                  loading={
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  }
                />
              </div>
              
              {/* Bounding Boxes Layer */}
              {pageNumber === 1 && renderBoundingBoxes()}
              
              {/* Form Fields Layer */}
              {formFields.length > 0 && onFormValueChange && (
                <FormFieldOverlay
                  fields={formFields}
                  values={formValues}
                  onValueChange={onFormValueChange}
                  scale={scale}
                  pageNumber={pageNumber}
                  pageHeight={pageHeight}
                  disabled={mode !== 'text'}
                />
              )}
              
              {/* Text Annotations Interactive Layer */}
              <div
                className="absolute inset-0"
                style={{ 
                  pointerEvents: mode === 'text' ? 'auto' : 'none'
                }}
              >
                {renderTextAnnotations(pageNumber)}
              </div>
              
              {/* Active text annotation being typed for this page */}
              {activeTextAnnotation && activeTextAnnotation.page === pageNumber && (
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
              
              {/* Drawing preview for first page only */}
              {pageNumber === 1 && currentBox && isDrawing && (
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
              
              {/* Page number label */}
              <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                Page {pageNumber}
              </div>
            </div>
          );
        })}
      </Document>
      
      {numPages > 0 && (
        <div className="mt-4 text-center text-muted-foreground">
          <div>{numPages} page{numPages > 1 ? 's' : ''} • Scale: {Math.round(scale * 100)}%</div>
          {activeTextAnnotation ? (
            <div className="text-sm mt-1">Type your text • Press Enter to save • Press Escape to cancel</div>
          ) : mode === 'text' ? (
            <div className="text-sm mt-1">Click form fields to edit • Drag text to move • Click empty space to add new text</div>
          ) : mode === 'box' ? (
            <div className="text-sm mt-1">Click and drag to draw a bounding box</div>
          ) : null}
        </div>
      )}
    </div>
  );
};