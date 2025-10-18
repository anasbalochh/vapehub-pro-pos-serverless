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

// Products API
export const productsApi = {
  async list(query?: string) {
    const user = await getCurrentUser();
    const products = await db.getProducts(user.id, query);
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
    const user = await getCurrentUser();
    const product = await db.getProductById(id, user.id);
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
    const user = await getCurrentUser();
    const productData = {
      user_id: user.id,
      sku: data.sku,
      name: data.name,
      brand: data.brand,
      category: data.category,
      sale_price: data.salePrice,
      retail_price: data.retailPrice,
      stock: data.stock,
      is_active: data.isActive
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
    const user = await getCurrentUser();
    const updateData: any = {};
    if (data.salePrice !== undefined) updateData.sale_price = data.salePrice;
    if (data.retailPrice !== undefined) updateData.retail_price = data.retailPrice;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const product = await db.updateProduct(id, user.id, updateData);
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
    const user = await getCurrentUser();
    await db.deleteProduct(id, user.id);
    return { data: { message: 'Product deleted successfully' } };
  }
};
