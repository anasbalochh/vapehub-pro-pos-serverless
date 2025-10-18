import { db } from '../supabase';
import { getCurrentUser } from './auth';

export interface Order {
  id?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  taxRate: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  notes?: string;
}

// Orders API
export const ordersApi = {
  async list() {
    const user = await getCurrentUser();
    const orders = await db.getOrders(user.id);
    return { data: orders };
  },

  async createSale(data: Omit<Order, 'id'>) {
    const user = await getCurrentUser();

    // Validate stock and get product details
    const productDetails = [];
    for (const item of data.items) {
      const product = await db.getProductById(item.productId, user.id);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
      }
      // Map product fields
      const mappedProduct = {
        ...product,
        _id: product.id,
        salePrice: product.sale_price,
        retailPrice: product.retail_price,
        isActive: product.is_active
      };
      productDetails.push({ ...mappedProduct, requestedQuantity: item.quantity });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const product of productDetails) {
      const unitPrice = product.salePrice;
      const quantity = product.requestedQuantity;
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      orderItems.push({
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        unit_price: unitPrice,
        quantity,
        line_total: lineTotal,
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (data.discountValue && data.discountValue > 0) {
      if (data.discountType === 'percentage') {
        discountAmount = Math.round((subtotal * data.discountValue / 100) * 100) / 100;
      } else if (data.discountType === 'fixed') {
        discountAmount = Math.min(data.discountValue, subtotal);
      }
    }

    const discountedSubtotal = subtotal - discountAmount;
    const tax = Math.round(discountedSubtotal * data.taxRate * 100) / 100;
    const total = Math.round((discountedSubtotal + tax) * 100) / 100;

    // Generate order number
    const now = new Date();
    const orderNumber = `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${now.getTime().toString().slice(-6)}`;

    // Create order
    const orderData = {
      user_id: user.id,
      order_number: orderNumber,
      type: 'Sale',
      subtotal,
      discount_type: data.discountType || 'percentage',
      discount_value: data.discountValue || 0,
      discount_amount: discountAmount,
      tax,
      total,
      notes: data.notes
    };

    const order = await db.createOrder(orderData);

    // Create order items
    const orderItemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id
    }));

    await db.createOrderItems(orderItemsWithOrderId);

    // Update stock levels
    for (const product of productDetails) {
      const newStock = product.stock - product.requestedQuantity;
      await db.updateProductStock(product.id, user.id, newStock);
    }

    // Get the complete order with items
    const completeOrder = await db.getOrderById(order.id, user.id);

    return { data: completeOrder };
  },

  async createReturn(data: Omit<Order, 'id'>) {
    const user = await getCurrentUser();

    // Get product details
    const productDetails = [];
    for (const item of data.items) {
      const product = await db.getProductById(item.productId, user.id);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      // Map product fields
      const mappedProduct = {
        ...product,
        _id: product.id,
        salePrice: product.sale_price,
        retailPrice: product.retail_price,
        isActive: product.is_active
      };
      productDetails.push({ ...mappedProduct, requestedQuantity: item.quantity });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const product of productDetails) {
      const unitPrice = product.salePrice;
      const quantity = product.requestedQuantity;
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      orderItems.push({
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        unit_price: unitPrice,
        quantity,
        line_total: lineTotal,
      });
    }

    const tax = Math.round(subtotal * 0.1 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    // Generate order number
    const now = new Date();
    const orderNumber = `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${now.getTime().toString().slice(-6)}`;

    // Create return order
    const orderData = {
      user_id: user.id,
      order_number: orderNumber,
      type: 'Refund',
      subtotal,
      discount_type: 'percentage',
      discount_value: 0,
      discount_amount: 0,
      tax,
      total,
      notes: data.notes
    };

    const order = await db.createOrder(orderData);

    // Create order items
    const orderItemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id
    }));

    await db.createOrderItems(orderItemsWithOrderId);

    // Update stock levels (add back to stock for returns)
    for (const product of productDetails) {
      const newStock = product.stock + product.requestedQuantity;
      await db.updateProductStock(product.id, user.id, newStock);
    }

    // Get the complete order with items
    const completeOrder = await db.getOrderById(order.id, user.id);

    return { data: completeOrder };
  },

  // Aliases used in pages
  sale: (data: Omit<Order, 'id'>) => ordersApi.createSale(data),
  refund: (data: Omit<Order, 'id'>) => ordersApi.createReturn(data),
};
