import { useEffect, useMemo, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Minus, Trash2, RotateCcw, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { productsApi, ordersApi, printerApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Product {
  _id: string;
  sku: string;
  name: string;
  salePrice: number;
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

      const response = await productsApi.list(debouncedSearchTerm);
      console.log('Returns: Successfully loaded', response.data.length, 'products from Supabase');

      // Map to returns product format
      const returnProducts = response.data.map((p: any) => ({
        _id: p._id || p.id,
        sku: p.sku,
        name: p.name,
        salePrice: p.salePrice || p.sale_price || 0
      }));

      setProducts(returnProducts);
      console.log('Returns: UI state updated with', returnProducts.length, 'products');

    } catch (error: any) {
      console.error('Failed to load products from Supabase:', error);

      if (error.message?.includes('User not authenticated')) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to load products from Supabase');
      }

      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, debouncedSearchTerm]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = products; // No need for client-side filtering since we do server-side filtering

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
    } catch (e) {
      console.error(e);
      toast.error("Return failed");
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

          <div className="grid sm:grid-cols-2 gap-4">
            {isLoading ? (
              <div className="col-span-2 flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-muted-foreground">Loading products from Supabase...</span>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-2 text-center py-8">
                <div className="text-muted-foreground">
                  {searchTerm ? 'No products found matching your search.' : 'No products found. Add products to process returns.'}
                </div>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <Card
                  key={product._id}
                  className="border-border hover:border-primary/50 transition-all duration-200 cursor-pointer hover:shadow-md"
                  onClick={() => addToReturnCart(product)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-foreground">{product.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-destructive">
                      -{formatCurrency(Number(product.salePrice) || 0)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToReturnCart(product);
                      }}
                      className="border-destructive text-destructive hover:bg-destructive/20"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
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
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {returnCart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No items to return
                  </p>
                ) : (
                  returnCart.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(Number(item.salePrice) || 0)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item._id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="font-bold w-8 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item._id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
                          onClick={() => removeFromCart(item._id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
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
    </div>
  );
};

export default Returns;
