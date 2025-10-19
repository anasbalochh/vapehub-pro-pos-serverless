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
  const sortedFields = [...fields]
    .filter(field => field.fieldKey && field.fieldKey.trim() !== '')
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // Initialize form data and date values
  useEffect(() => {
    const initialFormData: ProductFormData = {};
    const initialDateValues: { [key: string]: Date | undefined } = {};

    sortedFields.forEach(field => {
      if (!field.fieldKey) {
        return;
      }

      if (initialData[field.fieldKey] !== undefined) {
        initialFormData[field.fieldKey] = initialData[field.fieldKey];

        if (field.fieldType === 'date' && initialData[field.fieldKey]) {
          initialDateValues[field.fieldKey] = new Date(initialData[field.fieldKey]);
        }
      } else {
        // Set default values
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
  }, [fields, initialData]);

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
        const numValue = Number(value);
        if (isNaN(numValue)) {
          newErrors[field.fieldKey] = `${field.fieldLabel} must be a valid number`;
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
    const value = formData[field.fieldKey];
    const error = errors[field.fieldKey];

    const baseInputProps = {
      className: cn(
        "bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary",
        error && "border-destructive focus:ring-destructive"
      )
    };

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
        return (
          <Input
            {...baseInputProps}
            type="number"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
            placeholder={field.placeholderText || `Enter ${field.fieldLabel?.toLowerCase() || 'value'}`}
            min={field.validationRules?.min}
            max={field.validationRules?.max}
            step="0.01"
          />
        );

      case 'select':
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
            <h3 className="text-lg font-semibold mb-2">No Fields Configured</h3>
            <p>Please configure your product fields in Field Settings first.</p>
            <p className="text-sm mt-2">This allows you to customize the form for your specific business needs.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedFields.map((field) => (
            <div key={field.fieldKey} className="space-y-2">
              <Label
                htmlFor={field.fieldKey}
                className="text-sm font-medium text-foreground"
              >
                {field.fieldLabel}
                {field.isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>

              {renderField(field)}

              {field.helpText && (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              )}

              {errors[field.fieldKey] && (
                <p className="text-sm text-destructive">{errors[field.fieldKey]}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-4">
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
          {isLoading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
};
