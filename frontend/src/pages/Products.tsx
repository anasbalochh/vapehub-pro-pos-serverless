import { DynamicProductForm } from "@/components/DynamicProductForm";
import { FieldSettings } from "@/components/FieldSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import {
    dynamicProductsApi,
    fieldConfigApi
} from "@/lib/multi-industry-api";
import type {
    DynamicProduct,
    ProductFieldConfig,
    ProductFormData
} from '@/types/multi-industry';
import { Edit, Plus, Search, Settings, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const Products = () => {
  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [fields, setFields] = useState<ProductFieldConfig[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DynamicProduct | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
    const { user } = useAuth();

  // Initialize default fields for new users
  const initializeDefaultFields = async (userId: string) => {
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
          displayOrder: 1,
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
          displayOrder: 2,
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
          displayOrder: 3,
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
          displayOrder: 4,
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
          displayOrder: 5,
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
          displayOrder: 6,
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
          displayOrder: 7,
          isCustom: false
        }
      ];

      // Add each default field
      for (const field of defaultFields) {
        await fieldConfigApi.addCustomField(userId, field);
      }

      toast.success('Default fields initialized successfully');
    } catch (error: any) {
      console.error('Failed to initialize default fields:', error);
      toast.error('Failed to initialize default fields');
    }
  };

  // Load all data
  const loadData = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const [productsResponse, fieldsResponse] = await Promise.all([
        dynamicProductsApi.list(user.id, debouncedSearchTerm),
        fieldConfigApi.getUserFields(user.id)
      ]);

      setProducts(productsResponse.data || []);
      setFields(fieldsResponse.data || []);

      // Initialize default fields if user has no fields configured
      if (fieldsResponse.data.length === 0) {
        await initializeDefaultFields(user.id);
        // Reload fields after initialization
        const updatedFieldsResponse = await fieldConfigApi.getUserFields(user.id);
        setFields(updatedFieldsResponse.data || []);
      }

    } catch (error: any) {
      console.error('Failed to load data:', error);

      // Check if it's a database/permission error
      if (error.message?.includes('permission') ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist') ||
          error.message?.includes('COMPLETE_DATABASE_FIX.sql') ||
          error.status === 400) {
        toast.error('Database setup required. Please run the COMPLETE_DATABASE_FIX.sql script in Supabase SQL Editor.');
      } else {
        toast.error('Failed to load data. Please check your connection.');
      }

      // Set empty arrays as fallback
      setProducts([]);
      setFields([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, debouncedSearchTerm]);

  // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        if (user?.id) {
      loadData();
    }
  }, [user?.id, loadData]);

  // Handle form submission
  const handleFormSubmit = async (formData: ProductFormData) => {
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        // Update existing product
        await dynamicProductsApi.update(editingProduct.id, formData);
        toast.success('Product updated successfully');
      } else {
        // Create new product
        await dynamicProductsApi.create(user.id, formData);
        toast.success('Product created successfully');
      }

      // Reload data
      await loadData();
      setIsFormOpen(false);
      setEditingProduct(null);

    } catch (error: any) {
      console.error('Failed to save product:', error);

      // Show specific error messages based on error type
      let errorMessage = 'Failed to save product';

      if (error.message) {
        if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please check your database access.';
        } else if (error.message.includes('duplicate')) {
          errorMessage = 'A product with this information already exists.';
        } else if (error.message.includes('validation')) {
          errorMessage = 'Please check your input data and try again.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('invalid input syntax')) {
          errorMessage = 'Invalid data format. Please check your field values.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit product
  const handleEdit = (product: DynamicProduct) => {
    // Convert product to form data - check both direct properties and customData
    const formData: ProductFormData = {
      sku: product.sku || '',
      name: product.name || '',
      brand: product.brand || '',
      category: product.category || '',
      salePrice: product.salePrice || product.customData?.salePrice || '',
      retailPrice: product.retailPrice || product.customData?.retailPrice || '',
      stock: product.stock || product.customData?.stock || '',
      ...product.customData
    };

    setEditingProduct(product);
    setIsFormOpen(true);
  };

  // Handle delete product
  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await dynamicProductsApi.delete(productId);
      toast.success('Product deleted successfully');
      await loadData();
        } catch (error: any) {
      console.error('Failed to delete product:', error);
      toast.error('Failed to delete product');
    }
  };

  // Handle stock update
    const handleStockUpdate = async (productId: string, delta: number) => {
        try {
      const product = products.find(p => p.id === productId);
            if (!product) return;

            const newStock = Math.max(0, Math.round(product.stock + delta));
      const updatedData: ProductFormData = {
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        category: product.category,
        salePrice: product.salePrice,
        retailPrice: product.retailPrice,
        stock: newStock,
        ...product.customData
      };

      await dynamicProductsApi.update(productId, updatedData);

      // Update UI immediately
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, stock: newStock } : p
      ));

      toast.success('Stock updated successfully');
        } catch (error: any) {
            console.error('Failed to update stock:', error);
            toast.error('Failed to update stock');
        }
    };

  // Handle fields updated
  const handleFieldsUpdated = async () => {
    if (!user?.id) return;
    const fieldsResponse = await fieldConfigApi.getUserFields(user.id);
    setFields(fieldsResponse.data);
  };

  // Get visible fields for table display
  const visibleFields = useMemo(() => {
    return fields.filter(field => field.isActive).slice(0, 6); // Show first 6 fields
  }, [fields]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
                <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Manage your products with customizable fields
                    </p>
                </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Field Settings
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                            Add Product
                        </Button>
                    </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                            </DialogTitle>
                <DialogDescription>
                  {editingProduct
                    ? 'Update the product information below.'
                    : 'Fill in the product information below.'
                  }
                            </DialogDescription>
                        </DialogHeader>
              <DynamicProductForm
                fields={fields}
                initialData={editingProduct ? {
                  sku: editingProduct.sku,
                  name: editingProduct.name,
                  brand: editingProduct.brand,
                  category: editingProduct.category,
                  salePrice: editingProduct.salePrice,
                  retailPrice: editingProduct.retailPrice,
                  stock: editingProduct.stock,
                  ...editingProduct.customData
                } : {}}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingProduct(null);
                }}
                isLoading={isSubmitting}
                submitLabel={editingProduct ? 'Update Product' : 'Add Product'}
              />
            </DialogContent>
          </Dialog>
                                    </div>
                                </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                        <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
                                        />
                                    </div>
                                </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({products.length})</CardTitle>
          <CardDescription>
            {products.length === 0
              ? 'No products found. Add your first product to get started.'
              : `Showing ${products.length} products`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No products found</p>
              {fields.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Configure your product fields first to start adding products.
                  </p>
                  <Button onClick={() => setIsSettingsOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Fields
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Product
                </Button>
              )}
            </div>
          ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                  <TableRow>
                    {visibleFields.map(field => (
                      <TableHead key={field.fieldKey}>{field.fieldLabel}</TableHead>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      {visibleFields.map(field => (
                        <TableCell key={field.fieldKey}>
                          {(() => {
                            // Get the value from customData or direct product property
                            const value = product.customData?.[field.fieldKey] || product[field.fieldKey];

                            if (field.fieldType === 'boolean') {
                              return value ? 'Yes' : 'No';
                            } else if (Array.isArray(value)) {
                              return value.join(', ');
                            } else if (field.fieldType === 'date' && value) {
                              // Format date fields properly - handle both MM/DD/YYYY and ISO formats
                              try {
                                let date;
                                if (value.includes('/')) {
                                  // Handle MM/DD/YYYY format
                                  const [month, day, year] = value.split('/');
                                  date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                } else {
                                  // Handle ISO format
                                  date = new Date(value);
                                }

                                if (!isNaN(date.getTime())) {
                                  return date.toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit'
                                  });
                                }
                              } catch (e) {
                                // If date parsing fails, return original value
                              }
                              return value;
                            } else {
                              return value || '-';
                            }
                          })()}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                        </TableBody>
                    </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Field Configuration</DialogTitle>
            <DialogDescription>
              Customize your product fields to match your business needs
                        </DialogDescription>
                    </DialogHeader>
          {user?.id && (
            <FieldSettings
              userId={user.id}
              onFieldsUpdated={handleFieldsUpdated}
            />
          )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Products;
