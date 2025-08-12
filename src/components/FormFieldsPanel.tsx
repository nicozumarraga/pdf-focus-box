import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertCircle, FormInput } from 'lucide-react';
import { FormFieldsInfo } from '@/lib/formFields';

interface FormFieldsPanelProps {
  formFieldsInfo: FormFieldsInfo | null;
  mode: 'draw' | 'text' | 'form';
  onModeChange: (mode: 'draw' | 'text' | 'form') => void;
  formValues: Record<string, any>;
}

export const FormFieldsPanel = ({
  formFieldsInfo,
  mode,
  onModeChange,
  formValues,
}: FormFieldsPanelProps) => {
  if (!formFieldsInfo) return null;

  const { hasFormFields, fields } = formFieldsInfo;

  if (!hasFormFields || fields.length === 0) return null;

  const filledFieldsCount = Object.values(formValues).filter(v => 
    v !== '' && v !== false && v !== null && v !== undefined && 
    (!Array.isArray(v) || v.length > 0)
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Form Fields
          </CardTitle>
          <Badge variant="secondary">
            {filledFieldsCount}/{fields.length} filled
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            This PDF contains fillable form fields. Switch to Form mode to edit them.
          </div>
        </div>

        <Button
          variant={mode === 'form' ? 'default' : 'outline'}
          className="w-full"
          onClick={() => onModeChange('form')}
        >
          <FormInput className="h-4 w-4 mr-2" />
          {mode === 'form' ? 'Form Mode Active' : 'Edit Form Fields'}
        </Button>

        <div className="space-y-2">
          <div className="text-sm font-medium">Detected fields:</div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {fields.map((field) => {
              const value = formValues[field.name];
              const hasValue = value !== '' && value !== false && value !== null && 
                             value !== undefined && (!Array.isArray(value) || value.length > 0);
              
              return (
                <div
                  key={field.name}
                  className="flex items-center justify-between p-2 rounded bg-muted/50 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {field.type}
                    </Badge>
                    <span className="font-mono truncate max-w-[150px]" title={field.name}>
                      {field.name}
                    </span>
                  </div>
                  {hasValue && (
                    <div className="h-2 w-2 bg-green-500 rounded-full" title="Field has value" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {mode === 'form' && (
          <div className="text-xs text-muted-foreground">
            Click on the form fields in the PDF to edit their values. Your changes will be preserved when exporting.
          </div>
        )}
      </CardContent>
    </Card>
  );
};