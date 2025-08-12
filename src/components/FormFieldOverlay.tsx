import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FormFieldData } from '@/lib/formFields';

interface FormFieldOverlayProps {
  fields: FormFieldData[];
  values: Record<string, any>;
  onValueChange: (fieldName: string, value: any) => void;
  scale: number;
  pageNumber: number;
  pageHeight: number;
  disabled?: boolean;
}

export const FormFieldOverlay = ({
  fields,
  values,
  onValueChange,
  scale,
  pageNumber,
  pageHeight,
  disabled = false
}: FormFieldOverlayProps) => {
  const [localValues, setLocalValues] = useState<Record<string, any>>(values);

  useEffect(() => {
    setLocalValues(values);
  }, [values]);

  const handleChange = (fieldName: string, value: any) => {
    setLocalValues(prev => ({ ...prev, [fieldName]: value }));
    onValueChange(fieldName, value);
  };

  const renderField = (field: FormFieldData) => {
    if (field.page !== pageNumber || !field.rect) return null;

    // Convert PDF coordinates (bottom-left origin) to screen coordinates (top-left origin)
    const screenY = pageHeight - field.rect.y - field.rect.height;
    
    const style = {
      position: 'absolute' as const,
      left: field.rect.x * scale,
      top: screenY * scale,
      width: field.rect.width * scale,
      height: field.rect.height * scale,
      zIndex: 100,
    };

    const value = localValues[field.name];

    switch (field.type) {
      case 'text':
        return (
          <div key={field.name} style={style} data-form-field={field.name}>
            <Input
              value={value || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              disabled={disabled || field.isReadOnly}
              required={field.isRequired}
              maxLength={field.maxLength}
              className="h-full w-full border-blue-400 bg-white/90 text-xs"
              placeholder={field.name}
            />
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} style={style} className="flex items-center justify-center" data-form-field={field.name}>
            <Checkbox
              checked={value || false}
              onCheckedChange={(checked) => handleChange(field.name, checked)}
              disabled={disabled || field.isReadOnly}
              className="border-blue-400"
            />
          </div>
        );

      case 'dropdown':
        return (
          <div key={field.name} style={style} data-form-field={field.name}>
            <Select
              value={Array.isArray(value) ? value[0] : value}
              onValueChange={(newValue) => handleChange(field.name, newValue)}
              disabled={disabled || field.isReadOnly}
            >
              <SelectTrigger className="h-full w-full border-blue-400 bg-white/90 text-xs">
                <SelectValue placeholder={field.name} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option} className="text-xs">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'radio':
        return (
          <div key={field.name} style={style} data-form-field={field.name}>
            <RadioGroup
              value={value || ''}
              onValueChange={(newValue) => handleChange(field.name, newValue)}
              disabled={disabled || field.isReadOnly}
              className="flex flex-col gap-1"
            >
              {field.options?.map((option) => (
                <div key={option} className="flex items-center space-x-1">
                  <RadioGroupItem value={option} id={`${field.name}-${option}`} />
                  <Label htmlFor={`${field.name}-${option}`} className="text-xs">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'option-list':
        return (
          <div key={field.name} style={style} data-form-field={field.name}>
            <select
              multiple
              value={value || []}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                handleChange(field.name, selectedOptions);
              }}
              disabled={disabled || field.isReadOnly}
              className="h-full w-full border border-blue-400 bg-white/90 text-xs rounded"
            >
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );

      case 'button':
        // Buttons are typically for actions like submit/reset
        // We'll render them but they won't be functional in this context
        return (
          <div key={field.name} style={style} data-form-field={field.name}>
            <button
              disabled={true}
              className="h-full w-full border border-gray-400 bg-gray-100 text-xs rounded opacity-50"
            >
              {field.name}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="relative w-full h-full" style={{ pointerEvents: disabled ? 'none' : 'auto' }}>
        {fields.map(renderField)}
      </div>
    </div>
  );
};