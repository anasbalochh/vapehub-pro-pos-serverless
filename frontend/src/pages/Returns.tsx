import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { ordersApi, printerApi } from "@/lib/api";
import { dynamicProductsApi, fieldConfigApi } from "@/lib/multi-industry-api";
import { formatCurrency } from "@/lib/utils";
import type { DynamicProduct, ProductFieldConfig } from '@/types/multi-industry';
import { Info, Minus, Plus, Printer, RefreshCw, RotateCcw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface Product {
  _id: string;
  sku: string;
  name: string;
  brand?: string;
  category?: string;
  salePrice: number;
  retailPrice?: number;
  stock: number;
  customData?: Record<string, any>;
}

interface ReturnItem extends Product {
  quantity: number;
}

const Returns = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [returnCart, setReturnCart] = useState<ReturnItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastReturn, setLastReturn] = useState<any>(null);
  const [fields, setFields] = useState<ProductFieldConfig[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { user } = useAuth();

  // Debounce search term for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadProducts = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID available, skipping products load');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Returns: Loading products for user:', user.id, 'with search term:', debouncedSearchTerm);

      // Load both products and field configurations
      const [productsResponse, fieldsResponse] = await Promise.all([
        dynamicProductsApi.list(user.id, debouncedSearchTerm),
        fieldConfigApi.getUserFields(user.id)
      ]);

      console.log('Returns: Successfully loaded', productsResponse.data.length, 'products from Supabase');
      console.log('Returns: Successfully loaded', fieldsResponse.data.length, 'field configurations');

      // Map to returns product format with custom data
      const returnProducts = productsResponse.data.map((p: DynamicProduct) => {
        // Extract prices from both main fields and customData
        const salePrice = p.salePrice || p.customData?.salePrice || 0;
        const retailPrice = p.retailPrice || p.customData?.retailPrice;

        console.log(`Returns Product ${p.name}:`, {
          mainSalePrice: p.salePrice,
          customSalePrice: p.customData?.salePrice,
          finalSalePrice: Number(salePrice) || 0,
          customData: p.customData
        });

        return {
          _id: p.id,
          sku: p.sku,
          name: p.name,
          brand: p.brand,
          category: p.category,
          salePrice: Number(salePrice) || 0,
          retailPrice: retailPrice ? Number(retailPrice) : undefined,
          stock: p.stock || 0,
          customData: p.customData || {}
        };
      });

      setProducts(returnProducts);
      setFields(fieldsResponse.data);
      console.log('Returns: UI state updated with', returnProducts.length, 'products');

    } catch (error: any) {
      console.error('Failed to load products from Supabase:', error);

      if (error.message?.includes('User not authenticated')) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to load products from Supabase');
      }

      setProducts([]);
      setFields([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, debouncedSearchTerm]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Add manual refresh function
  const refreshProducts = useCallback(() => {
    console.log('Manual refresh triggered for Returns');
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = products; // No need for client-side filtering since we do server-side filtering

  // Get visible fields for table display - exclude core fields that are already shown as hardcoded columns
  const visibleFields = useMemo(() => {
    // Core fields that are already shown as separate columns (SKU, Name, Brand, Category, Stock)
    // These should be excluded from visibleFields to avoid duplication
    const coreFieldKeys = ['sku', 'name', 'brand', 'category', 'stock'];

    // Return all active fields except core fields that are already displayed
    return fields
      .filter(field => field.isActive && !coreFieldKeys.includes(field.fieldKey))
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [fields]);

  // Check if we should show brand column
  const showBrandColumn = useMemo(() => {
    return products.some(p => p.brand && p.brand.trim() !== '');
  }, [products]);

  // Check if we should show category column
  const showCategoryColumn = useMemo(() => {
    return products.some(p => p.category && p.category.trim() !== '');
  }, [products]);

  const addToReturnCart = (product: Product) => {
    const existingItem = returnCart.find((item) => item._id === product._id);
    if (existingItem) {
      setReturnCart(
        returnCart.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setReturnCart([...returnCart, { ...product, quantity: 1 }]);
    }
    toast.success(`${product.name} added to return cart`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setReturnCart(
      returnCart
        .map((item) => {
          if (item._id === id) {
            const newQuantity = item.quantity + delta;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
          }
          return item;
        })
        .filter((item): item is ReturnItem => item !== null)
    );
  };

  const removeFromCart = (id: string) => {
    setReturnCart(returnCart.filter((item) => item._id !== id));
    toast.success("Item removed from return cart");
  };

  const returnAmount = returnCart.reduce(
    (sum, item) => sum + (Number(item.salePrice) || 0) * item.quantity,
    0
  );

  const handleProcessReturn = async () => {
    if (returnCart.length === 0) {
      toast.error("Return cart is empty!");
      return;
    }
    try {
      const response = await ordersApi.refund({
        items: returnCart.map((c) => ({ productId: c._id, quantity: c.quantity })),
      });
      setLastReturn(response.data);
      toast.success(`Return processed successfully! Refund amount: ₨${returnAmount.toFixed(2)}`);
      setReturnCart([]);

      // Auto-print return receipt if printer is connected
      try {
        const statusResponse = await printerApi.getStatus();
        if (statusResponse.data.isConnected) {
          const returnId = response.data.id || response.data._id;
          if (returnId) {
            // Small delay to ensure order is saved
            setTimeout(async () => {
              try {
                await printerApi.printReturnReceipt(returnId);
                toast.success("Return receipt printed automatically!");
              } catch (printError: any) {
                // Don't show error toast for auto-print, just log it
                console.warn('Auto-print failed:', printError.message);
              }
            }, 500);
          }
        }
      } catch (printCheckError) {
        // Silently handle - printer might not be connected
      }
    } catch (e: any) {
      console.error('Return error:', e);
      // Show user-friendly error message
      const errorMessage = e?.message || 'Return processing failed. Please try again.';
      toast.error(errorMessage);
    }
  };

  const printReturnReceipt = async () => {
    if (!lastReturn) {
      toast.error("No recent return to print");
      return;
    }
    try {
      const returnId = lastReturn._id || lastReturn.id;
      console.log('Printing return receipt for order ID:', returnId);
      console.log('Last return data:', lastReturn);

      if (!returnId) {
        toast.error("Return order ID not found");
        return;
      }

      await printerApi.printReturnReceipt(returnId);
      toast.success("Return receipt printed successfully!");
    } catch (error: any) {
      console.error("Print failed:", error);
      toast.error(error.response?.data?.message || "Failed to print return receipt");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Returns Processing
        </h1>
        <p className="text-muted-foreground mt-1">
          Process product returns and issue refunds
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => {
                console.log('Returns search term changed to:', e.target.value);
                setSearchTerm(e.target.value);
              }}
              className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5" />
                    Products for Return ({filteredProducts.length})
                  </CardTitle>
                  {visibleFields.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Showing {visibleFields.length} custom field{visibleFields.length !== 1 ? 's' : ''}: {visibleFields.map(f => f.fieldLabel).join(', ')}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refreshProducts}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-muted-foreground">Loading products...</span>
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    {searchTerm ? 'No products found matching your search.' : 'No products found. Add products to process returns.'}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Name</TableHead>
                        {showBrandColumn && <TableHead>Brand</TableHead>}
                        {showCategoryColumn && <TableHead>Category</TableHead>}
                        {visibleFields.map(field => (
                          <TableHead key={field.fieldKey}>{field.fieldLabel}</TableHead>
                        ))}
                        <TableHead>Stock</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow
                          key={product._id}
                          className="hover:bg-secondary/50 cursor-pointer"
                          onClick={() => addToReturnCart(product)}
                        >
                          <TableCell className="font-medium">{product.sku}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{product.name}</span>
                              {product.customData && Object.keys(product.customData).length > visibleFields.length && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProduct(product);
                                  }}
                                  className="h-6 w-6 p-0 mt-1"
                                >
                                  <Info className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          {showBrandColumn && (
                            <TableCell>
                              {product.brand ? (
                                <Badge variant="secondary" className="text-xs">
                                  {product.brand}
                                </Badge>
                              ) : '-'}
                            </TableCell>
                          )}
                          {showCategoryColumn && (
                            <TableCell>
                              {product.category ? (
                                <Badge variant="outline" className="text-xs">
                                  {product.category}
                                </Badge>
                              ) : '-'}
                            </TableCell>
                          )}
                          {visibleFields.map(field => {
                            // Get value from customData or direct product property
                            const getFieldValue = () => {
                              if (product.customData?.[field.fieldKey] !== undefined) {
                                return product.customData[field.fieldKey];
                              }
                              // Check direct product properties
                              return product[field.fieldKey as keyof Product];
                            };

                            const value = getFieldValue();

                            return (
                              <TableCell key={field.fieldKey}>
                                {(() => {
                                  // Handle salePrice and retailPrice specially
                                  if (field.fieldKey === 'salePrice') {
                                    const price = Number(value || product.salePrice) || 0;
                                    return <span className="font-bold text-destructive">-{formatCurrency(price)}</span>;
                                  }
                                  if (field.fieldKey === 'retailPrice') {
                                    const price = Number(value || product.retailPrice);
                                    return price ? (
                                      <span className="text-xs text-muted-foreground line-through">-{formatCurrency(price)}</span>
                                    ) : '-';
                                  }
                                  if (field.fieldKey === 'stock') {
                                    const stockValue = Number(value || product.stock) || 0;
                                    return (
                                      <span className={`font-medium ${stockValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {stockValue} {stockValue === 0 ? '(Out)' : ''}
                                      </span>
                                    );
                                  }
                                  if (field.fieldKey === 'category') {
                                    return value ? (
                                      <Badge variant="outline" className="text-xs">{String(value)}</Badge>
                                    ) : '-';
                                  }
                                  if (field.fieldKey === 'brand') {
                                    return value ? (
                                      <Badge variant="secondary" className="text-xs">{String(value)}</Badge>
                                    ) : '-';
                                  }
                                  // Handle other field types
                                  if (field.fieldType === 'boolean') {
                                    return value ? 'Yes' : 'No';
                                  } else if (Array.isArray(value)) {
                                    return value.join(', ');
                                  } else if (field.fieldType === 'date' && value) {
                                    // Format date fields properly
                                    try {
                                      let date;
                                      if (typeof value === 'string' && value.includes('/')) {
                                        const [month, day, year] = value.split('/');
                                        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                      } else {
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
                                    return String(value);
                                  } else {
                                    return value !== null && value !== undefined && value !== '' ? String(value) : '-';
                                  }
                                })()}
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            <span className={`font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {product.stock} {product.stock === 0 ? '(Out)' : ''}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToReturnCart(product);
                              }}
                              className="border-destructive text-destructive hover:bg-destructive/20"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="border-border sticky top-24">
            <CardHeader className="bg-destructive/20">
              <CardTitle className="flex items-center text-destructive">
                <RotateCcw className="w-5 h-5 mr-2" />
                Return Cart
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="max-h-[400px] overflow-y-auto">
                {returnCart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No items to return
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Item</TableHead>
                          <TableHead className="text-xs">Price</TableHead>
                          <TableHead className="text-xs">Qty</TableHead>
                          <TableHead className="text-xs">Total</TableHead>
                          <TableHead className="text-right text-xs">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {returnCart.map((item) => (
                          <TableRow key={item._id}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                                {/* Show badges only if they have data */}
                                {(item.brand || item.category) && (
                                  <div className="flex gap-1">
                                    {item.brand && (
                                      <Badge variant="secondary" className="text-xs">
                                        {item.brand}
                                      </Badge>
                                    )}
                                    {item.category && (
                                      <Badge variant="outline" className="text-xs">
                                        {item.category}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                {/* Show custom fields that have data */}
                                {item.customData && Object.keys(item.customData).length > 0 && (
                                  <div>
                                    {visibleFields
                                      .filter(field => item.customData?.[field.fieldKey])
                                      .slice(0, 2) // Show up to 2 custom fields in cart
                                      .map(field => (
                                        <p key={field.fieldKey} className="text-xs text-muted-foreground">
                                          {field.fieldLabel}: {field.fieldType === 'boolean'
                                            ? (item.customData?.[field.fieldKey] ? 'Yes' : 'No')
                                            : Array.isArray(item.customData?.[field.fieldKey])
                                              ? item.customData[field.fieldKey].join(', ')
                                              : item.customData?.[field.fieldKey] || '-'
                                          }
                                        </p>
                                      ))}
                                    {visibleFields.filter(field => item.customData?.[field.fieldKey]).length > 2 && (
                                      <p className="text-xs text-primary">
                                        +{visibleFields.filter(field => item.customData?.[field.fieldKey]).length - 2} more details
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium text-destructive">
                                -{formatCurrency(Number(item.salePrice) || 0)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => updateQuantity(item._id, -1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="font-bold w-6 text-center text-sm">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => updateQuantity(item._id, 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-destructive">
                                -{formatCurrency((Number(item.salePrice) || 0) * item.quantity)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive"
                                onClick={() => removeFromCart(item._id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(returnAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                  <span>Return Amount</span>
                  <span className="text-destructive">
                    {formatCurrency(returnAmount)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleProcessReturn}
                disabled={returnCart.length === 0}
                variant="outline"
                className="w-full border-destructive text-destructive hover:bg-destructive/20"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Process Return
              </Button>

              {lastReturn && (
                <Button
                  onClick={printReturnReceipt}
                  className="w-full bg-gradient-primary"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Return Receipt
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Details Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Product Details
            </DialogTitle>
            <DialogDescription>
              Complete information for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-4 rounded-lg border border-primary/20">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">SKU</label>
                    <p className="text-sm">{selectedProduct.sku}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-sm font-medium">{selectedProduct.name}</p>
                  </div>
                  {selectedProduct.brand && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Brand</label>
                      <p className="text-sm">{selectedProduct.brand}</p>
                    </div>
                  )}
                  {selectedProduct.category && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Category</label>
                      <p className="text-sm">{selectedProduct.category}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Sale Price</label>
                    <p className="text-sm font-bold text-destructive">-{formatCurrency(Number(selectedProduct.salePrice))}</p>
                  </div>
                  {selectedProduct.retailPrice && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Retail Price</label>
                      <p className="text-sm">-{formatCurrency(Number(selectedProduct.retailPrice))}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Stock</label>
                    <p className={`text-sm font-medium ${selectedProduct.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedProduct.stock} {selectedProduct.stock === 0 ? '(Out of Stock)' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Fields */}
              {selectedProduct.customData && Object.keys(selectedProduct.customData).length > 0 && (
                <div className="bg-gradient-to-r from-accent/5 to-primary/5 p-4 rounded-lg border border-accent/20">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    Additional Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {fields
                      .filter(field => field.isActive && selectedProduct.customData?.[field.fieldKey])
                      .map(field => (
                        <div key={field.fieldKey}>
                          <label className="text-sm font-medium text-muted-foreground">{field.fieldLabel}</label>
                          <p className="text-sm">
                            {field.fieldType === 'boolean'
                              ? (selectedProduct.customData?.[field.fieldKey] ? 'Yes' : 'No')
                              : Array.isArray(selectedProduct.customData?.[field.fieldKey])
                                ? selectedProduct.customData[field.fieldKey].join(', ')
                                : selectedProduct.customData?.[field.fieldKey] || '-'
                            }
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    addToReturnCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  className="flex-1 border-destructive text-destructive hover:bg-destructive/20"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Return Cart
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Returns;
