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
import { Info, Minus, Plus, Printer, RefreshCw, Search, ShoppingCart, Trash2 } from "lucide-react";
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

interface CartItem extends Product {
  quantity: number;
}

const POS = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [discountValue, setDiscountValue] = useState<number>(0);
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
      console.log('POS: Loading products for user:', user.id, 'with search term:', debouncedSearchTerm);

      // Load both products and field configurations
      const [productsResponse, fieldsResponse] = await Promise.all([
        dynamicProductsApi.list(user.id, debouncedSearchTerm),
        fieldConfigApi.getUserFields(user.id)
      ]);

      console.log('POS: Successfully loaded', productsResponse.data.length, 'products from Supabase');
      console.log('POS: Successfully loaded', fieldsResponse.data.length, 'field configurations');

      // Map to POS product format with custom data
      const posProducts = productsResponse.data.map((p: DynamicProduct) => {
        // Extract prices from both main fields and customData
        // Check if salePrice exists (not null/undefined), otherwise check customData
        const salePrice = (p.salePrice != null && p.salePrice !== '')
          ? p.salePrice
          : (p.customData?.salePrice != null && p.customData?.salePrice !== '')
            ? p.customData.salePrice
            : 0;
        const retailPrice = (p.retailPrice != null && p.retailPrice !== '')
          ? p.retailPrice
          : (p.customData?.retailPrice != null && p.customData?.retailPrice !== '')
            ? p.customData.retailPrice
            : undefined;

        const finalSalePrice = Number(salePrice) || 0;

        console.log(`Product ${p.name}:`, {
          mainSalePrice: p.salePrice,
          customSalePrice: p.customData?.salePrice,
          finalSalePrice: finalSalePrice,
          customData: p.customData
        });

        return {
          _id: p.id,
          sku: p.sku,
          name: p.name,
          brand: p.brand,
          category: p.category,
          salePrice: finalSalePrice,
          retailPrice: retailPrice ? Number(retailPrice) : undefined,
          stock: p.stock || 0,
          customData: p.customData || {}
        };
      });

      setProducts(posProducts);
      setFields(fieldsResponse.data);
      console.log('POS: UI state updated with', posProducts.length, 'products');

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
    console.log('Manual refresh triggered');
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

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item._id === product._id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const newQuantity = currentQuantity + 1;

    // Check stock availability
    if (newQuantity > product.stock) {
      toast.error(`Insufficient stock! Only ${product.stock} available for ${product.name}`);
      return;
    }

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item._id === product._id
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item._id === id) {
            const newQuantity = item.quantity + delta;
            const product = products.find(p => p._id === id);

            // Check stock availability for increase
            if (delta > 0 && newQuantity > (product?.stock || 0)) {
              toast.error(`Insufficient stock! Only ${product?.stock || 0} available for ${item.name}`);
              return item; // Don't change quantity
            }

            return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item._id !== id));
    toast.success("Item removed from cart");
  };

  // Helper function to get the actual sale price from item (check both salePrice and customData)
  const getItemPrice = (item: CartItem): number => {
    const price = item.salePrice || item.customData?.salePrice || 0;
    return Number(price) || 0;
  };

  const subtotal = cart.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);

  // Calculate discount (fixed amount only)
  const discountAmount = discountValue > 0 ? Math.min(discountValue, subtotal) : 0;

  const discountedSubtotal = subtotal - discountAmount;
  const total = discountedSubtotal;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty!");
      return;
    }
    try {
      const response = await ordersApi.sale({
        items: cart.map((c) => ({ productId: c._id, quantity: c.quantity })),
        taxRate: 0,
        discountType: 'fixed',
        discountValue,
      });
      setLastOrder(response.data);
      toast.success("Order completed successfully!");
      setCart([]);
      setDiscountValue(0); // Reset discount after checkout

      // Auto-print receipt if printer is connected
      try {
        const statusResponse = await printerApi.getStatus();
        if (statusResponse.data.isConnected) {
          const orderId = response.data.id || response.data._id;
          if (orderId) {
            // Small delay to ensure order is saved
            setTimeout(async () => {
              try {
                await printerApi.printReceipt(orderId);
                toast.success("Receipt printed automatically!");
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
      console.error('Checkout error:', e);
      // Show user-friendly error message
      const errorMessage = e?.message || 'Checkout failed. Please try again.';
      toast.error(errorMessage);
    }
  };

  const printReceipt = async () => {
    if (!lastOrder) {
      toast.error("No recent order to print");
      return;
    }
    try {
      const orderId = lastOrder._id || lastOrder.id;
      console.log('Printing receipt for order ID:', orderId);
      console.log('Last order data:', lastOrder);

      if (!orderId) {
        toast.error("Order ID not found");
        return;
      }

      await printerApi.printReceipt(orderId);
      toast.success("Receipt printed successfully!");
    } catch (error: any) {
      console.error("Print failed:", error);
      toast.error(error.response?.data?.message || "Failed to print receipt");
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 animate-fade-in w-full overflow-x-hidden">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Point of Sale
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Process sales and manage transactions
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 w-full">
        <div className="lg:col-span-2 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => {
                console.log('POS search term changed to:', e.target.value);
                setSearchTerm(e.target.value);
              }}
              className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Products Table - Mobile Card View, Desktop Table View */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                    Products ({filteredProducts.length})
                  </CardTitle>
                  {visibleFields.length > 0 && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Showing {visibleFields.length} custom field{visibleFields.length !== 1 ? 's' : ''}: {visibleFields.map(f => f.fieldLabel).join(', ')}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refreshProducts}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm sm:text-base text-muted-foreground">Loading products...</span>
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-sm sm:text-base text-muted-foreground">
                    {searchTerm ? 'No products found matching your search.' : 'No products found. Add products to start selling.'}
                  </div>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block lg:hidden space-y-3">
                    {filteredProducts.map((product) => {
                      const salePrice = Number(product.customData?.['salePrice'] || product.salePrice) || 0;
                      return (
                        <Card
                          key={product._id}
                          className="cursor-pointer hover:bg-secondary/50 transition-colors"
                          onClick={() => addToCart(product)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm sm:text-base truncate">{product.name}</p>
                                <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2 min-w-[80px]">
                                <p className="font-bold text-sm sm:text-base md:text-lg text-success break-words">
                                  {formatCurrency(salePrice)}
                                </p>
                                <p className={`text-xs font-medium break-words ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  Stock: {product.stock}
                                </p>
                              </div>
                            </div>
                            {(product.brand || product.category) && (
                              <div className="flex gap-1 flex-wrap mb-2">
                                {product.brand && (
                                  <Badge variant="secondary" className="text-xs">
                                    {product.brand}
                                  </Badge>
                                )}
                                {product.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {product.category}
                                  </Badge>
                                )}
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product);
                                }}
                                disabled={product.stock === 0}
                                className="bg-gradient-primary text-xs sm:text-sm"
                              >
                                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                Add to Cart
                              </Button>
                              {product.customData && Object.keys(product.customData).length > visibleFields.length && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProduct(product);
                                  }}
                                  className="text-xs"
                                >
                                  <Info className="w-3 h-3 mr-1" />
                                  Details
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
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
                            onClick={() => addToCart(product)}
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
                            {visibleFields.map(field => (
                              <TableCell key={field.fieldKey}>
                                {field.fieldKey === 'salePrice' ? (
                                  <span className="font-bold text-success break-words">
                                    {formatCurrency(Number(product.customData?.[field.fieldKey] || product.salePrice) || 0)}
                                  </span>
                                ) : field.fieldKey === 'retailPrice' ? (
                                  product.customData?.[field.fieldKey] || product.retailPrice ? (
                                    <span className="text-xs text-muted-foreground line-through break-words">
                                      {formatCurrency(Number(product.customData?.[field.fieldKey] || product.retailPrice))}
                                    </span>
                                  ) : '-'
                                ) : product.customData?.[field.fieldKey] ? (
                                  field.fieldType === 'boolean'
                                    ? (product.customData[field.fieldKey] ? 'Yes' : 'No')
                                    : Array.isArray(product.customData[field.fieldKey])
                                      ? product.customData[field.fieldKey].join(', ')
                                      : product.customData[field.fieldKey]
                                ) : '-'}
                              </TableCell>
                            ))}
                            <TableCell>
                              <span className={`font-medium break-words ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {product.stock} {product.stock === 0 ? '(Out)' : ''}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product);
                                }}
                                disabled={product.stock === 0}
                                className="bg-gradient-primary"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
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
        </div>

        <div className="lg:col-span-1">
          <Card className="border-border lg:sticky lg:top-24">
            <CardHeader className="bg-gradient-primary">
              <CardTitle className="flex items-center text-primary-foreground text-base sm:text-lg">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Current Sale
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-4">
              <div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-center text-sm sm:text-base text-muted-foreground py-8">
                    Cart is empty
                  </p>
                ) : (
                  <>
                    {/* Mobile Card View for Cart */}
                    <div className="block lg:hidden space-y-3">
                      {cart.map((item) => (
                        <Card key={item._id} className="border">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2 min-w-[80px]">
                                <p className="font-bold text-xs sm:text-sm text-success break-words">
                                  {formatCurrency(getItemPrice(item) * item.quantity)}
                                </p>
                                <p className="text-xs text-muted-foreground break-words">
                                  {formatCurrency(getItemPrice(item))} each
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-2 border-t">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item._id, -1)}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="font-bold text-base w-8 text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item._id, 1)}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
                                onClick={() => removeFromCart(item._id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Desktop Table View for Cart */}
                    <div className="hidden lg:block overflow-x-auto">
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
                          {cart.map((item) => (
                            <TableRow key={item._id}>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-medium text-sm">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
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
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm font-medium break-words">
                                  {formatCurrency(getItemPrice(item))}
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
                                <span className="font-bold text-success break-words">
                                  {formatCurrency(getItemPrice(item) * item.quantity)}
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
                  </>
                )}
              </div>

              <div className="border-t border-border pt-3 sm:pt-4 space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium break-words">{formatCurrency(subtotal)}</span>
                </div>

                {/* Discount Controls */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground break-words">RS</span>
                    <Input
                      type="number"
                      placeholder="Discount"
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                      className="h-8 sm:h-9 text-xs sm:text-sm"
                      min="0"
                      max={subtotal}
                    />
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs sm:text-sm text-orange-600">
                      <span>Discount (RS {discountValue})</span>
                      <span className="font-medium break-words">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-base sm:text-lg font-bold pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-success break-words">{formatCurrency(total)}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full bg-gradient-primary shadow-glow text-sm sm:text-base h-10 sm:h-11"
              >
                Complete Sale
              </Button>

              {lastOrder && (
                <Button
                  onClick={printReceipt}
                  variant="outline"
                  className="w-full text-sm sm:text-base h-10 sm:h-11"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Receipt
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
                    <p className="text-sm font-bold text-success">{formatCurrency(Number(selectedProduct.salePrice))}</p>
                  </div>
                  {selectedProduct.retailPrice && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Retail Price</label>
                      <p className="text-sm">{formatCurrency(Number(selectedProduct.retailPrice))}</p>
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
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  disabled={selectedProduct.stock === 0}
                  className="flex-1 bg-gradient-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POS;
