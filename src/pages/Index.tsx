import { useState } from 'react';
import { PDFViewer } from '@/components/PDFViewer';
import { BoundingBoxForm } from '@/components/BoundingBoxForm';
import { FileUpload } from '@/components/FileUpload';

interface BoundingBox {
  id: string;
  coords: [number, number, number, number];
  label?: string;
}

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
  const [activeBoundingBox, setActiveBoundingBox] = useState<string | null>(null);

  const handleAddBoundingBox = (bbox: BoundingBox) => {
    setBoundingBoxes(prev => [...prev, bbox]);
    setActiveBoundingBox(bbox.id);
  };

  const handleRemoveBoundingBox = (id: string) => {
    setBoundingBoxes(prev => prev.filter(bbox => bbox.id !== id));
    if (activeBoundingBox === id) {
      setActiveBoundingBox(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">PDF Annotation Tool</h1>
          <p className="text-muted-foreground">Upload a PDF and add bounding boxes to annotate regions</p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4 bg-sidebar-bg p-4 rounded-lg overflow-y-auto">
            <FileUpload file={file} onFileSelect={setFile} />
            <BoundingBoxForm
              boundingBoxes={boundingBoxes}
              onAddBoundingBox={handleAddBoundingBox}
              onRemoveBoundingBox={handleRemoveBoundingBox}
              activeBoundingBox={activeBoundingBox}
              onSetActiveBoundingBox={setActiveBoundingBox}
            />
          </div>
          
          {/* Main viewer */}
          <div className="lg:col-span-3">
            <PDFViewer
              file={file}
              boundingBoxes={boundingBoxes}
              activeBoundingBox={activeBoundingBox}
              onAddBoundingBox={handleAddBoundingBox}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
