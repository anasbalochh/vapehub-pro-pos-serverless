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
  fieldConfigApi,
  industriesApi,
  userIndustryApi
} from "@/lib/multi-industry-api";
import type {
  DynamicProduct,
  Industry,
  ProductFieldConfig,
  ProductFormData,
  UserIndustrySettings
} from '@/types/multi-industry';
import { Edit, MinusCircle, Plus, PlusCircle, Search, Settings, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const Products = () => {
  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [fields, setFields] = useState<ProductFieldConfig[]>([]);
  const [userIndustry, setUserIndustry] = useState<UserIndustrySettings | null>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DynamicProduct | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  // Load all data
  const loadData = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const [productsResponse, fieldsResponse, industryResponse, industriesResponse] = await Promise.all([
        dynamicProductsApi.list(user.id, debouncedSearchTerm),
        fieldConfigApi.getUserFields(user.id),
        userIndustryApi.get(user.id),
        industriesApi.list()
      ]);

      setProducts(productsResponse.data);
      setFields(fieldsResponse.data);
      setUserIndustry(industryResponse.data);
      setIndustries(industriesResponse.data);

      // If user has no industry set, show industry selection
      if (!industryResponse.data) {
        toast.info('Please select your business type to continue');
      }

      // If user has no field configurations, initialize from industry
      if (fieldsResponse.data.length === 0 && industryResponse.data) {
        await fieldConfigApi.initializeFromIndustry(user.id, industryResponse.data.industryId);
        const updatedFields = await fieldConfigApi.getUserFields(user.id);
        setFields(updatedFields.data);
      }

    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
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
      // Show user-friendly error message
      const errorMessage = error?.message || 'Failed to save product. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit product
  const handleEdit = (product: DynamicProduct) => {
    // Convert product to form data
    const formData: ProductFormData = {
      sku: product.sku,
      name: product.name,
      brand: product.brand,
      category: product.category,
      salePrice: product.salePrice,
      retailPrice: product.retailPrice,
      stock: product.stock,
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
      // Show user-friendly error message
      const errorMessage = error?.message || 'Failed to delete product. Please try again.';
      toast.error(errorMessage);
    }
  };

  // Handle stock update
  const handleStockUpdate = async (productId: string, delta: number) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const newStock = Math.max(0, product.stock + delta);
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

  // Get current industry info
  const currentIndustry = useMemo(() => {
    if (!userIndustry) return null;
    return industries.find(ind => ind.id === userIndustry.industryId);
  }, [userIndustry, industries]);

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
            Manage your {currentIndustry?.displayName.toLowerCase() || 'business'} products
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

      {/* Industry Info */}
      {currentIndustry && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm"
                style={{ backgroundColor: currentIndustry.color }}
              >
                {currentIndustry.displayName.charAt(0)}
              </div>
              {currentIndustry.displayName} Configuration
            </CardTitle>
            <CardDescription>
              {currentIndustry.description}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

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
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Product
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Category</TableHead>
                    {visibleFields.slice(4).map(field => (
                      <TableHead key={field.fieldKey}>{field.fieldLabel}</TableHead>
                    ))}
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.sku}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.brand}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{product.category}</Badge>
                      </TableCell>
                      {visibleFields.slice(4).map(field => (
                        <TableCell key={field.fieldKey}>
                          {field.fieldType === 'boolean'
                            ? (product.customData[field.fieldKey] ? 'Yes' : 'No')
                            : Array.isArray(product.customData[field.fieldKey])
                              ? product.customData[field.fieldKey].join(', ')
                              : product.customData[field.fieldKey] || '-'
                          }
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">₨{product.salePrice}</span>
                          {product.retailPrice && (
                            <span className="text-sm text-muted-foreground">
                              ₨{product.retailPrice}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStockUpdate(product.id, -1)}
                            disabled={product.stock <= 0}
                          >
                            <MinusCircle className="h-3 w-3" />
                          </Button>
                          <span className="min-w-[3rem] text-center">{product.stock}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStockUpdate(product.id, 1)}
                          >
                            <PlusCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
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
