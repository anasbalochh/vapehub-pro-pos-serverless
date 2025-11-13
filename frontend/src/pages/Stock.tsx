import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { dynamicProductsApi, fieldConfigApi } from "@/lib/multi-industry-api";
import { formatCurrency } from "@/lib/utils";
import type { DynamicProduct, ProductFieldConfig } from '@/types/multi-industry';
import { Minus, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const Stock = () => {
  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [fields, setFields] = useState<ProductFieldConfig[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stockAdjustments, setStockAdjustments] = useState<Record<string, string>>({});
  const { user } = useAuth();

  // Debounce search term for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID available, skipping stock load');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Stock: Loading products for user:', user.id, 'with search term:', debouncedSearchTerm);

      // Load both products and field configurations
      const [productsResponse, fieldsResponse] = await Promise.all([
        dynamicProductsApi.list(user.id, debouncedSearchTerm),
        fieldConfigApi.getUserFields(user.id)
      ]);

      console.log('Stock: Successfully loaded', productsResponse.data.length, 'products from Supabase');
      console.log('Stock: Successfully loaded', fieldsResponse.data.length, 'field configurations');

      setProducts(productsResponse.data || []);
      setFields(fieldsResponse.data || []);

    } catch (error: any) {
      console.error('Failed to load stock items from Supabase:', error);

      if (error.message?.includes('User not authenticated')) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to load stock items from Supabase');
      }

      setProducts([]);
      setFields([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, debouncedSearchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get visible fields for table display - show all active fields that have data (like Products page)
  const visibleFields = useMemo(() => {
    if (products.length === 0) {
      // If no products, show all active fields (so user can see what fields are available)
      return fields
        .filter(field => field.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    }

    // Get all field keys that have data in at least one product
    const fieldsWithData = new Set<string>();

    products.forEach(product => {
      // Check direct product properties
      ['sku', 'name', 'brand', 'category', 'salePrice', 'retailPrice', 'stock'].forEach(key => {
        if (product[key] !== null && product[key] !== undefined && product[key] !== '') {
          fieldsWithData.add(key);
        }
      });

      // Check customData
      if (product.customData) {
        Object.keys(product.customData).forEach(key => {
          const value = product.customData[key];
          if (value !== null && value !== undefined && value !== '' &&
              !(Array.isArray(value) && value.length === 0)) {
            fieldsWithData.add(key);
          }
        });
      }
    });

    // Return fields that are active and have data (or are core fields)
    const coreFields = ['sku', 'name', 'brand', 'category', 'salePrice', 'retailPrice', 'stock'];
    return fields
      .filter(field => {
        if (!field.isActive) return false;
        // Always show core fields
        if (coreFields.includes(field.fieldKey)) return true;
        // Show custom fields if they have data
        return fieldsWithData.has(field.fieldKey);
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [fields, products]);

  const updateQuantity = async (productId: string, delta: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const adjustmentValue = stockAdjustments[productId] || '';
    const adjustmentAmount = adjustmentValue ? Number(adjustmentValue) : delta;
    
    if (adjustmentValue && (isNaN(adjustmentAmount) || adjustmentAmount <= 0)) {
      toast.error('Please enter a valid positive number');
      return;
    }

    const currentStock = Number(product.stock || product.customData?.stock || 0);
    const newStock = Math.max(0, currentStock + adjustmentAmount);
    
    try {
      // Get all product data to update
      const updatedData = {
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        category: product.category,
        salePrice: product.salePrice || product.customData?.salePrice,
        retailPrice: product.retailPrice || product.customData?.retailPrice,
        stock: newStock,
        ...(product.customData || {})
      };

      await dynamicProductsApi.update(productId, updatedData);

      // Clear the adjustment input for this product
      setStockAdjustments(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });

      // Reload data to get updated stock
      await loadData();

      toast.success(`Stock ${adjustmentAmount > 0 ? "increased" : "decreased"} by ${Math.abs(adjustmentAmount)} successfully!`);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to update stock");
    }
  };

  const handleAdjustmentInputChange = (productId: string, value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setStockAdjustments(prev => ({
      ...prev,
      [productId]: numericValue
    }));
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { text: "Out of Stock", color: "text-destructive" };
    if (quantity < 20) return { text: "Low Stock", color: "text-yellow-500" };
    return { text: "In Stock", color: "text-success" };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Stock Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor and adjust your inventory levels
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search products by name or SKU..."
          value={searchTerm}
          onChange={(e) => {
            console.log('Stock search term changed to:', e.target.value);
            setSearchTerm(e.target.value);
          }}
          className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Items ({products.length})</CardTitle>
          <CardDescription>
            {products.length === 0
              ? 'No products found. Add products to manage stock.'
              : `Showing ${products.length} products`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-muted-foreground">Loading stock items...</span>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                {searchTerm ? 'No products found matching your search.' : 'No products found. Add products to manage stock.'}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-card/50">
                    {visibleFields.map(field => (
                      <TableHead key={field.fieldKey}>{field.fieldLabel}</TableHead>
                    ))}
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Stock Adjustment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const stockValue = Number(product.stock || product.customData?.stock || 0);
                    const status = getStockStatus(stockValue);
                    const adjustmentValue = stockAdjustments[product.id] || '';

                    return (
                      <TableRow key={product.id} className="hover:bg-secondary/50 transition-all duration-200">
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
                                  return <span className="font-bold text-green-600">{formatCurrency(price)}</span>;
                                }
                                if (field.fieldKey === 'retailPrice') {
                                  const price = Number(value);
                                  return price ? (
                                    <span className="text-xs text-muted-foreground line-through">{formatCurrency(price)}</span>
                                  ) : '-';
                                }
                                if (field.fieldKey === 'stock') {
                                  return (
                                    <span className={`font-medium ${stockValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {stockValue} {stockValue === 0 ? '(Out)' : ''}
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
                        <TableCell>
                          <span className={`font-medium ${status.color}`}>
                            {status.text}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex items-center gap-1 border border-border rounded-md p-1">
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="Qty"
                                value={adjustmentValue}
                                onChange={(e) => handleAdjustmentInputChange(product.id, e.target.value)}
                                className="w-16 h-8 text-center text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && adjustmentValue) {
                                    updateQuantity(product.id, 0);
                                  }
                                }}
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(product.id, -1)}
                              className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive hover:border-destructive transition-all duration-200"
                              title="Decrease stock by 1 or by entered amount"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(product.id, 1)}
                              className="h-8 w-8 hover:bg-success/20 hover:text-success hover:border-success transition-all duration-200"
                              title="Increase stock by 1 or by entered amount"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Stock;
