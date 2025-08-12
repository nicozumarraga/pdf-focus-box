import { useState, useEffect } from 'react';
import { PDFViewer } from '@/components/PDFViewer';
import { FileUpload } from '@/components/FileUpload';
import { ElementsPanel } from '@/components/ElementsPanel';
import { exportPDFWithAnnotations } from '@/lib/pdfExport';
import { detectFormFields, FormFieldsInfo } from '@/lib/formFields';

interface BoundingBox {
  id: string;
  coords: [number, number, number, number];
  label?: string;
  page: number;
}

interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  page: number;
}

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
  const [activeBoundingBox, setActiveBoundingBox] = useState<string | null>(null);
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [mode, setMode] = useState<'box' | 'text'>('box');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [formFieldsInfo, setFormFieldsInfo] = useState<FormFieldsInfo | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [textSize, setTextSize] = useState<number>(14);

  // Detect form fields when a new PDF is loaded
  useEffect(() => {
    if (file) {
      file.arrayBuffer().then(async (buffer) => {
        const fieldsInfo = await detectFormFields(buffer);
        setFormFieldsInfo(fieldsInfo);
        if (fieldsInfo.hasFormFields) {
          setFormValues(fieldsInfo.formValues);
          console.log('Detected form fields:', fieldsInfo.fields);
        }
      });
    } else {
      setFormFieldsInfo(null);
      setFormValues({});
    }
  }, [file]);

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

  const handleAddTextAnnotation = (annotation: TextAnnotation) => {
    setTextAnnotations(prev => [...prev, annotation]);
  };

  const handleRemoveTextAnnotation = (id: string) => {
    setTextAnnotations(prev => prev.filter(ann => ann.id !== id));
  };

  const handleUpdateTextAnnotation = (id: string, text: string) => {
    setTextAnnotations(prev => prev.map(ann =>
      ann.id === id ? { ...ann, text } : ann
    ));
  };

  const handleUpdateTextAnnotationCoordinates = (id: string, x: number, y: number) => {
    setTextAnnotations(prev => prev.map(ann =>
      ann.id === id ? { ...ann, x, y } : ann
    ));
  };

  const handleExportPDF = async () => {
    if (!file) return;
    await exportPDFWithAnnotations(file, textAnnotations, boundingBoxes, formValues);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">PDF Annotation Tool</h1>
          <p className="text-muted-foreground">Upload a PDF and add bounding boxes to annotate regions and text fields</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4 bg-sidebar-bg p-4 rounded-lg overflow-y-auto">
            <FileUpload file={file} onFileSelect={setFile} />

            {/* Mode Toggle */}
            <div className="bg-card rounded-lg p-4">
              <div className="flex rounded-lg bg-muted p-1">
                <button
                  onClick={() => setMode('box')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === 'box'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Box Mode
                </button>
                <button
                  onClick={() => setMode('text')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === 'text'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Text Mode
                </button>
              </div>
              
              {/* Text Size Selector - only show in text mode */}
              {mode === 'text' && (
                <div className="mt-3">
                  <label className="text-sm font-medium text-foreground">
                    Text Size
                  </label>
                  <select
                    value={textSize}
                    onChange={(e) => setTextSize(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="10">10px</option>
                    <option value="12">12px</option>
                    <option value="14">14px</option>
                    <option value="16">16px</option>
                    <option value="18">18px</option>
                    <option value="20">20px</option>
                    <option value="24">24px</option>
                    <option value="28">28px</option>
                    <option value="32">32px</option>
                    <option value="36">36px</option>
                  </select>
                </div>
              )}
            </div>

            {/* Elements Panel */}
            <ElementsPanel
              boundingBoxes={boundingBoxes}
              textAnnotations={textAnnotations}
              formFields={formFieldsInfo?.fields || []}
              formValues={formValues}
              activeBoundingBox={activeBoundingBox}
              onSetActiveBoundingBox={setActiveBoundingBox}
              onRemoveBoundingBox={handleRemoveBoundingBox}
              onRemoveTextAnnotation={handleRemoveTextAnnotation}
              onExportPDF={handleExportPDF}
            />
          </div>

          {/* Main viewer */}
          <div className="lg:col-span-3">
            <PDFViewer
              file={file}
              boundingBoxes={boundingBoxes}
              activeBoundingBox={activeBoundingBox}
              onAddBoundingBox={mode === 'box' ? handleAddBoundingBox : undefined}
              textAnnotations={textAnnotations}
              mode={mode}
              onAddTextAnnotation={handleAddTextAnnotation}
              onUpdateTextAnnotation={handleUpdateTextAnnotationCoordinates}
              textSize={textSize}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              formFields={formFieldsInfo?.fields}
              formValues={formValues}
              onFormValueChange={(name: string, value: any) => setFormValues(prev => ({ ...prev, [name]: value }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
