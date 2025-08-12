import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Square, Type, FileText, Download } from 'lucide-react';
import { FormFieldData } from '@/lib/formFields';

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

interface ElementsPanelProps {
  boundingBoxes: BoundingBox[];
  textAnnotations: TextAnnotation[];
  formFields: FormFieldData[];
  formValues: Record<string, any>;
  activeBoundingBox: string | null;
  onSetActiveBoundingBox: (id: string) => void;
  onRemoveBoundingBox: (id: string) => void;
  onRemoveTextAnnotation: (id: string) => void;
  onExportPDF: () => void;
}

export const ElementsPanel = ({
  boundingBoxes,
  textAnnotations,
  formFields,
  formValues,
  activeBoundingBox,
  onSetActiveBoundingBox,
  onRemoveBoundingBox,
  onRemoveTextAnnotation,
  onExportPDF,
}: ElementsPanelProps) => {
  const totalElements = boundingBoxes.length + textAnnotations.length + formFields.length;
  const filledFormFields = Object.values(formValues).filter(v => 
    v !== '' && v !== false && v !== null && v !== undefined && 
    (!Array.isArray(v) || v.length > 0)
  ).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Elements</CardTitle>
            <Badge variant="secondary">{totalElements} total</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4 rounded-none">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="boxes">
                <Square className="h-3 w-3 mr-1" />
                {boundingBoxes.length}
              </TabsTrigger>
              <TabsTrigger value="text">
                <Type className="h-3 w-3 mr-1" />
                {textAnnotations.length}
              </TabsTrigger>
              <TabsTrigger value="forms">
                <FileText className="h-3 w-3 mr-1" />
                {formFields.length}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-0">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-2">
                  {/* Boxes */}
                  {boundingBoxes.map((bbox) => (
                    <div
                      key={bbox.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                        activeBoundingBox === bbox.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => onSetActiveBoundingBox(bbox.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Square className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm">
                              {bbox.label || `Box ${bbox.id.slice(-6)}`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Bounding Box
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveBoundingBox(bbox.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Text Annotations */}
                  {textAnnotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      className="p-3 rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Type className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {annotation.text}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Page {annotation.page}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveTextAnnotation(annotation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Form Fields */}
                  {formFields.map((field) => {
                    const value = formValues[field.name];
                    const hasValue = value !== '' && value !== false && value !== null && 
                                   value !== undefined && (!Array.isArray(value) || value.length > 0);
                    
                    return (
                      <div
                        key={field.name}
                        className="p-3 rounded-lg border border-border"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {field.name}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {field.type}
                                </Badge>
                                {hasValue && (
                                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {totalElements === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No elements yet. Start by adding boxes or text annotations.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="boxes" className="mt-0">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-2">
                  {boundingBoxes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No bounding boxes. Switch to Box Mode to draw.
                    </div>
                  ) : (
                    boundingBoxes.map((bbox) => (
                      <div
                        key={bbox.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                          activeBoundingBox === bbox.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => onSetActiveBoundingBox(bbox.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">
                              {bbox.label || `Box ${bbox.id.slice(-6)}`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              [{bbox.coords.map(c => Math.round(c)).join(', ')}]
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveBoundingBox(bbox.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="text" className="mt-0">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-2">
                  {textAnnotations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No text annotations. Switch to Text Mode to add.
                    </div>
                  ) : (
                    textAnnotations.map((annotation) => (
                      <div
                        key={annotation.id}
                        className="p-3 rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {annotation.text}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Page {annotation.page} • ({Math.round(annotation.x)}, {Math.round(annotation.y)})
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveTextAnnotation(annotation.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="forms" className="mt-0">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-2">
                  {formFields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No form fields detected in this PDF.
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs text-blue-700 dark:text-blue-300">
                        {filledFormFields}/{formFields.length} fields filled
                      </div>
                      {formFields.map((field) => {
                        const value = formValues[field.name];
                        const hasValue = value !== '' && value !== false && value !== null && 
                                       value !== undefined && (!Array.isArray(value) || value.length > 0);
                        
                        return (
                          <div
                            key={field.name}
                            className="p-3 rounded-lg border border-border"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {field.name}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {field.type}
                                  </Badge>
                                  {field.isRequired && (
                                    <Badge variant="destructive" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                  {hasValue && (
                                    <div className="h-2 w-2 bg-green-500 rounded-full" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Button
        onClick={onExportPDF}
        className="w-full"
        variant="default"
      >
        <Download className="h-4 w-4 mr-2" />
        Export PDF with Annotations
      </Button>
    </div>
  );
};