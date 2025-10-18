import { useEffect, useMemo, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer } from "lucide-react";
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
  stock: number;
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

      const response = await productsApi.list(debouncedSearchTerm);
      console.log('POS: Successfully loaded', response.data.length, 'products from Supabase');

      // Map to POS product format
      const posProducts = response.data.map((p: any) => ({
        _id: p._id || p.id,
        sku: p.sku,
        name: p.name,
        salePrice: p.salePrice || p.sale_price || 0,
        stock: p.stock || 0
      }));

      setProducts(posProducts);
      console.log('POS: UI state updated with', posProducts.length, 'products');

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

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.salePrice) || 0) * item.quantity, 0);

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
    } catch (e) {
      console.error(e);
      toast.error("Checkout failed");
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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Point of Sale
        </h1>
        <p className="text-muted-foreground mt-1">
          Process sales and manage transactions
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
                console.log('POS search term changed to:', e.target.value);
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
                  {searchTerm ? 'No products found matching your search.' : 'No products found. Add products to start selling.'}
                </div>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <Card
                  key={product._id}
                  className="border-border hover:border-primary/50 transition-all duration-200 cursor-pointer hover:shadow-md"
                  onClick={() => addToCart(product)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-foreground">{product.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                    <p className={`text-xs font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Stock: {product.stock} {product.stock === 0 ? '(Out of Stock)' : ''}
                    </p>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-success">
                      {formatCurrency(Number(product.salePrice) || 0)}
                    </span>
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
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="border-border sticky top-24">
            <CardHeader className="bg-gradient-primary">
              <CardTitle className="flex items-center text-primary-foreground">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Current Sale
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Cart is empty
                  </p>
                ) : (
                  cart.map((item) => (
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
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>

                {/* Discount Controls */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">RS</span>
                    <Input
                      type="number"
                      placeholder="Discount Amount"
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                      className="h-8 text-xs"
                      min="0"
                      max={subtotal}
                    />
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Discount (RS {discountValue})</span>
                      <span className="font-medium">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-success">{formatCurrency(total)}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full bg-gradient-primary shadow-glow"
              >
                Complete Sale
              </Button>

              {lastOrder && (
                <Button
                  onClick={printReceipt}
                  variant="outline"
                  className="w-full"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Receipt
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default POS;
