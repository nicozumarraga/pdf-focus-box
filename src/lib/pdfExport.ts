import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  page: number;
}

interface BoundingBox {
  id: string;
  coords: [number, number, number, number];
  label?: string;
}

export async function exportPDFWithAnnotations(
  file: File,
  textAnnotations: TextAnnotation[],
  boundingBoxes: BoundingBox[]
) {
  try {
    // Load the existing PDF
    const existingPdfBytes = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Get Helvetica font
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Get all pages
    const pages = pdfDoc.getPages();
    
    // Add text annotations to each page
    textAnnotations.forEach((annotation) => {
      const pageIndex = annotation.page - 1; // Convert to 0-based index
      if (pageIndex >= 0 && pageIndex < pages.length) {
        const page = pages[pageIndex];
        const { height } = page.getSize();
        
        // PDF coordinates start from bottom-left, so we need to invert Y
        const pdfY = height - annotation.y;
        
        page.drawText(annotation.text, {
          x: annotation.x,
          y: pdfY,
          size: annotation.fontSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      }
    });
    
    // Add bounding boxes (as rectangles)
    boundingBoxes.forEach((bbox) => {
      const [x1, y1, x2, y2] = bbox.coords;
      const page = pages[0]; // Assuming bounding boxes are on first page for now
      const { height } = page.getSize();
      
      // Convert coordinates
      const pdfY1 = height - y1;
      const pdfY2 = height - y2;
      
      // Draw rectangle outline
      page.drawRectangle({
        x: x1,
        y: Math.min(pdfY1, pdfY2),
        width: x2 - x1,
        height: Math.abs(pdfY2 - pdfY1),
        borderColor: rgb(0, 0, 1),
        borderWidth: 1,
        opacity: 0.5,
      });
      
      // Add label if exists
      if (bbox.label) {
        page.drawText(bbox.label, {
          x: x1,
          y: Math.max(pdfY1, pdfY2) + 5,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 1),
        });
      }
    });
    
    // Serialize the PDFDocument to bytes
    const pdfBytes = await pdfDoc.save();
    
    // Create a blob and download
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotated_${file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('PDF exported successfully with annotations');
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('Failed to export PDF. Please try again.');
  }
}