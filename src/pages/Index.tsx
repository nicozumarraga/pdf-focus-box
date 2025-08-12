import { useState, useEffect } from 'react';
import { PDFViewer } from '@/components/PDFViewer';
import { BoundingBoxForm } from '@/components/BoundingBoxForm';
import { FileUpload } from '@/components/FileUpload';
import { TextAnnotationForm } from '@/components/TextAnnotationForm';
import { FormFieldsPanel } from '@/components/FormFieldsPanel';
import { exportPDFWithAnnotations } from '@/lib/pdfExport';
import { detectFormFields, FormFieldsInfo } from '@/lib/formFields';

interface BoundingBox {
  id: string;
  coords: [number, number, number, number];
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

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
  const [activeBoundingBox, setActiveBoundingBox] = useState<string | null>(null);
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [mode, setMode] = useState<'draw' | 'text' | 'form'>('draw');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [formFieldsInfo, setFormFieldsInfo] = useState<FormFieldsInfo | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

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
          <p className="text-muted-foreground">Upload a PDF and add bounding boxes to annotate regions</p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4 bg-sidebar-bg p-4 rounded-lg overflow-y-auto">
            <FileUpload file={file} onFileSelect={setFile} />
            {formFieldsInfo && formFieldsInfo.hasFormFields && (
              <FormFieldsPanel
                formFieldsInfo={formFieldsInfo}
                mode={mode}
                onModeChange={setMode}
                formValues={formValues}
              />
            )}
            <BoundingBoxForm
              boundingBoxes={boundingBoxes}
              onAddBoundingBox={handleAddBoundingBox}
              onRemoveBoundingBox={handleRemoveBoundingBox}
              activeBoundingBox={activeBoundingBox}
              onSetActiveBoundingBox={setActiveBoundingBox}
              mode={mode}
              onModeChange={setMode}
            />
            <TextAnnotationForm
              textAnnotations={textAnnotations}
              mode={mode}
              onModeChange={setMode}
              onRemoveAnnotation={handleRemoveTextAnnotation}
              onExportPDF={handleExportPDF}
            />
          </div>
          
          {/* Main viewer */}
          <div className="lg:col-span-3">
            <PDFViewer
              file={file}
              boundingBoxes={boundingBoxes}
              activeBoundingBox={activeBoundingBox}
              onAddBoundingBox={mode === 'draw' ? handleAddBoundingBox : undefined}
              textAnnotations={textAnnotations}
              mode={mode}
              onAddTextAnnotation={handleAddTextAnnotation}
              onUpdateTextAnnotation={handleUpdateTextAnnotationCoordinates}
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
