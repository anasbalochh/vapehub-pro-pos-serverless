import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ProductFieldConfig, ProductFormData } from '@/types/multi-industry';
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import React, { useEffect, useState } from 'react';
import { toast } from "sonner";

interface DynamicProductFormProps {
  fields: ProductFieldConfig[];
  initialData?: ProductFormData;
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

interface FormErrors {
  [key: string]: string;
}

export const DynamicProductForm: React.FC<DynamicProductFormProps> = ({
  fields,
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = "Save Product"
}) => {
  const [formData, setFormData] = useState<ProductFormData>(initialData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [dateValues, setDateValues] = useState<{ [key: string]: Date | undefined }>({});

  // Sort fields by display order and filter out invalid ones
  // Only show active fields (isActive === true)
  // Use useMemo to ensure fields are recalculated when fields prop changes
  const sortedFields = React.useMemo(() => {
    return [...fields]
      .filter(field => field.fieldKey && field.fieldKey.trim() !== '' && field.isActive !== false)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [fields]);

  // Initialize form data and date values
  // This effect ensures ALL active fields are included, even newly added ones
  useEffect(() => {
    const initialFormData: ProductFormData = {};
    const initialDateValues: { [key: string]: Date | undefined } = {};

    // Process ALL sorted fields to ensure every active field is included
    sortedFields.forEach(field => {
      if (!field.fieldKey) {
        return;
      }

      // Check if we have data for this field (from initialData)
      if (initialData[field.fieldKey] !== undefined && initialData[field.fieldKey] !== null) {
        let value = initialData[field.fieldKey];

        // Clean up number fields - remove date strings or invalid formats
        if (field.fieldType === 'number') {
          const stringValue = String(value || '').trim();

          // Check for date patterns
          const datePatterns = [
            /^\d{1,2}[-/]\d{1,2}$/,           // DD-MM or DD/MM
            /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/, // DD-MM-YYYY or DD/MM/YYYY
            /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,   // YYYY-MM-DD or YYYY/MM/DD
          ];

          // If it matches a date pattern or contains date separators, clear it
          if (datePatterns.some(pattern => pattern.test(stringValue)) ||
              (stringValue.includes('-') && !stringValue.startsWith('-')) ||
              stringValue.includes('/')) {
            value = '';
          } else {
            // Try to convert to number, if invalid, use empty string
            const numValue = Number(stringValue);
            if (isNaN(numValue) || stringValue === '') {
              value = '';
            } else {
              value = stringValue; // Keep the string representation for display
            }
          }
        }

        initialFormData[field.fieldKey] = value;

        if (field.fieldType === 'date' && initialData[field.fieldKey]) {
          initialDateValues[field.fieldKey] = new Date(initialData[field.fieldKey]);
        }
      } else {
        // Set default values for fields that don't have data yet
        // This ensures newly added fields always appear in the form
        switch (field.fieldType) {
          case 'boolean':
            initialFormData[field.fieldKey] = false;
            break;
          case 'number':
            initialFormData[field.fieldKey] = '';
            break;
          case 'multiselect':
            initialFormData[field.fieldKey] = [];
            break;
          default:
            initialFormData[field.fieldKey] = '';
        }
      }
    });

    setFormData(initialFormData);
    setDateValues(initialDateValues);
  }, [sortedFields, initialData]);

  // Clean up invalid date values in number fields (only on mount/field changes)
  useEffect(() => {
    const cleanedData = { ...formData };
    let hasChanges = false;

    sortedFields.forEach(field => {
      if (field.fieldType === 'number' && cleanedData[field.fieldKey]) {
        const stringValue = String(cleanedData[field.fieldKey] || '').trim();
        // If it looks like a date (contains dashes or slashes), clear it
        if (stringValue.includes('-') || stringValue.includes('/')) {
          cleanedData[field.fieldKey] = '';
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setFormData(cleanedData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedFields.map(f => f.fieldKey).join(',')]);

  // Handle field value changes
  const handleFieldChange = (fieldKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));

    // Clear error when user starts typing
    if (errors[fieldKey]) {
      setErrors(prev => ({
        ...prev,
        [fieldKey]: ''
      }));
    }
  };

  // Handle date changes
  const handleDateChange = (fieldKey: string, date: Date | undefined) => {
    setDateValues(prev => ({
      ...prev,
      [fieldKey]: date
    }));

    // Store date in user-friendly format (MM/DD/YYYY)
    handleFieldChange(fieldKey, date ?
      `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`
      : '');
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    sortedFields.forEach(field => {
      const value = formData[field.fieldKey];

      // Required field validation
      if (field.isRequired) {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          newErrors[field.fieldKey] = `${field.fieldLabel} is required`;
          return;
        }
      }

      // Type-specific validation
      if (value && field.fieldType === 'number') {
        // Convert string to number, handling empty strings and invalid formats
        const stringValue = String(value).trim();
        if (stringValue === '' || stringValue === null || stringValue === undefined) {
          if (field.isRequired) {
            newErrors[field.fieldKey] = `${field.fieldLabel} is required`;
            return;
          }
        } else {
          // Check if it's a date string format (contains dashes or slashes)
          if (stringValue.includes('-') || stringValue.includes('/')) {
            newErrors[field.fieldKey] = 'Please enter a number';
            return;
          }

          const numValue = Number(stringValue);
        if (isNaN(numValue)) {
            newErrors[field.fieldKey] = 'Please enter a number';
          return;
        }

        if (field.validationRules?.min !== undefined && numValue < field.validationRules.min) {
          newErrors[field.fieldKey] = `${field.fieldLabel} must be at least ${field.validationRules.min}`;
          return;
        }

        if (field.validationRules?.max !== undefined && numValue > field.validationRules.max) {
          newErrors[field.fieldKey] = `${field.fieldLabel} must be at most ${field.validationRules.max}`;
          return;
          }
        }
      }

      if (value && field.fieldType === 'text') {
        if (field.validationRules?.minLength && value.length < field.validationRules.minLength) {
          newErrors[field.fieldKey] = `${field.fieldLabel} must be at least ${field.validationRules.minLength} characters`;
          return;
        }

        if (field.validationRules?.maxLength && value.length > field.validationRules.maxLength) {
          newErrors[field.fieldKey] = `${field.fieldLabel} must be at most ${field.validationRules.maxLength} characters`;
          return;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      // Clean the form data before submission
      const cleanedFormData = { ...formData };

      // Convert empty strings to null for numeric fields
      sortedFields.forEach(field => {
        if (field.fieldType === 'number' && cleanedFormData[field.fieldKey] === '') {
          cleanedFormData[field.fieldKey] = null;
        }
      });

      onSubmit(cleanedFormData);
    }
  };

  // Render field based on type
  const renderField = (field: ProductFieldConfig) => {
    // Safety check - ensure field is valid
    if (!field || !field.fieldKey) {
      if (process.env.NODE_ENV === 'development') {
        console.error('renderField: Invalid field passed', field);
      }
      return (
        <Input
          className="bg-secondary border-border text-foreground"
          value=""
          placeholder="Invalid field configuration"
          disabled
        />
      );
    }

    const value = formData[field.fieldKey] !== undefined ? formData[field.fieldKey] : '';
    const error = errors[field.fieldKey];

    const baseInputProps = {
      className: cn(
        "bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary",
        error && "border-destructive focus:ring-destructive"
      )
    };

    // Log field info for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('renderField:', {
        fieldKey: field.fieldKey,
        fieldLabel: field.fieldLabel,
        fieldType: field.fieldType,
        value: value,
        hasValue: value !== undefined && value !== null && value !== ''
      });
    }

    switch (field.fieldType) {
      case 'text':
        return (
          <Input
            {...baseInputProps}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
            placeholder={field.placeholderText || `Enter ${field.fieldLabel?.toLowerCase() || 'value'}`}
          />
        );

      case 'number':
        // Ensure we have a valid number value, not a date string
        let numberValue = value || '';

        // Clean up date-formatted values immediately
        if (typeof numberValue === 'string') {
          // Remove any date separators (dashes, slashes, dots in date format)
          const cleanedValue = numberValue
            .replace(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/, '') // Remove date format DD-MM-YYYY or DD/MM/YYYY
            .replace(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/, ''); // Remove date format YYYY-MM-DD or YYYY/MM/DD

          if (cleanedValue !== numberValue) {
            numberValue = '';
            // Clear immediately
            handleFieldChange(field.fieldKey, '');
          } else if (numberValue.includes('-') || numberValue.includes('/')) {
            // If still contains date separators, clear it
            numberValue = '';
            handleFieldChange(field.fieldKey, '');
          }
        }

        return (
          <Input
            {...baseInputProps}
            type="number"
            value={numberValue}
            onChange={(e) => {
              const inputValue = e.target.value;

              // Block date format patterns immediately
              // Patterns like: "12-11", "12/11", "12-11-2025", "2025-11-12", etc.
              const datePatterns = [
                /^\d{1,2}[-/]\d{1,2}$/,           // DD-MM or DD/MM
                /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/, // DD-MM-YYYY or DD/MM/YYYY
                /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,   // YYYY-MM-DD or YYYY/MM/DD
              ];

              // Check if input matches any date pattern
              if (datePatterns.some(pattern => pattern.test(inputValue))) {
                // Clear immediately if it looks like a date
                handleFieldChange(field.fieldKey, '');
                toast.error('Number fields cannot accept dates. Please enter a number.');
                return;
              }

              // Block any dashes or slashes that aren't at the start (for negative numbers)
              // Check if there's a dash/slash that's not at the beginning
              if (inputValue.length > 1 && (inputValue.includes('-') || inputValue.includes('/'))) {
                const hasDashNotAtStart = inputValue.includes('-') && !inputValue.startsWith('-');
                const hasSlash = inputValue.includes('/');

                if (hasDashNotAtStart || hasSlash) {
                  // This looks like a date, block it
                  handleFieldChange(field.fieldKey, '');
                  toast.error('Number fields cannot accept dates. Please enter a number.');
                  return;
                }
              }

              // Only allow numbers, decimal point, and minus sign at the start
              if (inputValue === '') {
                handleFieldChange(field.fieldKey, '');
              } else if (/^-?\d*\.?\d*$/.test(inputValue)) {
                // Valid number format - allow it
                handleFieldChange(field.fieldKey, inputValue);
              }
              // If it doesn't match, don't update (prevents invalid characters)
            }}
            onPaste={(e) => {
              // Prevent pasting date values
              e.preventDefault();
              const pastedText = e.clipboardData.getData('text');
              // Try to extract number from pasted text
              const numberMatch = pastedText.match(/-?\d+\.?\d*/);
              if (numberMatch) {
                handleFieldChange(field.fieldKey, numberMatch[0]);
              } else {
                toast.error('Cannot paste date format. Please enter a number.');
              }
            }}
            onBlur={(e) => {
              // On blur, validate and clean the value
              const inputValue = e.target.value.trim();

              // Check for date patterns
              if (inputValue && (inputValue.includes('-') || inputValue.includes('/'))) {
                // Check if it's a date format
                const datePattern = /^\d{1,2}[-/]\d{1,2}([-/]\d{2,4})?$/;
                if (datePattern.test(inputValue)) {
                  // Clear date-formatted values
                  handleFieldChange(field.fieldKey, '');
                  toast.error('Please enter a number, not a date');
                } else if (inputValue.includes('-') && !inputValue.startsWith('-')) {
                  // Has dash but not at start (not a negative number)
                  handleFieldChange(field.fieldKey, '');
                  toast.error('Please enter a number, not a date');
                }
              }
            }}
            placeholder={field.placeholderText || `Enter ${field.fieldLabel?.toLowerCase() || 'value'} (numbers only)`}
            min={field.validationRules?.min}
            max={field.validationRules?.max}
            step={field.validationRules?.min !== undefined && Number.isInteger(field.validationRules.min) ? "1" : "0.01"}
          />
        );

      case 'select':
        // If no options, render as text input instead
        if (!field.fieldOptions || field.fieldOptions.length === 0) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`renderField: Select field "${field.fieldKey}" has no options, rendering as text input`);
          }
          return (
            <Input
              {...baseInputProps}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
              placeholder={field.placeholderText || `Enter ${field.fieldLabel?.toLowerCase() || 'value'}`}
            />
          );
        }
        return (
          <Select value={value || ''} onValueChange={(val) => handleFieldChange(field.fieldKey, val)}>
            <SelectTrigger className={cn(baseInputProps.className)}>
              <SelectValue placeholder={`Select ${field.fieldLabel?.toLowerCase() || 'value'}`} />
            </SelectTrigger>
            <SelectContent>
              {field.fieldOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        // If no options, render as text input instead
        if (!field.fieldOptions || field.fieldOptions.length === 0) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`renderField: Multiselect field "${field.fieldKey}" has no options, rendering as text input`);
          }
          return (
            <Input
              {...baseInputProps}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
              placeholder={field.placeholderText || `Enter ${field.fieldLabel?.toLowerCase() || 'value'}`}
            />
          );
        }
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.fieldOptions.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.fieldKey}-${option}`}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...selectedValues, option]
                      : selectedValues.filter(v => v !== option);
                    handleFieldChange(field.fieldKey, newValues);
                  }}
                />
                <Label htmlFor={`${field.fieldKey}-${option}`} className="text-sm">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateValues[field.fieldKey] && "text-muted-foreground",
                  baseInputProps.className
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValues[field.fieldKey] ? (
                  format(dateValues[field.fieldKey]!, "PPP")
                ) : (
                  <span>{field.placeholderText || `Select ${field.fieldLabel?.toLowerCase() || 'date'}`}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateValues[field.fieldKey]}
                onSelect={(date) => handleDateChange(field.fieldKey, date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.fieldKey}
              checked={value || false}
              onCheckedChange={(checked) => handleFieldChange(field.fieldKey, checked)}
            />
            <Label htmlFor={field.fieldKey} className="text-sm">
              {field.fieldLabel}
            </Label>
          </div>
        );

      default:
        // Default case: render as text input for any unknown field type
        // This ensures EVERY field gets an input, even if fieldType is missing or invalid
        if (process.env.NODE_ENV === 'development') {
          console.warn(`renderField: Unknown fieldType "${field.fieldType}" for field "${field.fieldKey}", rendering as text input`);
        }
        return (
          <Input
            {...baseInputProps}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
            placeholder={field.placeholderText || `Enter ${field.fieldLabel?.toLowerCase() || 'value'}`}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {sortedFields.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-muted-foreground mb-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No Fields Configured</h3>
            <p className="mb-2">Please configure your product fields in Field Settings first.</p>
            <p className="text-sm">This allows you to customize the form for your specific business needs.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Core Product Information Section */}
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-4 rounded-lg border border-primary/20">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              Core Product Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SKU Field */}
              <div className="space-y-2">
                <Label htmlFor="sku" className="text-sm font-medium text-foreground">
                  SKU (Stock Keeping Unit)
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="sku"
                  value={formData.sku || ''}
                  onChange={(e) => handleFieldChange('sku', e.target.value)}
                  placeholder="Enter product SKU (e.g., VAPE-001)"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
                />
                {errors.sku && <p className="text-sm text-destructive">{errors.sku}</p>}
              </div>

              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  Product Name
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Enter product name"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              {/* Brand Field */}
              <div className="space-y-2">
                <Label htmlFor="brand" className="text-sm font-medium text-foreground">
                  Brand
                </Label>
                <Input
                  id="brand"
                  value={formData.brand || ''}
                  onChange={(e) => handleFieldChange('brand', e.target.value)}
                  placeholder="Enter brand name"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Category Field */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium text-foreground">
                  Category
                </Label>
                <Input
                  id="category"
                  value={formData.category || ''}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  placeholder="Enter category"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Price Fields */}
              <div className="space-y-2">
                <Label htmlFor="salePrice" className="text-sm font-medium text-foreground">
                  Sale Price (₨)
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="salePrice"
                  type="number"
                  value={formData.salePrice || ''}
                  onChange={(e) => handleFieldChange('salePrice', e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
                />
                {errors.salePrice && <p className="text-sm text-destructive">{errors.salePrice}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="retailPrice" className="text-sm font-medium text-foreground">
                  Retail Price (₨)
                </Label>
                <Input
                  id="retailPrice"
                  type="number"
                  value={formData.retailPrice || ''}
                  onChange={(e) => handleFieldChange('retailPrice', e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Stock Field */}
              <div className="space-y-2">
                <Label htmlFor="stock" className="text-sm font-medium text-foreground">
                  Stock Quantity
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock || ''}
                  onChange={(e) => handleFieldChange('stock', e.target.value)}
                  placeholder="0"
                  min="0"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
                />
                {errors.stock && <p className="text-sm text-destructive">{errors.stock}</p>}
              </div>
            </div>
          </div>

          {/* Custom Fields Section - Always show if there are custom fields */}
          {(() => {
            // Filter out core fields to get only custom fields
            const coreFieldKeys = ['sku', 'name', 'brand', 'category', 'salePrice', 'retailPrice', 'stock'];
            const customFields = sortedFields.filter(field => {
              // Include all fields that are not core fields and have valid properties
              return field &&
                     field.fieldKey &&
                     field.fieldKey.trim() !== '' &&
                     !coreFieldKeys.includes(field.fieldKey) &&
                     field.isActive !== false;
            });

            // Debug: Log to help identify issues (only in development)
            if (process.env.NODE_ENV === 'development') {
              console.log('DynamicProductForm - Custom Fields Debug:', {
                totalFields: fields.length,
                sortedFieldsCount: sortedFields.length,
                customFieldsCount: customFields.length,
                customFieldKeys: customFields.map(f => f.fieldKey),
                customFieldLabels: customFields.map(f => f.fieldLabel),
                allFieldKeys: sortedFields.map(f => f.fieldKey),
                allFieldLabels: sortedFields.map(f => f.fieldLabel)
              });
            }

            // Always show the section if there are custom fields defined
            // This ensures users can always input data for their custom fields
            if (customFields.length === 0) {
              return null;
            }

            return (
            <div className="bg-gradient-to-r from-accent/5 to-primary/5 p-4 rounded-lg border border-accent/20">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                Additional Product Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields.map((field) => {
                    // Ensure field has all required properties - if not, skip it
                    if (!field || !field.fieldKey || !field.fieldLabel) {
                      if (process.env.NODE_ENV === 'development') {
                        console.error('DynamicProductForm - Invalid field detected:', field);
                      }
                      return null;
                    }

                    // Ensure field is initialized in formData before rendering
                    // This prevents issues where field value is undefined
                    const fieldValue = formData[field.fieldKey] !== undefined
                      ? formData[field.fieldKey]
                      : (field.fieldType === 'boolean'
                          ? false
                          : field.fieldType === 'multiselect'
                          ? []
                          : '');

                    // Render the field - ensure it always returns something
                    let fieldInput;
                    try {
                      fieldInput = renderField(field);
                    } catch (error) {
                      if (process.env.NODE_ENV === 'development') {
                        console.error('Error rendering field:', field.fieldKey, error);
                      }
                      // Fallback to text input if rendering fails
                      fieldInput = (
                        <Input
                          className="bg-secondary border-border text-foreground"
                          value={fieldValue || ''}
                          onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
                          placeholder={`Enter ${field.fieldLabel?.toLowerCase() || 'value'}`}
                        />
                      );
                    }

                    // Final safety check - ensure we always have a valid input
                    if (!fieldInput || (typeof fieldInput === 'object' && !fieldInput.type)) {
                      if (process.env.NODE_ENV === 'development') {
                        console.error('renderField returned invalid value for field:', {
                          fieldKey: field.fieldKey,
                          fieldLabel: field.fieldLabel,
                          fieldType: field.fieldType,
                          returnedValue: fieldInput
                        });
                      }
                      // Force fallback input
                      fieldInput = (
                        <Input
                          className="bg-secondary border-border text-foreground"
                          value={fieldValue || ''}
                          onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
                          placeholder={`Enter ${field.fieldLabel?.toLowerCase() || 'value'}`}
                        />
                      );
                    }

                    return (
                      <div key={field.fieldKey} className="space-y-2">
                        <Label
                          htmlFor={field.fieldKey}
                          className="text-sm font-medium text-foreground"
                        >
                          {field.fieldLabel}
                          {field.isRequired && <span className="text-destructive ml-1">*</span>}
                        </Label>

                        {fieldInput}

                        {field.helpText && (
                          <p className="text-xs text-muted-foreground">{field.helpText}</p>
                        )}

                        {errors[field.fieldKey] && (
                          <p className="text-sm text-destructive">{errors[field.fieldKey]}</p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
            );
          })()}
        </div>
      )}

      <div className="flex gap-3 pt-6 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 border-border hover:bg-secondary transition-all duration-200"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-gradient-primary hover:shadow-glow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || sortedFields.length === 0}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </div>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
};
