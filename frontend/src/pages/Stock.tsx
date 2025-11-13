import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      console.log('Stock: Loading products and fields for user:', user.id, 'with search term:', debouncedSearchTerm);

      const [productsResponse, fieldsResponse] = await Promise.all([
        dynamicProductsApi.list(user.id, debouncedSearchTerm),
        fieldConfigApi.getUserFields(user.id)
      ]);

      setProducts(productsResponse.data || []);
      setFields(fieldsResponse.data || []);
      console.log('Stock: Successfully loaded', productsResponse.data.length, 'products and', fieldsResponse.data.length, 'fields');

    } catch (error: any) {
      console.error('Failed to load stock data:', error);

      // Check if it's a database/permission error
      if (error.message?.includes('permission') ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist') ||
          error.message?.includes('COMPLETE_DATABASE_FIX.sql') ||
          error.status === 400) {
        toast.error('Database setup required. Please run the COMPLETE_DATABASE_FIX.sql script in Supabase SQL Editor.');
      } else if (error.message?.includes('User not authenticated')) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to load stock data. Please check your connection.');
      }

      setProducts([]);
      setFields([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, debouncedSearchTerm]);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id, loadData]);

  // Get visible fields for table display - same logic as Products page
  const visibleFields = useMemo(() => {
    if (products.length === 0) {
      // If no products, show all active fields
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

  const updateQuantity = async (id: string, delta: number) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const currentStock = product.stock || product.customData?.stock || 0;
    const newStock = Math.max(0, Number(currentStock) + delta);

    // Prepare update data
    const updateData: any = {
      sku: product.sku,
      name: product.name,
      brand: product.brand,
      category: product.category,
      salePrice: product.salePrice || product.customData?.salePrice || '',
      retailPrice: product.retailPrice || product.customData?.retailPrice || '',
      stock: newStock,
      ...(product.customData || {})
    };

    try {
      await dynamicProductsApi.update(id, updateData);

      // Reload data to ensure we have the latest from the database
      await loadData();

      // Clear the adjustment input for this product
      setStockAdjustments(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });

      toast.success(`Stock ${delta > 0 ? "increased" : "decreased"} successfully!`);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to update stock");
    }
  };

  const handleStockAdjustment = (id: string, value: string) => {
    // Only allow numbers (including negative for decrease)
    if (value === '' || /^-?\d*$/.test(value)) {
      setStockAdjustments(prev => ({
        ...prev,
        [id]: value
      }));
    }
  };

  const applyStockAdjustment = (id: string) => {
    const adjustmentValue = stockAdjustments[id];
    if (!adjustmentValue || adjustmentValue === '') {
      toast.error('Please enter a quantity');
      return;
    }

    const delta = parseInt(adjustmentValue, 10);
    if (isNaN(delta) || delta === 0) {
      toast.error('Please enter a valid non-zero number');
      return;
    }

    updateQuantity(id, delta);
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { text: "Out of Stock", color: "text-destructive" };
    if (quantity < 20) return { text: "Low Stock", color: "text-yellow-500" };
    return { text: "In Stock", color: "text-success" };
  };

  const getFieldValue = (product: DynamicProduct, fieldKey: string) => {
    // Get the value from customData or direct product property
    return product.customData?.[fieldKey] !== undefined
      ? product.customData[fieldKey]
      : product[fieldKey];
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
          placeholder="Search stock by name..."
          value={searchTerm}
          onChange={(e) => {
            console.log('Stock search term changed to:', e.target.value);
            setSearchTerm(e.target.value);
          }}
          className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-card/50">
              {visibleFields.map(field => (
                <TableHead key={field.fieldKey}>{field.fieldLabel}</TableHead>
              ))}
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={visibleFields.length + 2} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-muted-foreground">Loading stock items from Supabase...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleFields.length + 2} className="text-center py-8">
                  <div className="text-muted-foreground">
                    {searchTerm ? 'No stock items found matching your search.' : 'No stock items found. Add products to manage stock.'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const stockValue = Number(getFieldValue(product, 'stock') || 0);
                const status = getStockStatus(stockValue);
                const adjustmentValue = stockAdjustments[product.id] || '';

                return (
                  <TableRow key={product.id} className="hover:bg-secondary/50 transition-all duration-200">
                    {visibleFields.map(field => {
                      const value = getFieldValue(product, field.fieldKey);

                      return (
                        <TableCell key={field.fieldKey}>
                          {(() => {
                            // Handle salePrice and retailPrice specially
                            if (field.fieldKey === 'salePrice') {
                              const price = Number(value) || 0;
                              return <span className="font-bold text-green-600">Rs {price.toFixed(2)}</span>;
                            }
                            if (field.fieldKey === 'retailPrice') {
                              const price = Number(value);
                              return price ? (
                                <span className="text-xs text-muted-foreground line-through">Rs {price.toFixed(2)}</span>
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
                      <span className={`font-medium ${status.color}`}>
                        {status.text}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2 items-center">
                        <div className="flex items-center gap-1 border rounded-md px-2 py-1">
                          <Input
                            type="text"
                            placeholder="Qty"
                            value={adjustmentValue}
                            onChange={(e) => handleStockAdjustment(product.id, e.target.value)}
                            className="w-16 h-8 text-center text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                applyStockAdjustment(product.id);
                              }
                            }}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const delta = adjustmentValue ? parseInt(adjustmentValue, 10) : -1;
                            if (!isNaN(delta) && delta !== 0) {
                              updateQuantity(product.id, delta);
                            } else {
                              updateQuantity(product.id, -1);
                            }
                          }}
                          className="hover:bg-destructive/20 hover:text-destructive hover:border-destructive transition-all duration-200"
                          title="Decrease stock"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const delta = adjustmentValue ? parseInt(adjustmentValue, 10) : 1;
                            if (!isNaN(delta) && delta !== 0) {
                              updateQuantity(product.id, delta);
                            } else {
                              updateQuantity(product.id, 1);
                            }
                          }}
                          className="hover:bg-success/20 hover:text-success hover:border-success transition-all duration-200"
                          title="Increase stock"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Stock;
