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
    try {
    const user = await getCurrentUser();
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Fetch all orders (no limit)
    const orders = await db.getOrders(user.id);
      return { data: Array.isArray(orders) ? orders : [] };
    } catch (error: any) {
      console.error('ordersApi.list error:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return { data: [] };
    }
  },

  async createSale(data: Omit<Order, 'id'>) {
    try {
    // Validate input
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid order data. Please check your input and try again.');
    }
    if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new Error('Order must contain at least one item. Please add products to your cart.');
    }
    if (typeof data.taxRate !== 'number' || data.taxRate < 0 || data.taxRate > 1) {
        throw new Error('Invalid tax rate. Tax rate must be between 0 and 1.');
    }
    if (data.discountValue !== undefined && (typeof data.discountValue !== 'number' || data.discountValue < 0)) {
        throw new Error('Invalid discount value. Discount must be a non-negative number.');
    }

    const user = await getCurrentUser();
      if (!user?.id) {
        throw new Error('User not authenticated. Please login again.');
      }

    // Validate stock and get product details
    const productDetails = [];
    for (const item of data.items) {
        try {
      // Validate item
      if (!item || typeof item !== 'object') {
            throw new Error('Invalid order item. Please refresh and try again.');
      }
      if (!item.productId || typeof item.productId !== 'string' || item.productId.trim() === '') {
            throw new Error('Invalid product ID. Please refresh the page and try again.');
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
            throw new Error(`Invalid quantity for item. Quantity must be a positive whole number.`);
      }

      const product = await db.getProductById(item.productId.trim(), user.id);
      if (!product) {
            throw new Error(`Product not found. It may have been deleted. Please refresh and try again.`);
      }
      if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}. Please adjust the quantity.`);
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
        } catch (itemError: any) {
          console.error(`Error processing item ${item.productId}:`, itemError);
          throw new Error(itemError.message || `Failed to process item. Please try again.`);
        }
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
      notes: data.notes ? String(data.notes).trim().slice(0, 500) : null
    };

    const order = await db.createOrder(orderData);
      if (!order || !order.id) {
        throw new Error('Failed to create order. Please try again.');
      }

    // Create order items
    const orderItemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id
    }));

      // Validate order items before insertion
      if (!orderItemsWithOrderId || orderItemsWithOrderId.length === 0) {
        throw new Error('No items to save. Please add items to your cart.');
      }

      // Validate each item has required fields
      for (const item of orderItemsWithOrderId) {
        if (!item.order_id) {
          throw new Error('Order ID is missing. Please try again.');
        }
        if (!item.sku || !item.name) {
          throw new Error('Product information is incomplete. Please try again.');
        }
        if (!item.unit_price || item.unit_price < 0) {
          throw new Error('Invalid product price. Please try again.');
        }
        if (!item.quantity || item.quantity <= 0) {
          throw new Error('Invalid quantity. Please try again.');
        }
      }

      try {
        const createdItems = await db.createOrderItems(orderItemsWithOrderId);
        if (!createdItems || createdItems.length === 0) {
          throw new Error('Order items were not created. Please try again.');
        }
        console.log('Order items created successfully:', createdItems.length);
      } catch (itemsError: any) {
        console.error('Error creating order items:', itemsError);
        // Provide more specific error message
        const errorMessage = itemsError?.message || itemsError?.error?.message || 'Unknown error';
        console.error('Full error details:', JSON.stringify(itemsError, null, 2));
        throw new Error(`Failed to save order items: ${errorMessage}. Please try again or contact support.`);
      }

    // Update stock levels
    for (const product of productDetails) {
        try {
      const newStock = product.stock - product.requestedQuantity;
      await db.updateProductStock(product.id, user.id, newStock);
        } catch (stockError: any) {
          console.error(`Error updating stock for product ${product.id}:`, stockError);
          // Continue with other products even if one fails
        }
    }

    // Get the complete order with items
    const completeOrder = await db.getOrderById(order.id, user.id);
      if (!completeOrder) {
        throw new Error('Order created but could not be retrieved. Please refresh to see your order.');
      }

    return { data: completeOrder };
    } catch (error: any) {
      console.error('createSale error:', error);
      // Provide user-friendly error messages
      if (error.message) {
        throw error; // Re-throw with the user-friendly message
      }
      throw new Error(`Failed to create order: ${error.message || 'Unknown error. Please try again.'}`);
    }
  },

  async createReturn(data: Omit<Order, 'id'>) {
    try {
    // Validate input
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid return data. Please check your input and try again.');
    }
    if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new Error('Return must contain at least one item. Please add items to return.');
    }

    const user = await getCurrentUser();
      if (!user?.id) {
        throw new Error('User not authenticated. Please login again.');
      }

    // Get product details
    const productDetails = [];
    for (const item of data.items) {
        try {
      // Validate item
      if (!item || typeof item !== 'object') {
            throw new Error('Invalid return item. Please refresh and try again.');
      }
      if (!item.productId || typeof item.productId !== 'string' || item.productId.trim() === '') {
            throw new Error('Invalid product ID. Please refresh the page and try again.');
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
            throw new Error(`Invalid quantity for item. Quantity must be a positive whole number.`);
      }

      const product = await db.getProductById(item.productId.trim(), user.id);
      if (!product) {
            throw new Error(`Product not found. It may have been deleted. Please refresh and try again.`);
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
        } catch (itemError: any) {
          console.error(`Error processing return item ${item.productId}:`, itemError);
          throw new Error(itemError.message || `Failed to process return item. Please try again.`);
        }
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
      notes: data.notes ? String(data.notes).trim().slice(0, 500) : null
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
        try {
      const newStock = product.stock + product.requestedQuantity;
      await db.updateProductStock(product.id, user.id, newStock);
        } catch (stockError: any) {
          console.error(`Error updating stock for product ${product.id}:`, stockError);
          // Continue with other products even if one fails
        }
    }

    // Get the complete order with items
    const completeOrder = await db.getOrderById(order.id, user.id);
      if (!completeOrder) {
        throw new Error('Return created but could not be retrieved. Please refresh to see your return.');
      }

    return { data: completeOrder };
    } catch (error: any) {
      console.error('createReturn error:', error);
      // Provide user-friendly error messages
      if (error.message) {
        throw error; // Re-throw with the user-friendly message
      }
      throw new Error(`Failed to create return: ${error.message || 'Unknown error. Please try again.'}`);
    }
  },

  // Aliases used in pages
  sale: (data: Omit<Order, 'id'>) => ordersApi.createSale(data),
  refund: (data: Omit<Order, 'id'>) => ordersApi.createReturn(data),
};
