// Multi-Industry POS Field Configuration Types
// Add this to your existing types or create a new file

export interface Industry {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  description: string;
  defaultFields: ProductField[];
  defaultCategories: string[];
  isActive: boolean;
  createdAt: string;
}

export interface ProductField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'boolean' | 'multiselect';
  required: boolean;
  active: boolean;
  options?: string[];
  validationRules?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  placeholderText?: string;
  helpText?: string;
  order: number;
  isCustom: boolean;
}

export interface UserIndustrySettings {
  id: string;
  userId: string;
  industryId: string;
  businessName: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  taxName: string;
  customCategories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductFieldConfig {
  id: string;
  userId: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
  isActive: boolean;
  fieldOptions: string[];
  validationRules: Record<string, any>;
  placeholderText: string;
  helpText: string;
  displayOrder: number;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DynamicProduct {
  id: string;
  userId: string;
  industryId: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  salePrice: number;
  retailPrice?: number;
  stock: number;
  customData: Record<string, any>;
  fieldConfigVersion: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FieldValidationError {
  fieldKey: string;
  message: string;
}

export interface ProductFormData {
  [key: string]: any;
}
