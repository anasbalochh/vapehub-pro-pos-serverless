import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fieldConfigApi } from '@/lib/multi-industry-api';
import type { ProductFieldConfig } from '@/types/multi-industry';
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { Edit, GripVertical, Plus, Save, Settings, Trash2, X } from "lucide-react";
import React, { useEffect, useState } from 'react';
import { toast } from "sonner";

interface FieldSettingsProps {
  userId: string;
  onFieldsUpdated: () => void;
}

interface FieldEditState {
  [key: string]: boolean;
}

export const FieldSettings: React.FC<FieldSettingsProps> = ({
  userId,
  onFieldsUpdated
}) => {
  const [fields, setFields] = useState<ProductFieldConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingFields, setEditingFields] = useState<FieldEditState>({});
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState<Partial<ProductFieldConfig>>({
    fieldKey: '',
    fieldLabel: '',
    fieldType: 'text',
    isRequired: false,
    isActive: true,
    fieldOptions: [],
    placeholderText: '',
    helpText: '',
    displayOrder: 0,
    isCustom: true
  });

  // Load fields - updated to remove industries
  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const fieldsResponse = await fieldConfigApi.getUserFields(userId);
      setFields(fieldsResponse.data);
    } catch (error) {
      console.error('Failed to load field settings:', error);
      toast.error('Failed to load field settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle drag and drop reordering
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const newFields = Array.from(fields);
    const [reorderedItem] = newFields.splice(result.source.index, 1);
    newFields.splice(result.destination.index, 0, reorderedItem);

    // Update display order
    const fieldOrders = newFields.map((field, index) => ({
      fieldKey: field.fieldKey,
      order: index + 1
    }));

    try {
      await fieldConfigApi.reorderFields(userId, fieldOrders);
      setFields(newFields);
      onFieldsUpdated(); // Notify parent component
      toast.success('Field order updated');
    } catch (error) {
      console.error('Failed to reorder fields:', error);
      toast.error('Failed to reorder fields');
    }
  };

  // Toggle field active state
  const toggleFieldActive = async (fieldKey: string, isActive: boolean) => {
    if (!fieldKey) {
      console.error('Field key is undefined');
      toast.error('Invalid field key');
      return;
    }

    // Prevent disabling all fields
    if (!isActive && fields.filter(f => f.isActive).length <= 1) {
      toast.error('At least one field must remain active');
      return;
    }

    try {
      await fieldConfigApi.updateField(userId, fieldKey, { isActive });
      setFields(prev => prev.map(field =>
        field.fieldKey === fieldKey ? { ...field, isActive } : field
      ));
      onFieldsUpdated(); // Notify parent component
      toast.success(`Field ${isActive ? 'enabled' : 'disabled'} successfully`);
    } catch (error: any) {
      console.error('Failed to toggle field:', error);
      toast.error(error.message || 'Failed to update field');
    }
  };

  // Toggle field required state
  const toggleFieldRequired = async (fieldKey: string, isRequired: boolean) => {
    if (!fieldKey) {
      console.error('Field key is undefined');
      toast.error('Invalid field key');
      return;
    }

    try {
      await fieldConfigApi.updateField(userId, fieldKey, { isRequired });
      setFields(prev => prev.map(field =>
        field.fieldKey === fieldKey ? { ...field, isRequired } : field
      ));
      onFieldsUpdated(); // Notify parent component
      toast.success(`Field requirement ${isRequired ? 'enabled' : 'disabled'} successfully`);
    } catch (error: any) {
      console.error('Failed to toggle field requirement:', error);
      toast.error(error.message || 'Failed to update field');
    }
  };

  // Start editing field
  const startEditing = (fieldKey: string) => {
    setEditingFields(prev => ({ ...prev, [fieldKey]: true }));
  };

  // Cancel editing
  const cancelEditing = (fieldKey: string) => {
    setEditingFields(prev => ({ ...prev, [fieldKey]: false }));
  };

  // Save field changes
  const saveFieldChanges = async (fieldKey: string, updates: Partial<ProductFieldConfig>) => {
    try {
      await fieldConfigApi.updateField(userId, fieldKey, updates);
      setFields(prev => prev.map(field =>
        field.fieldKey === fieldKey ? { ...field, ...updates } : field
      ));
      setEditingFields(prev => ({ ...prev, [fieldKey]: false }));
      onFieldsUpdated(); // Notify parent component
      toast.success('Field updated successfully');
    } catch (error) {
      console.error('Failed to update field:', error);
      toast.error('Failed to update field');
    }
  };

  // Delete custom field
  const deleteCustomField = async (fieldKey: string) => {
    if (!confirm('Are you sure you want to delete this custom field?')) return;

    // Prevent deleting all fields
    if (fields.length <= 1) {
      toast.error('Cannot delete the last remaining field');
      return;
    }

    try {
      await fieldConfigApi.deleteCustomField(userId, fieldKey);
      setFields(prev => prev.filter(field => field.fieldKey !== fieldKey));
      onFieldsUpdated(); // Notify parent component
      toast.success('Custom field deleted');
    } catch (error: any) {
      console.error('Failed to delete field:', error);
      toast.error(error.message || 'Failed to delete field');
    }
  };

  // Helper function to sanitize field key (convert to valid format)
  const sanitizeFieldKey = (input: string): string => {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9_]/g, '_') // Replace any non-alphanumeric/underscore with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single underscore
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  };

  // Helper function to generate field key from label
  const generateFieldKeyFromLabel = (label: string): string => {
    if (!label) return '';
    return sanitizeFieldKey(label);
  };

  // Add new custom field
  const addCustomField = async () => {
    if (!newField.fieldKey || !newField.fieldLabel) {
      toast.error('Field key and label are required');
      return;
    }

    // Sanitize the field key before validation
    const sanitizedKey = sanitizeFieldKey(newField.fieldKey);
    if (sanitizedKey !== newField.fieldKey) {
      // Update the field key with sanitized version
      setNewField(prev => ({ ...prev, fieldKey: sanitizedKey }));
    }

    // Check if field key already exists (case-insensitive)
    const existingField = fields.find(field =>
      field.fieldKey.toLowerCase() === sanitizedKey.toLowerCase()
    );

    if (existingField) {
      toast.error(`A field with key "${sanitizedKey}" already exists`);
      return;
    }

    // Validate field key format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(sanitizedKey)) {
      toast.error('Field key can only contain letters, numbers, and underscores');
      return;
    }

    try {
      const nextOrder = Math.max(...fields.map(f => f.displayOrder), 0) + 1;
      await fieldConfigApi.addCustomField(userId, {
        ...newField,
        fieldKey: sanitizedKey,
        displayOrder: nextOrder
      } as ProductFieldConfig);

      setShowAddField(false);
      setNewField({
        fieldKey: '',
        fieldLabel: '',
        fieldType: 'text',
        isRequired: false,
        isActive: true,
        fieldOptions: [],
        placeholderText: '',
        helpText: '',
        displayOrder: 0,
        isCustom: true
      });

      loadData(); // Reload to get the new field
      onFieldsUpdated(); // Notify parent component to refresh fields
      toast.success('Custom field added successfully');
    } catch (error: any) {
      console.error('Failed to add custom field:', error);
      toast.error(error.message || 'Failed to add custom field');
    }
  };

  // Initialize default fields
  const initializeDefaultFields = async () => {
    try {
      const defaultFields = [
        {
          fieldKey: 'sku',
          fieldLabel: 'SKU',
          fieldType: 'text' as const,
          isRequired: true,
          isActive: true,
          fieldOptions: [],
          validationRules: {},
          placeholderText: 'Enter product SKU',
          helpText: 'Unique product identifier',
          displayOrder: Math.max(...fields.map(f => f.displayOrder), 0) + 1,
          isCustom: false
        },
        {
          fieldKey: 'name',
          fieldLabel: 'Product Name',
          fieldType: 'text' as const,
          isRequired: true,
          isActive: true,
          fieldOptions: [],
          validationRules: {},
          placeholderText: 'Enter product name',
          helpText: 'Name of the product',
          displayOrder: Math.max(...fields.map(f => f.displayOrder), 0) + 2,
          isCustom: false
        },
        {
          fieldKey: 'brand',
          fieldLabel: 'Brand',
          fieldType: 'text' as const,
          isRequired: false,
          isActive: true,
          fieldOptions: [],
          validationRules: {},
          placeholderText: 'Enter brand name',
          helpText: 'Product brand',
          displayOrder: Math.max(...fields.map(f => f.displayOrder), 0) + 3,
          isCustom: false
        },
        {
          fieldKey: 'category',
          fieldLabel: 'Category',
          fieldType: 'text' as const,
          isRequired: false,
          isActive: true,
          fieldOptions: [],
          validationRules: {},
          placeholderText: 'Enter category',
          helpText: 'Product category',
          displayOrder: Math.max(...fields.map(f => f.displayOrder), 0) + 4,
          isCustom: false
        },
        {
          fieldKey: 'salePrice',
          fieldLabel: 'Sale Price',
          fieldType: 'number' as const,
          isRequired: true,
          isActive: true,
          fieldOptions: [],
          validationRules: { min: 0 },
          placeholderText: 'Enter sale price',
          helpText: 'Price at which product is sold',
          displayOrder: Math.max(...fields.map(f => f.displayOrder), 0) + 5,
          isCustom: false
        },
        {
          fieldKey: 'retailPrice',
          fieldLabel: 'Retail Price',
          fieldType: 'number' as const,
          isRequired: false,
          isActive: true,
          fieldOptions: [],
          validationRules: { min: 0 },
          placeholderText: 'Enter retail price',
          helpText: 'Original retail price',
          displayOrder: Math.max(...fields.map(f => f.displayOrder), 0) + 6,
          isCustom: false
        },
        {
          fieldKey: 'stock',
          fieldLabel: 'Stock',
          fieldType: 'number' as const,
          isRequired: true,
          isActive: true,
          fieldOptions: [],
          validationRules: { min: 0 },
          placeholderText: 'Enter stock quantity',
          helpText: 'Available stock quantity',
          displayOrder: Math.max(...fields.map(f => f.displayOrder), 0) + 7,
          isCustom: false
        }
      ];

      // Filter out fields that already exist
      const fieldsToAdd = defaultFields.filter(defaultField =>
        !fields.some(existingField =>
          existingField.fieldKey.toLowerCase() === defaultField.fieldKey.toLowerCase()
        )
      );

      if (fieldsToAdd.length === 0) {
        toast.info('All default fields already exist');
        return;
      }

      // Add each default field that doesn't exist
      for (const field of fieldsToAdd) {
        await fieldConfigApi.addCustomField(userId, field);
      }

      loadData(); // Reload to get the new fields
      onFieldsUpdated(); // Notify parent component
      toast.success(`${fieldsToAdd.length} default field(s) added successfully`);
    } catch (error: any) {
      console.error('Failed to initialize default fields:', error);
      toast.error(error.message || 'Failed to add default fields');
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading field settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Field Configuration</h2>
          <p className="text-muted-foreground">Customize your product fields</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAddField(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Custom Field
          </Button>
          <Button
            variant="secondary"
            onClick={initializeDefaultFields}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Add Default Fields
          </Button>
        </div>
      </div>

      {/* Add Custom Field Form - Show at TOP when active */}
      {showAddField && (
        <Card className="border-2 border-primary/20 overflow-visible">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Add Custom Field
                </CardTitle>
                <CardDescription className="mt-1">Create a new custom field for your products</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddField(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 overflow-visible">
            {/* Main Field Data Section - Top */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Settings className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Field Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fieldLabel" className="text-sm font-medium">
                    Display Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fieldLabel"
                    value={newField.fieldLabel || ''}
                    onChange={(e) => {
                      const label = e.target.value;
                      setNewField(prev => {
                        // Auto-generate field key from label if field key is empty or matches previous label
                        const shouldAutoGenerate = !prev.fieldKey ||
                          prev.fieldKey === generateFieldKeyFromLabel(prev.fieldLabel || '');
                        return {
                          ...prev,
                          fieldLabel: label,
                          fieldKey: shouldAutoGenerate ? generateFieldKeyFromLabel(label) : prev.fieldKey
                        };
                      });
                    }}
                    placeholder="e.g., Warranty Period"
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the name users will see when filling out the form
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fieldKey" className="text-sm font-medium">
                    Field Name (Internal) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fieldKey"
                    value={newField.fieldKey || ''}
                    onChange={(e) => {
                      const sanitized = sanitizeFieldKey(e.target.value);
                      setNewField(prev => ({ ...prev, fieldKey: sanitized }));
                    }}
                    placeholder="e.g., warranty_period"
                    className="bg-background font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Only letters, numbers, and underscores allowed
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 relative z-0">
                  <Label htmlFor="fieldType" className="text-sm font-medium">
                    Input Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={newField.fieldType}
                    onValueChange={(value) => setNewField(prev => ({ ...prev, fieldType: value as any }))}
                  >
                    <SelectTrigger id="fieldType" className="bg-background">
                      <SelectValue placeholder="Select input type" />
                    </SelectTrigger>
                    <SelectContent
                      side="bottom"
                      sideOffset={8}
                      align="start"
                      position="item-aligned"
                      className="z-[9999] shadow-xl border-2 !transition-none !duration-0"
                      style={{ transition: 'none', animation: 'none' }}
                    >
                      <SelectItem value="text">Text Input</SelectItem>
                      <SelectItem value="number">Number Input</SelectItem>
                      <SelectItem value="select">Dropdown Menu</SelectItem>
                      <SelectItem value="multiselect">Multiple Choice</SelectItem>
                      <SelectItem value="date">Date Picker</SelectItem>
                      <SelectItem value="boolean">Yes/No Toggle</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose how users will input data for this field
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="placeholderText" className="text-sm font-medium">
                    Hint Text
                  </Label>
                  <Input
                    id="placeholderText"
                    value={newField.placeholderText || ''}
                    onChange={(e) => setNewField(prev => ({ ...prev, placeholderText: e.target.value }))}
                    placeholder="e.g., Enter warranty period in months"
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Helpful text shown inside the input field
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="helpText" className="text-sm font-medium">
                  Description
                </Label>
                <Input
                  id="helpText"
                  value={newField.helpText || ''}
                  onChange={(e) => setNewField(prev => ({ ...prev, helpText: e.target.value }))}
                  placeholder="e.g., This field helps track product warranty information"
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Additional information about this field (optional)
                </p>
              </div>
            </div>

            {/* Field Options Section - Bottom */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2 pb-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm text-muted-foreground">Field Options</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between p-3 bg-background rounded-md border">
                  <div className="space-y-0.5">
                    <Label htmlFor="isRequired" className="text-sm font-medium cursor-pointer">
                      Required Field
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Users must fill this field
                    </p>
                  </div>
                  <Switch
                    id="isRequired"
                    checked={newField.isRequired || false}
                    onCheckedChange={(checked) => setNewField(prev => ({ ...prev, isRequired: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-background rounded-md border">
                  <div className="space-y-0.5">
                    <Label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
                      Show Field
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Display this field in forms
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={newField.isActive !== false}
                    onCheckedChange={(checked) => setNewField(prev => ({ ...prev, isActive: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={addCustomField} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Create Field
              </Button>
              <Button variant="outline" onClick={() => setShowAddField(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Field List - Show at BOTTOM */}
      <Card>
        <CardHeader>
          <CardTitle>Product Fields</CardTitle>
          <CardDescription>Drag to reorder, toggle to enable/disable</CardDescription>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="fields">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {fields.filter(field => field.fieldKey).map((field, index) => (
                    <Draggable key={field.fieldKey} draggableId={field.fieldKey} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`p-4 border rounded-lg bg-card ${snapshot.isDragging ? 'shadow-lg' : ''
                            }`}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab hover:cursor-grabbing"
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium">{field.fieldLabel}</h3>
                                <Badge variant="secondary">{field.fieldType}</Badge>
                                {field.isRequired && <Badge variant="destructive">Required</Badge>}
                                {field.isCustom && <Badge variant="outline">Custom</Badge>}
                              </div>

                              {editingFields[field.fieldKey] ? (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input
                                      value={field.fieldLabel}
                                      onChange={(e) => setFields(prev => prev.map(f =>
                                        f.fieldKey === field.fieldKey
                                          ? { ...f, fieldLabel: e.target.value }
                                          : f
                                      ))}
                                      placeholder="Field Label"
                                    />
                                    <Input
                                      value={field.placeholderText || ''}
                                      onChange={(e) => setFields(prev => prev.map(f =>
                                        f.fieldKey === field.fieldKey
                                          ? { ...f, placeholderText: e.target.value }
                                          : f
                                      ))}
                                      placeholder="Placeholder Text"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => saveFieldChanges(field.fieldKey, {
                                        fieldLabel: field.fieldLabel,
                                        placeholderText: field.placeholderText
                                      })}
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => cancelEditing(field.fieldKey)}
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={field.isActive}
                                      onCheckedChange={(checked) => toggleFieldActive(field.fieldKey, checked)}
                                    />
                                    <Label className="text-sm">Active</Label>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={field.isRequired}
                                      onCheckedChange={(checked) => toggleFieldRequired(field.fieldKey, checked)}
                                    />
                                    <Label className="text-sm">Required</Label>
                                  </div>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEditing(field.fieldKey)}
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>

                                  {field.isCustom && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => deleteCustomField(field.fieldKey)}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Delete
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>
    </div>
  );
};
