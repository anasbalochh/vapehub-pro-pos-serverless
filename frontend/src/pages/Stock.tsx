import { useEffect, useMemo, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { productsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface StockItem {
  _id: string;
  sku: string;
  name: string;
  brand: string;
  stock: number;
}

const Stock = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Debounce search term for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadStockItems = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID available, skipping stock load');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Stock: Loading stock items for user:', user.id, 'with search term:', debouncedSearchTerm);

      const response = await productsApi.list(debouncedSearchTerm);
      console.log('Stock: Successfully loaded', response.data.length, 'products from Supabase');

      // Map to stock items format
      const stockData = response.data.map(product => ({
        _id: product._id || product.id,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        stock: product.stock || 0
      }));

      setStockItems(stockData);
      console.log('Stock: UI state updated with', stockData.length, 'items');

    } catch (error: any) {
      console.error('Failed to load stock items from Supabase:', error);

      if (error.message?.includes('User not authenticated')) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to load stock items from Supabase');
      }

      setStockItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, debouncedSearchTerm]);

  useEffect(() => {
    loadStockItems();
  }, [loadStockItems]);

  const filteredItems = stockItems; // No need for client-side filtering since we do server-side filtering

  const updateQuantity = async (id: string, delta: number) => {
    const current = stockItems.find((i) => i._id === id);
    if (!current) return;
    const newStock = Math.max(0, (current.stock ?? 0) + delta);
    setStockItems(stockItems.map((i) => (i._id === id ? { ...i, stock: newStock } : i)));
    try {
      await productsApi.update(id, { stock: newStock });
      toast.success(`Stock ${delta > 0 ? "increased" : "decreased"} successfully!`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update stock");
    }
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
              <TableHead>SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-muted-foreground">Loading stock items from Supabase...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-muted-foreground">
                    {searchTerm ? 'No stock items found matching your search.' : 'No stock items found. Add products to manage stock.'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                const status = getStockStatus(item.stock ?? 0);
                return (
                  <TableRow key={item._id} className="hover:bg-secondary/50 transition-all duration-200">
                    <TableCell className="font-medium text-foreground">{item.sku}</TableCell>
                    <TableCell className="text-foreground">{item.name}</TableCell>
                    <TableCell className="text-foreground">{item.brand}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-foreground">{item.stock ?? 0}</span>
                        <span className="text-muted-foreground">units</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${status.color}`}>
                        {status.text}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(item._id, -1)}
                          className="hover:bg-destructive/20 hover:text-destructive hover:border-destructive transition-all duration-200"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(item._id, 1)}
                          className="hover:bg-success/20 hover:text-success hover:border-success transition-all duration-200"
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
