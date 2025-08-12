import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, Type, Move } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  page: number;
}

interface TextAnnotationFormProps {
  textAnnotations: TextAnnotation[];
  mode: 'draw' | 'text' | 'form';
  onModeChange: (mode: 'draw' | 'text' | 'form') => void;
  onRemoveAnnotation: (id: string) => void;
  onExportPDF: () => void;
}

export const TextAnnotationForm = ({
  textAnnotations,
  mode,
  onModeChange,
  onRemoveAnnotation,
  onExportPDF
}: TextAnnotationFormProps) => {
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Text Annotations</h3>
          <Button
            variant={mode === 'text' ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange('text')}
            className="gap-2"
          >
            <Type className="h-4 w-4" />
            <Move className="h-4 w-4" />
            Text Mode
          </Button>
        </div>

        {mode === 'text' && (
          <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
            • Drag existing text to move it<br/>
            • Click empty space to add new text
          </div>
        )}

        <ScrollArea className="h-48">
          <div className="space-y-2">
            {textAnnotations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No text annotations yet
              </p>
            ) : (
              textAnnotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="flex items-center justify-between p-2 rounded border bg-card"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{annotation.text}</p>
                    <p className="text-xs text-muted-foreground">
                      Page {annotation.page} • X: {Math.round(annotation.x)}, Y: {Math.round(annotation.y)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveAnnotation(annotation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <Button
          onClick={onExportPDF}
          className="w-full"
          variant="default"
        >
          Export PDF with Annotations
        </Button>
      </div>
    </Card>
  );
};