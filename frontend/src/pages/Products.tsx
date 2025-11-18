import { DynamicProductForm } from "@/components/DynamicProductForm";
import { FieldSettings } from "@/components/FieldSettings";
import { Badge } from "@/components/ui/badge";
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

  // Reload fields when edit dialog opens to ensure we have the latest fields
  useEffect(() => {
    if (isFormOpen && user?.id) {
      // Reload fields to ensure we have the latest, including newly added ones
      fieldConfigApi.getUserFields(user.id)
        .then(response => {
          setFields(response.data || []);
        })
        .catch(error => {
          console.error('Failed to reload fields when opening edit dialog:', error);
        });
    }
  }, [isFormOpen, user?.id]);

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

  // Handle fields updated - reload both fields and products to ensure form shows new fields
  const handleFieldsUpdated = async () => {
    if (!user?.id) return;
    try {
      // Reload fields
      const fieldsResponse = await fieldConfigApi.getUserFields(user.id);
      setFields(fieldsResponse.data || []);

      // Also reload products to ensure any new field data is available
      const productsResponse = await dynamicProductsApi.list(user.id, debouncedSearchTerm);
      setProducts(productsResponse.data || []);

      toast.success('Fields updated successfully. Please reopen the edit dialog to see new fields.');
    } catch (error: any) {
      console.error('Failed to refresh fields:', error);
      toast.error('Failed to refresh fields');
    }
  };

  // Get visible fields for table display - show all active fields (including those without data yet)
  const visibleFields = useMemo(() => {
    // Always show all active fields, regardless of whether they have data
    // This allows users to see and input data for all configured fields
    return fields
      .filter(field => field.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
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
    <div className="p-2 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-2">
                <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Products</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your products with customizable fields
                    </p>
                </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Settings className="h-4 w-4" />
            Field Settings
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
              <Button className="flex items-center justify-center gap-2 w-full sm:w-auto">
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
                key={`form-${fields.length}-${fields.map(f => f.fieldKey).sort().join('-')}-${editingProduct?.id || 'new'}`}
                fields={fields.filter(f => f.isActive !== false)}
                initialData={editingProduct ? (() => {
                  // Start with product's existing data
                  const baseData: ProductFormData = {
                    sku: editingProduct.sku || '',
                    name: editingProduct.name || '',
                    brand: editingProduct.brand || '',
                    category: editingProduct.category || '',
                    salePrice: editingProduct.salePrice || editingProduct.customData?.salePrice || '',
                    retailPrice: editingProduct.retailPrice || editingProduct.customData?.retailPrice || '',
                    stock: editingProduct.stock || editingProduct.customData?.stock || '',
                    // Include ALL custom data fields from the product
                    ...(editingProduct.customData || {})
                  };

                  // Ensure ALL active fields are included, even if they don't exist in the product yet
                  // This allows editing products to show newly added fields
                  const activeFields = fields.filter(f => f.isActive !== false);
                  activeFields.forEach(field => {
                    if (field.fieldKey && baseData[field.fieldKey] === undefined) {
                      // Set default values for fields that don't exist in the product yet
                      switch (field.fieldType) {
                        case 'boolean':
                          baseData[field.fieldKey] = false;
                          break;
                        case 'number':
                          baseData[field.fieldKey] = '';
                          break;
                        case 'multiselect':
                          baseData[field.fieldKey] = [];
                          break;
                        default:
                          baseData[field.fieldKey] = '';
                      }
                    }
                  });

                  return baseData;
                })() : {}}
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
                <>
                  {/* Mobile Card View */}
                  <div className="block lg:hidden space-y-3">
                    {products.map((product) => {
                      const salePrice = Number(product.customData?.['salePrice'] || product.salePrice) || 0;
                      const stock = Number(product.customData?.['stock'] || product.stock) || 0;
                      return (
                        <Card key={product.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm sm:text-base truncate">{product.name || '-'}</p>
                                <p className="text-xs text-muted-foreground">SKU: {product.sku || '-'}</p>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2 min-w-[80px]">
                                <p className="font-bold text-sm sm:text-base md:text-lg text-green-600 break-words">
                                  Rs {salePrice.toFixed(2)}
                                </p>
                                <p className={`text-xs font-medium break-words ${stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  Stock: {stock} {stock === 0 ? '(Out)' : ''}
                                </p>
                              </div>
                            </div>
                            {(product.brand || product.category) && (
                              <div className="flex gap-1 flex-wrap mb-3">
                                {product.brand && (
                                  <Badge variant="secondary" className="text-xs">{product.brand}</Badge>
                                )}
                                {product.category && (
                                  <Badge variant="outline" className="text-xs">{product.category}</Badge>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(product)}
                                className="flex-1 text-xs sm:text-sm"
                              >
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(product.id)}
                                className="flex-1 text-xs sm:text-sm"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto w-full">
                    <Table className="w-full">
                        <TableHeader>
                  <TableRow>
                    {visibleFields.map(field => (
                      <TableHead key={field.fieldKey} className="min-w-[100px]">{field.fieldLabel}</TableHead>
                    ))}
                    <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      {visibleFields.map(field => {
                        // Get the value from customData or direct product property
                        const value = product.customData?.[field.fieldKey] !== undefined
                          ? product.customData[field.fieldKey]
                          : product[field.fieldKey];

                        return (
                          <TableCell key={field.fieldKey}>
                            {(() => {
                              // Handle salePrice and retailPrice specially
                              if (field.fieldKey === 'salePrice') {
                                const price = Number(value) || 0;
                                return <span className="font-bold text-green-600 break-words">Rs {price.toFixed(2)}</span>;
                              }
                              if (field.fieldKey === 'retailPrice') {
                                const price = Number(value);
                                return price ? (
                                  <span className="text-xs text-muted-foreground line-through break-words">Rs {price.toFixed(2)}</span>
                                ) : '-';
                              }
                              if (field.fieldKey === 'stock') {
                                const stock = Number(value) || 0;
                                return (
                                  <span className={`font-medium break-words ${stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {stock} {stock === 0 ? '(Out)' : ''}
                                  </span>
                                );
                              }
                              if (field.fieldKey === 'category') {
                                return value ? (
                                  <Badge variant="outline" className="text-xs">{value}</Badge>
                                ) : '-';
                              }
                              if (field.fieldKey === 'brand') {
                                return value ? (
                                  <Badge variant="secondary" className="text-xs">{value}</Badge>
                                ) : '-';
                              }
                              // Handle other field types
                              if (field.fieldType === 'boolean') {
                                return value ? 'Yes' : 'No';
                              } else if (Array.isArray(value)) {
                                return value.join(', ');
                              } else if (field.fieldType === 'date' && value) {
                                // Format date fields properly - handle both MM/DD/YYYY and ISO formats
                                try {
                                  let date;
                                  if (typeof value === 'string' && value.includes('/')) {
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
                                return value !== null && value !== undefined && value !== '' ? String(value) : '-';
                              }
                            })()}
                          </TableCell>
                        );
                      })}
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
                </>
          )}
        </CardContent>
      </Card>

      {/* Field Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={(open) => {
        setIsSettingsOpen(open);
        // When dialog closes, refresh fields to ensure new fields are available
        if (!open) {
          handleFieldsUpdated();
        }
      }}>
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
