import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFButton, PDFOptionList } from 'pdf-lib';

export type FormFieldType = 'text' | 'checkbox' | 'dropdown' | 'radio' | 'button' | 'option-list';

export interface FormFieldData {
  name: string;
  type: FormFieldType;
  page?: number;
  rect?: { x: number; y: number; width: number; height: number };
  value?: string | boolean | string[];
  options?: string[];
  isReadOnly?: boolean;
  isRequired?: boolean;
  maxLength?: number;
}

export interface FormFieldsInfo {
  hasFormFields: boolean;
  fields: FormFieldData[];
  formValues: Record<string, any>;
}

/**
 * Detects and extracts form fields from a PDF document
 */
export async function detectFormFields(pdfBytes: ArrayBuffer): Promise<FormFieldsInfo> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    if (fields.length === 0) {
      return {
        hasFormFields: false,
        fields: [],
        formValues: {}
      };
    }

    const fieldData: FormFieldData[] = [];
    const formValues: Record<string, any> = {};

    for (const field of fields) {
      const fieldName = field.getName();
      let fieldInfo: FormFieldData = {
        name: fieldName,
        type: 'text', // default
        isReadOnly: field.isReadOnly(),
        isRequired: field.isRequired()
      };

      // Get field position info
      const widgets = field.acroField.getWidgets();
      if (widgets.length > 0) {
        const widget = widgets[0];
        const rect = widget.getRectangle();
        if (rect) {
          fieldInfo.rect = {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          };
        }

        // Try to determine page number
        const pageRef = widget.P();
        if (pageRef) {
          const pages = pdfDoc.getPages();
          for (let i = 0; i < pages.length; i++) {
            if (pages[i].ref === pageRef) {
              fieldInfo.page = i + 1; // 1-based page numbering
              break;
            }
          }
        }
      }

      // Determine field type and extract value
      if (field instanceof PDFTextField) {
        fieldInfo.type = 'text';
        fieldInfo.value = field.getText();
        fieldInfo.maxLength = field.getMaxLength();
        formValues[fieldName] = field.getText() || '';
      } else if (field instanceof PDFCheckBox) {
        fieldInfo.type = 'checkbox';
        fieldInfo.value = field.isChecked();
        formValues[fieldName] = field.isChecked();
      } else if (field instanceof PDFDropdown) {
        fieldInfo.type = 'dropdown';
        fieldInfo.options = field.getOptions();
        fieldInfo.value = field.getSelected();
        formValues[fieldName] = field.getSelected() || [];
      } else if (field instanceof PDFRadioGroup) {
        fieldInfo.type = 'radio';
        fieldInfo.options = field.getOptions();
        fieldInfo.value = field.getSelected();
        formValues[fieldName] = field.getSelected() || '';
      } else if (field instanceof PDFButton) {
        fieldInfo.type = 'button';
        // Buttons typically don't have values
      } else if (field instanceof PDFOptionList) {
        fieldInfo.type = 'option-list';
        fieldInfo.options = field.getOptions();
        fieldInfo.value = field.getSelected();
        formValues[fieldName] = field.getSelected() || [];
      }

      fieldData.push(fieldInfo);
    }

    return {
      hasFormFields: true,
      fields: fieldData,
      formValues
    };
  } catch (error) {
    console.error('Error detecting form fields:', error);
    return {
      hasFormFields: false,
      fields: [],
      formValues: {}
    };
  }
}

/**
 * Updates form field values in a PDF document
 */
export async function updateFormFieldValues(
  pdfBytes: ArrayBuffer,
  formValues: Record<string, any>
): Promise<ArrayBuffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    for (const [fieldName, value] of Object.entries(formValues)) {
      try {
        const field = form.getField(fieldName);

        if (field instanceof PDFTextField && typeof value === 'string') {
          field.setText(value);
        } else if (field instanceof PDFCheckBox && typeof value === 'boolean') {
          if (value) {
            field.check();
          } else {
            field.uncheck();
          }
        } else if (field instanceof PDFDropdown) {
          if (Array.isArray(value) && value.length > 0) {
            field.select(value);
          } else if (typeof value === 'string') {
            field.select(value);
          }
        } else if (field instanceof PDFRadioGroup && typeof value === 'string') {
          field.select(value);
        } else if (field instanceof PDFOptionList && Array.isArray(value)) {
          field.select(value);
        }
      } catch (fieldError) {
        console.warn(`Could not update field ${fieldName}:`, fieldError);
      }
    }

    return await pdfDoc.save();
  } catch (error) {
    console.error('Error updating form fields:', error);
    throw error;
  }
}

/**
 * Preserves form fields while adding annotations
 */
export async function preserveFormFieldsWithAnnotations(
  pdfBytes: ArrayBuffer,
  formValues: Record<string, any>,
  annotations: {
    textAnnotations: any[];
    boundingBoxes: any[];
  }
): Promise<ArrayBuffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // First, update form field values
    for (const [fieldName, value] of Object.entries(formValues)) {
      try {
        const field = form.getField(fieldName);
        
        if (field instanceof PDFTextField && typeof value === 'string') {
          field.setText(value);
        } else if (field instanceof PDFCheckBox && typeof value === 'boolean') {
          if (value) {
            field.check();
          } else {
            field.uncheck();
          }
        } else if (field instanceof PDFDropdown) {
          if (Array.isArray(value) && value.length > 0) {
            field.select(value);
          } else if (typeof value === 'string') {
            field.select(value);
          }
        } else if (field instanceof PDFRadioGroup && typeof value === 'string') {
          field.select(value);
        } else if (field instanceof PDFOptionList && Array.isArray(value)) {
          field.select(value);
        }
      } catch (fieldError) {
        console.warn(`Could not update field ${fieldName}:`, fieldError);
      }
    }

    // The annotation logic will be handled by the existing exportPDFWithAnnotations
    // This function ensures form fields are preserved during the process
    
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error preserving form fields with annotations:', error);
    throw error;
  }
}