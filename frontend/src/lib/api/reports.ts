import { db } from '../supabase';
import { getCurrentUser } from './auth';

export interface ReportSummary {
  totalSales: number;
  totalRefunds: number;
  netRevenue: number;
  counts?: Record<string, number>;
  totalDiscounts?: number;
  discountedOrders?: number;
  discountPercentage?: string;
}

export interface Transaction {
  id: string;
  type: 'Sale' | 'Refund';
  total: number;
  created_at: string;
  order_number: string;
  discount_amount?: number;
}

export interface OrderItem {
  name: string;
  sku: string;
  quantity: number;
  line_total: number;
  category?: string;
}

// Reports API
export const reportsApi = {
  async getSummary() {
    try {
      const user = await getCurrentUser();
      console.log('getSummary - Current user:', user);
      const orders = await db.getSalesSummary(user.id);
      console.log('getSummary - Orders from database:', orders);

      const sales = orders.filter(o => o.type === 'Sale');
      const refunds = orders.filter(o => o.type === 'Refund');

      const totalSales = sales.reduce((sum, order) => sum + (order.total || 0), 0);
      const totalRefunds = refunds.reduce((sum, order) => sum + (order.total || 0), 0);
      const netRevenue = totalSales - totalRefunds;

      const totalDiscounts = sales.reduce((sum, order) => sum + (order.discount_amount || 0), 0);
      const discountedOrders = sales.filter(o => (o.discount_amount || 0) > 0).length;

      const summary = {
        totalSales,
        totalRefunds,
        netRevenue,
        counts: {
          Sale: sales.length,
          Refund: refunds.length
        },
        totalDiscounts,
        discountedOrders,
        discountPercentage: sales.length > 0 ? (discountedOrders / sales.length * 100).toFixed(1) : 0
      };

      console.log('getSummary - Calculated summary:', summary);
      return { data: summary };
    } catch (error) {
      console.error('getSummary error:', error);
      throw error;
    }
  },

  async getTransactions(limit = 100, offset = 0) {
    try {
      const user = await getCurrentUser();
      console.log('getTransactions - Current user:', user);
      const orders = await db.getOrders(user.id, limit, offset);
      console.log('getTransactions - Orders from database:', orders);
      return { data: orders };
    } catch (error) {
      console.error('getTransactions error:', error);
      throw error;
    }
  },

  async getTopProducts(limit = 5) {
    const user = await getCurrentUser();
    const orderItems = await db.getTopProducts(user.id, limit) as any[];

    // Group by product and calculate totals
    const productSales: any = {};

    orderItems.forEach(item => {
      const key = `${item.name}_${item.sku}`;
      if (!productSales[key]) {
        productSales[key] = {
          name: item.name,
          sku: item.sku,
          sales: 0,
          revenue: 0
        };
      }
      productSales[key].sales += item.quantity;
      productSales[key].revenue += item.line_total;
    });

    // Convert to array and sort by sales
    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.sales - a.sales)
      .slice(0, limit);

    return { data: topProducts };
  },

  async getSalesByCategory() {
    const user = await getCurrentUser();
    const orderItems = await db.getSalesByCategory(user.id) as any[];

    // Group by category and calculate totals
    const categorySales: any = {};

    orderItems.forEach(item => {
      const category = item.category || 'Uncategorized';
      if (!categorySales[category]) {
        categorySales[category] = {
          category: category,
          sales: 0,
          revenue: 0
        };
      }
      categorySales[category].sales += item.quantity;
      categorySales[category].revenue += item.line_total;
    });

    // Convert to array and sort by revenue
    const salesByCategory = Object.values(categorySales)
      .sort((a: any, b: any) => b.revenue - a.revenue);

    return { data: salesByCategory };
  },

  async exportTransactions() {
    const user = await getCurrentUser();
    const orders = await db.getOrders(user.id, 1000, 0);

    // Create CSV
    const csv = 'Order Number,Date,Type,Total,Discount\n' +
      orders.map(order =>
        `${order.order_number},${order.created_at},${order.type},${order.total},${order.discount_amount || 0}`
      ).join('\n');

    return { data: csv };
  },

  // Aliases used in pages
  summary: () => reportsApi.getSummary(),
  transactions: (params?: { limit?: number; offset?: number }) =>
    reportsApi.getTransactions(params?.limit, params?.offset),
  topProducts: (limit?: number) => reportsApi.getTopProducts(limit),
  salesByCategory: () => reportsApi.getSalesByCategory(),
};
