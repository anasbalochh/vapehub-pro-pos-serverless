import { db } from '../supabase';
import { getCurrentUser } from './auth';

export interface Product {
  _id?: string;
  id?: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  salePrice: number;
  sale_price?: number;
  retailPrice?: number;
  retail_price?: number;
  stock: number;
  isActive: boolean;
  is_active?: boolean;
}

// Helper function to sanitize search query
const sanitizeQuery = (query?: string): string => {
  if (!query || typeof query !== 'string') return '';
  // Remove potentially dangerous characters and limit length
  return query.trim().slice(0, 100).replace(/[<>'"]/g, '');
};

// Products API
export const productsApi = {
  async list(query?: string) {
    const user = await getCurrentUser();
    const sanitizedQuery = sanitizeQuery(query);
    const products = await db.getProducts(user.id, sanitizedQuery);
    // Map database fields to frontend expected fields
    const mappedProducts = products.map(product => ({
      ...product,
      _id: product.id,
      salePrice: product.sale_price,
      retailPrice: product.retail_price,
      isActive: product.is_active
    }));
    return { data: mappedProducts };
  },

  async getOne(id: string) {
    // Validate input
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Invalid product ID.');
    }
    const user = await getCurrentUser();
    const product = await db.getProductById(id.trim(), user.id);
    // Map database fields to frontend expected fields
    const mappedProduct = {
      ...product,
      _id: product.id,
      salePrice: product.sale_price,
      retailPrice: product.retail_price,
      isActive: product.is_active
    };
    return { data: mappedProduct };
  },

  async create(data: Omit<Product, 'id'>) {
    // Validate input
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid product data.');
    }
    if (!data.sku || typeof data.sku !== 'string' || data.sku.trim() === '') {
      throw new Error('SKU is required.');
    }
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new Error('Product name is required.');
    }
    if (typeof data.salePrice !== 'number' || data.salePrice < 0) {
      throw new Error('Sale price must be a non-negative number.');
    }
    if (typeof data.stock !== 'number' || data.stock < 0 || !Number.isInteger(data.stock)) {
      throw new Error('Stock must be a non-negative integer.');
    }

    const user = await getCurrentUser();
    const productData = {
      user_id: user.id,
      sku: data.sku.trim().slice(0, 100),
      name: data.name.trim().slice(0, 200),
      brand: (data.brand || '').trim().slice(0, 100),
      category: (data.category || '').trim().slice(0, 100),
      sale_price: Math.max(0, Math.min(999999.99, data.salePrice)),
      retail_price: data.retailPrice ? Math.max(0, Math.min(999999.99, data.retailPrice)) : null,
      stock: Math.max(0, Math.min(999999, Math.floor(data.stock))),
      is_active: data.isActive !== false
    };
    const product = await db.createProduct(productData);
    // Map database fields to frontend expected fields
    const mappedProduct = {
      ...product,
      _id: product.id,
      salePrice: product.sale_price,
      retailPrice: product.retail_price,
      isActive: product.is_active
    };
    return { data: mappedProduct };
  },

  async update(id: string, data: Partial<Product>) {
    // Validate input
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Invalid product ID.');
    }
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid update data.');
    }

    const user = await getCurrentUser();
    const updateData: any = {};
    
    if (data.salePrice !== undefined) {
      if (typeof data.salePrice !== 'number' || data.salePrice < 0) {
        throw new Error('Sale price must be a non-negative number.');
      }
      updateData.sale_price = Math.max(0, Math.min(999999.99, data.salePrice));
    }
    if (data.retailPrice !== undefined && data.retailPrice !== null) {
      if (typeof data.retailPrice !== 'number' || data.retailPrice < 0) {
        throw new Error('Retail price must be a non-negative number.');
      }
      updateData.retail_price = Math.max(0, Math.min(999999.99, data.retailPrice));
    }
    if (data.stock !== undefined) {
      if (typeof data.stock !== 'number' || data.stock < 0 || !Number.isInteger(data.stock)) {
        throw new Error('Stock must be a non-negative integer.');
      }
      updateData.stock = Math.max(0, Math.min(999999, Math.floor(data.stock)));
    }
    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim() === '') {
        throw new Error('Product name cannot be empty.');
      }
      updateData.name = data.name.trim().slice(0, 200);
    }
    if (data.brand !== undefined) {
      updateData.brand = (data.brand || '').trim().slice(0, 100);
    }
    if (data.category !== undefined) {
      updateData.category = (data.category || '').trim().slice(0, 100);
    }
    if (data.sku !== undefined) {
      if (typeof data.sku !== 'string' || data.sku.trim() === '') {
        throw new Error('SKU cannot be empty.');
      }
      updateData.sku = data.sku.trim().slice(0, 100);
    }
    if (data.isActive !== undefined) {
      updateData.is_active = Boolean(data.isActive);
    }

    const product = await db.updateProduct(id.trim(), user.id, updateData);
    // Map database fields to frontend expected fields
    const mappedProduct = {
      ...product,
      _id: product.id,
      salePrice: product.sale_price,
      retailPrice: product.retail_price,
      isActive: product.is_active
    };
    return { data: mappedProduct };
  },

  async delete(id: string) {
    // Validate input
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Invalid product ID.');
    }
    const user = await getCurrentUser();
    await db.deleteProduct(id.trim(), user.id);
    return { data: { message: 'Product deleted successfully' } };
  }
};
