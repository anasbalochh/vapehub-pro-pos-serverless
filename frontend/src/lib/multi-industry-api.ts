// Multi-Industry Field Configuration API
// Add this to your existing lib/api.ts or create a new file

import type {
  DynamicProduct,
  Industry,
  ProductFieldConfig,
  ProductFormData,
  UserIndustrySettings
} from '@/types/multi-industry';
import { supabase } from './supabase';

export const industriesApi = {
  // Get all available industries
  async list(): Promise<{ data: Industry[] }> {
    const { data, error } = await supabase
      .from('industries')
      .select('*')
      .eq('is_active', true)
      .order('display_name');

    if (error) {
      console.error('Database error details:', error);

      // Provide specific error messages based on actual error codes
      if (error.code === '23505') {
        // Only show duplicate error for actual unique constraint violations
        if (error.message?.includes('name') || error.message?.includes('sku')) {
          throw new Error('A product with this name or SKU already exists');
        } else {
          throw new Error('Duplicate data detected. Please check your input');
        }
      } else if (error.code === '23503') {
        throw new Error('Invalid reference data. Please check your field values');
      } else if (error.code === '22P02') {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.code === '42501') {
        throw new Error('Permission denied. Please check your database access');
      } else if (error.code === 'PGRST116') {
        throw new Error('Database table does not exist. Please run the setup script');
      } else if (error.message?.includes('invalid input syntax')) {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.message?.includes('duplicate')) {
        throw new Error('Duplicate data detected. Please check your input');
      } else {
        throw new Error(error.message || 'Failed to create product');
      }
    }
    return { data: data || [] };
  },

  // Get specific industry
  async get(id: string): Promise<{ data: Industry }> {
    const { data, error } = await supabase
      .from('industries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Database error details:', error);

      // Provide specific error messages based on actual error codes
      if (error.code === '23505') {
        // Only show duplicate error for actual unique constraint violations
        if (error.message?.includes('name') || error.message?.includes('sku')) {
          throw new Error('A product with this name or SKU already exists');
        } else {
          throw new Error('Duplicate data detected. Please check your input');
        }
      } else if (error.code === '23503') {
        throw new Error('Invalid reference data. Please check your field values');
      } else if (error.code === '22P02') {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.code === '42501') {
        throw new Error('Permission denied. Please check your database access');
      } else if (error.code === 'PGRST116') {
        throw new Error('Database table does not exist. Please run the setup script');
      } else if (error.message?.includes('invalid input syntax')) {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.message?.includes('duplicate')) {
        throw new Error('Duplicate data detected. Please check your input');
      } else {
        throw new Error(error.message || 'Failed to create product');
      }
    }
    return { data };
  }
};

export const userIndustryApi = {
  // Get user's industry settings
  async get(userId: string): Promise<{ data: UserIndustrySettings | null }> {
    const { data, error } = await supabase
      .from('user_industry_settings')
      .select(`
        *,
        industry:industries(*)
      `)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { data: data || null };
  },

  // Set user's industry
  async set(userId: string, industryId: string, businessName: string): Promise<{ data: UserIndustrySettings }> {
    const { data, error } = await supabase
      .from('user_industry_settings')
      .upsert({
        user_id: userId,
        industry_id: industryId,
        business_name: businessName,
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        industry:industries(*)
      `)
      .single();

    if (error) {
      console.error('Database error details:', error);

      // Provide specific error messages based on actual error codes
      if (error.code === '23505') {
        // Only show duplicate error for actual unique constraint violations
        if (error.message?.includes('name') || error.message?.includes('sku')) {
          throw new Error('A product with this name or SKU already exists');
        } else {
          throw new Error('Duplicate data detected. Please check your input');
        }
      } else if (error.code === '23503') {
        throw new Error('Invalid reference data. Please check your field values');
      } else if (error.code === '22P02') {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.code === '42501') {
        throw new Error('Permission denied. Please check your database access');
      } else if (error.code === 'PGRST116') {
        throw new Error('Database table does not exist. Please run the setup script');
      } else if (error.message?.includes('invalid input syntax')) {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.message?.includes('duplicate')) {
        throw new Error('Duplicate data detected. Please check your input');
      } else {
        throw new Error(error.message || 'Failed to create product');
      }
    }
    return { data };
  },

  // Update user industry settings
  async update(userId: string, updates: Partial<UserIndustrySettings>): Promise<{ data: UserIndustrySettings }> {
    const { data, error } = await supabase
      .from('user_industry_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select(`
        *,
        industry:industries(*)
      `)
      .single();

    if (error) {
      console.error('Database error details:', error);

      // Provide specific error messages based on actual error codes
      if (error.code === '23505') {
        // Only show duplicate error for actual unique constraint violations
        if (error.message?.includes('name') || error.message?.includes('sku')) {
          throw new Error('A product with this name or SKU already exists');
        } else {
          throw new Error('Duplicate data detected. Please check your input');
        }
      } else if (error.code === '23503') {
        throw new Error('Invalid reference data. Please check your field values');
      } else if (error.code === '22P02') {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.code === '42501') {
        throw new Error('Permission denied. Please check your database access');
      } else if (error.code === 'PGRST116') {
        throw new Error('Database table does not exist. Please run the setup script');
      } else if (error.message?.includes('invalid input syntax')) {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.message?.includes('duplicate')) {
        throw new Error('Duplicate data detected. Please check your input');
      } else {
        throw new Error(error.message || 'Failed to create product');
      }
    }
    return { data };
  }
};

export const fieldConfigApi = {
  // Get user's field configurations - SIMPLE AND DYNAMIC
  async getUserFields(userId: string): Promise<{ data: ProductFieldConfig[] }> {
    try {
      const { data, error } = await supabase
        .from('product_field_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Database error details:', error);
        // Check if table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn('product_field_configs table does not exist. Please run the COMPLETE_DATABASE_FIX.sql script.');
          return { data: [] };
        }
        // Check for permission errors
        if (error.code === '42501' || error.message?.includes('permission')) {
          console.warn('Permission denied. Please check your database permissions and RLS policies.');
          return { data: [] };
        }
        console.error('Database error:', error);
        throw error;
      }

      // Transform database fields to frontend format (snake_case to camelCase)
      const transformedFields = (data || []).map(field => ({
        id: field.id,
        fieldKey: field.field_key,
        fieldLabel: field.field_label,
        fieldType: field.field_type,
        isRequired: field.is_required,
        isActive: field.is_active,
        fieldOptions: field.field_options || [],
        validationRules: field.validation_rules || {},
        placeholderText: field.placeholder_text || '',
        helpText: field.help_text || '',
        displayOrder: field.display_order || 0,
        isCustom: field.is_custom || false,
        createdAt: field.created_at,
        updatedAt: field.updated_at
      }));

      return { data: transformedFields };
    } catch (error) {
      console.error('Failed to get user fields:', error);
      // Return empty array if table doesn't exist or permission issues
      return { data: [] };
    }
  },

  // Initialize user fields from industry template
  async initializeFromIndustry(userId: string, industryId: string): Promise<{ data: ProductFieldConfig[] }> {
    // Get industry template
    const industryResponse = await industriesApi.get(industryId);
    const industry = industryResponse.data;

    // Create field configurations from template
    const fieldConfigs = industry.defaultFields.map((field, index) => ({
      user_id: userId,
      field_key: field.key,
      field_label: field.label,
      field_type: field.type,
      is_required: field.required,
      is_active: field.active,
      field_options: field.options || [],
      validation_rules: field.validationRules || {},
      placeholder_text: field.placeholderText || '',
      help_text: field.helpText || '',
      display_order: field.order || index + 1,
      is_custom: field.isCustom || false
    }));

    const { data, error } = await supabase
      .from('product_field_configs')
      .upsert(fieldConfigs, { onConflict: 'user_id,field_key' })
      .select('*')
      .order('display_order');

    if (error) {
      console.error('Database error details:', error);

      // Provide specific error messages based on actual error codes
      if (error.code === '23505') {
        // Only show duplicate error for actual unique constraint violations
        if (error.message?.includes('name') || error.message?.includes('sku')) {
          throw new Error('A product with this name or SKU already exists');
        } else {
          throw new Error('Duplicate data detected. Please check your input');
        }
      } else if (error.code === '23503') {
        throw new Error('Invalid reference data. Please check your field values');
      } else if (error.code === '22P02') {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.code === '42501') {
        throw new Error('Permission denied. Please check your database access');
      } else if (error.code === 'PGRST116') {
        throw new Error('Database table does not exist. Please run the setup script');
      } else if (error.message?.includes('invalid input syntax')) {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.message?.includes('duplicate')) {
        throw new Error('Duplicate data detected. Please check your input');
      } else {
        throw new Error(error.message || 'Failed to create product');
      }
    }
    return { data: data || [] };
  },

  // Update field configuration
  async updateField(userId: string, fieldKey: string, updates: Partial<ProductFieldConfig>): Promise<{ data: ProductFieldConfig }> {
    if (!fieldKey) {
      throw new Error('Field key is required');
    }

    // Transform updates to database format
    const dbUpdates: any = {};
    if (updates.fieldLabel !== undefined) dbUpdates.field_label = updates.fieldLabel;
    if (updates.fieldType !== undefined) dbUpdates.field_type = updates.fieldType;
    if (updates.isRequired !== undefined) dbUpdates.is_required = updates.isRequired;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.fieldOptions !== undefined) dbUpdates.field_options = updates.fieldOptions;
    if (updates.validationRules !== undefined) dbUpdates.validation_rules = updates.validationRules;
    if (updates.placeholderText !== undefined) dbUpdates.placeholder_text = updates.placeholderText;
    if (updates.helpText !== undefined) dbUpdates.help_text = updates.helpText;
    if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
    if (updates.isCustom !== undefined) dbUpdates.is_custom = updates.isCustom;

    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('product_field_configs')
      .update(dbUpdates)
      .eq('user_id', userId)
      .eq('field_key', fieldKey)
      .select('*')
      .single();

    if (error) {
      console.error('Database error details:', error);
      // Check if table doesn't exist
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        throw new Error('Database table does not exist. Please run the COMPLETE_DATABASE_FIX.sql script in Supabase.');
      }
      // Check for permission errors
      if (error.code === '42501' || error.message?.includes('permission')) {
        throw new Error('Permission denied. Please check your database permissions and RLS policies.');
      }
      throw error;
    }

    // Transform the returned data to frontend format
    const transformedField = {
      id: data.id,
      fieldKey: data.field_key,
      fieldLabel: data.field_label,
      fieldType: data.field_type,
      isRequired: data.is_required,
      isActive: data.is_active,
      fieldOptions: data.field_options || [],
      validationRules: data.validation_rules || {},
      placeholderText: data.placeholder_text || '',
      helpText: data.help_text || '',
      displayOrder: data.display_order || 0,
      isCustom: data.is_custom || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    return { data: transformedField };
  },

  // Manual cleanup function (can be called from UI)
  async cleanupDuplicates(userId: string): Promise<{ data: ProductFieldConfig[] }> {
    return this.cleanupDuplicateFields(userId);
  },
  async cleanupDuplicateFields(userId: string): Promise<{ data: ProductFieldConfig[] }> {
    try {
      // Get all fields for the user
      const { data: allFields, error: fetchError } = await supabase
        .from('product_field_configs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Group by field_key to find duplicates
      const fieldGroups = (allFields || []).reduce((acc, field) => {
        if (!acc[field.field_key]) {
          acc[field.field_key] = [];
        }
        acc[field.field_key].push(field);
        return acc;
      }, {} as Record<string, any[]>);

      // Keep only the first occurrence of each field_key, delete the rest
      const fieldsToDelete: string[] = [];
      Object.values(fieldGroups).forEach(group => {
        if (group.length > 1) {
          // Keep the first one, mark others for deletion
          fieldsToDelete.push(...group.slice(1).map(f => f.id));
        }
      });

      if (fieldsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('product_field_configs')
          .delete()
          .in('id', fieldsToDelete);

        if (deleteError) throw deleteError;
      }

      // Return the cleaned fields
      const cleanedFields = (allFields || []).filter(field => !fieldsToDelete.includes(field.id));
      const transformedFields = cleanedFields.map(field => ({
        id: field.id,
        fieldKey: field.field_key,
        fieldLabel: field.field_label,
        fieldType: field.field_type,
        isRequired: field.is_required,
        isActive: field.is_active,
        fieldOptions: field.field_options || [],
        validationRules: field.validation_rules || {},
        placeholderText: field.placeholder_text || '',
        helpText: field.help_text || '',
        displayOrder: field.display_order || 0,
        isCustom: field.is_custom || false,
        createdAt: field.created_at,
        updatedAt: field.updated_at
      }));

      return { data: transformedFields };
    } catch (error) {
      console.error('Failed to cleanup duplicate fields:', error);
      throw error;
    }
  },

  // Add custom field - COMPLETELY DYNAMIC
  async addCustomField(userId: string, field: Omit<ProductFieldConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<{ data: ProductFieldConfig }> {
    try {
      // Just insert the field - no checking, no restrictions
      const { data, error } = await supabase
        .from('product_field_configs')
        .insert({
          user_id: userId,
          field_key: field.fieldKey,
          field_label: field.fieldLabel,
          field_type: field.fieldType,
          is_required: field.isRequired,
          is_active: field.isActive,
          field_options: field.fieldOptions || [],
          validation_rules: field.validationRules || {},
          placeholder_text: field.placeholderText || '',
          help_text: field.helpText || '',
          display_order: field.displayOrder || 0,
          is_custom: field.isCustom !== undefined ? field.isCustom : true
        })
        .select('*')
        .single();

      if (error) {
        console.error('Database error details:', error);
        // Check if table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('Database table does not exist. Please run the COMPLETE_DATABASE_FIX.sql script in Supabase.');
        }
        // Check for permission errors
        if (error.code === '42501' || error.message?.includes('permission')) {
          throw new Error('Permission denied. Please check your database permissions and RLS policies.');
        }
        // Check for constraint violations
        if (error.code === '23505') {
          throw new Error('Field configuration already exists for this user.');
        }
        throw error;
      }

      // Transform the returned data to frontend format
      const transformedField = {
        id: data.id,
        fieldKey: data.field_key,
        fieldLabel: data.field_label,
        fieldType: data.field_type,
        isRequired: data.is_required,
        isActive: data.is_active,
        fieldOptions: data.field_options || [],
        validationRules: data.validation_rules || {},
        placeholderText: data.placeholder_text || '',
        helpText: data.help_text || '',
        displayOrder: data.display_order || 0,
        isCustom: data.is_custom || false,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      return { data: transformedField };
    } catch (error) {
      console.error('Failed to add custom field:', error);
      throw error;
    }
  },

  // Delete custom field
  async deleteCustomField(userId: string, fieldKey: string): Promise<void> {
    const { error } = await supabase
      .from('product_field_configs')
      .delete()
      .eq('user_id', userId)
      .eq('field_key', fieldKey)
      .eq('is_custom', true);

    if (error) {
      console.error('Database error details:', error);

      // Provide specific error messages based on actual error codes
      if (error.code === '23505') {
        // Only show duplicate error for actual unique constraint violations
        if (error.message?.includes('name') || error.message?.includes('sku')) {
          throw new Error('A product with this name or SKU already exists');
        } else {
          throw new Error('Duplicate data detected. Please check your input');
        }
      } else if (error.code === '23503') {
        throw new Error('Invalid reference data. Please check your field values');
      } else if (error.code === '22P02') {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.code === '42501') {
        throw new Error('Permission denied. Please check your database access');
      } else if (error.code === 'PGRST116') {
        throw new Error('Database table does not exist. Please run the setup script');
      } else if (error.message?.includes('invalid input syntax')) {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.message?.includes('duplicate')) {
        throw new Error('Duplicate data detected. Please check your input');
      } else {
        throw new Error(error.message || 'Failed to create product');
      }
    }
  },

  // Reorder fields
  async reorderFields(userId: string, fieldOrders: { fieldKey: string; order: number }[]): Promise<void> {
    const updates = fieldOrders.map(({ fieldKey, order }) => ({
      user_id: userId,
      field_key: fieldKey,
      display_order: order,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('product_field_configs')
      .upsert(updates, { onConflict: 'user_id,field_key' });

    if (error) {
      console.error('Database error details:', error);

      // Provide specific error messages based on actual error codes
      if (error.code === '23505') {
        // Only show duplicate error for actual unique constraint violations
        if (error.message?.includes('name') || error.message?.includes('sku')) {
          throw new Error('A product with this name or SKU already exists');
        } else {
          throw new Error('Duplicate data detected. Please check your input');
        }
      } else if (error.code === '23503') {
        throw new Error('Invalid reference data. Please check your field values');
      } else if (error.code === '22P02') {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.code === '42501') {
        throw new Error('Permission denied. Please check your database access');
      } else if (error.code === 'PGRST116') {
        throw new Error('Database table does not exist. Please run the setup script');
      } else if (error.message?.includes('invalid input syntax')) {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.message?.includes('duplicate')) {
        throw new Error('Duplicate data detected. Please check your input');
      } else {
        throw new Error(error.message || 'Failed to create product');
      }
    }
  }
};

export const dynamicProductsApi = {
  // Get products with dynamic fields
  async list(userId: string, searchTerm?: string): Promise<{ data: DynamicProduct[] }> {
    let query = supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Database error details:', error);

      // Provide specific error messages based on actual error codes
      if (error.code === '23505') {
        // Only show duplicate error for actual unique constraint violations
        if (error.message?.includes('name') || error.message?.includes('sku')) {
          throw new Error('A product with this name or SKU already exists');
        } else {
          throw new Error('Duplicate data detected. Please check your input');
        }
      } else if (error.code === '23503') {
        throw new Error('Invalid reference data. Please check your field values');
      } else if (error.code === '22P02') {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.code === '42501') {
        throw new Error('Permission denied. Please check your database access');
      } else if (error.code === 'PGRST116') {
        throw new Error('Database table does not exist. Please run the setup script');
      } else if (error.message?.includes('invalid input syntax')) {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.message?.includes('duplicate')) {
        throw new Error('Duplicate data detected. Please check your input');
      } else {
        throw new Error(error.message || 'Failed to create product');
      }
    }

    // Transform the data to include customData
    const transformedData = (data || []).map(product => ({
      ...product,
      customData: product.custom_data || {}
    }));

    return { data: transformedData };
  },

  // Create product with dynamic data - COMPLETELY DYNAMIC
  async create(userId: string, productData: ProductFormData): Promise<{ data: DynamicProduct }> {
    // Extract only the core database fields
    const { sku, name, brand, category, salePrice, retailPrice, stock, ...allCustomData } = productData;

    // Convert decimal numbers to integers for stock field
    const processedStock = stock ? Math.round(Number(stock)) : null;

    // ALL other fields go into customData - completely dynamic
    const finalCustomData = {
      ...allCustomData,
      // Also include salePrice and retailPrice in customData for table display
      ...(salePrice && { salePrice }),
      ...(retailPrice && { retailPrice })
    };

    const { data, error } = await supabase
      .from('products')
      .insert({
        user_id: userId,
        sku: sku || 'N/A',
        name: name || 'N/A',
        brand: brand || 'N/A',
        category: category || 'N/A',
        sale_price: salePrice || null,
        retail_price: retailPrice || null,
        stock: processedStock,
        custom_data: finalCustomData,
        field_config_version: 1
      })
      .select('*')
      .single();

    if (error) {
      console.error('Database error details:', error);

      // Provide specific error messages based on actual error codes
      if (error.code === '23505') {
        // Only show duplicate error for actual unique constraint violations
        if (error.message?.includes('name') || error.message?.includes('sku')) {
          throw new Error('A product with this name or SKU already exists');
        } else {
          throw new Error('Duplicate data detected. Please check your input');
        }
      } else if (error.code === '23503') {
        throw new Error('Invalid reference data. Please check your field values');
      } else if (error.code === '22P02') {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.code === '42501') {
        throw new Error('Permission denied. Please check your database access');
      } else if (error.code === 'PGRST116') {
        throw new Error('Database table does not exist. Please run the setup script');
      } else if (error.message?.includes('invalid input syntax')) {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.message?.includes('duplicate')) {
        throw new Error('Duplicate data detected. Please check your input');
      } else {
        throw new Error(error.message || 'Failed to create product');
      }
    }

    // Transform the returned data to include customData
    const transformedData = {
      ...data,
      customData: data.custom_data || {}
    };

    return { data: transformedData };
  },

  // Update product with dynamic data - COMPLETELY DYNAMIC
  async update(productId: string, productData: ProductFormData): Promise<{ data: DynamicProduct }> {
    // Extract only the core database fields
    const { sku, name, brand, category, salePrice, retailPrice, stock, ...allCustomData } = productData;

    // Convert decimal numbers to integers for stock field
    const processedStock = stock ? Math.round(Number(stock)) : null;

    // ALL other fields go into customData - completely dynamic
    const finalCustomData = {
      ...allCustomData,
      // Also include salePrice and retailPrice in customData for table display
      ...(salePrice && { salePrice }),
      ...(retailPrice && { retailPrice })
    };

    const { data, error } = await supabase
      .from('products')
      .update({
        sku,
        name,
        brand,
        category,
        sale_price: salePrice || null,
        retail_price: retailPrice || null,
        stock: processedStock,
        custom_data: finalCustomData,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select('*')
      .single();

    if (error) {
      console.error('Database error details:', error);

      // Provide specific error messages based on actual error codes
      if (error.code === '23505') {
        // Only show duplicate error for actual unique constraint violations
        if (error.message?.includes('name') || error.message?.includes('sku')) {
          throw new Error('A product with this name or SKU already exists');
        } else {
          throw new Error('Duplicate data detected. Please check your input');
        }
      } else if (error.code === '23503') {
        throw new Error('Invalid reference data. Please check your field values');
      } else if (error.code === '22P02') {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.code === '42501') {
        throw new Error('Permission denied. Please check your database access');
      } else if (error.code === 'PGRST116') {
        throw new Error('Database table does not exist. Please run the setup script');
      } else if (error.message?.includes('invalid input syntax')) {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.message?.includes('duplicate')) {
        throw new Error('Duplicate data detected. Please check your input');
      } else {
        throw new Error(error.message || 'Failed to create product');
      }
    }

    // Transform the returned data to include customData
    const transformedData = {
      ...data,
      customData: data.custom_data || {}
    };

    return { data: transformedData };
  },

  // Delete product
  async delete(productId: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Database error details:', error);

      // Provide specific error messages based on actual error codes
      if (error.code === '23505') {
        // Only show duplicate error for actual unique constraint violations
        if (error.message?.includes('name') || error.message?.includes('sku')) {
          throw new Error('A product with this name or SKU already exists');
        } else {
          throw new Error('Duplicate data detected. Please check your input');
        }
      } else if (error.code === '23503') {
        throw new Error('Invalid reference data. Please check your field values');
      } else if (error.code === '22P02') {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.code === '42501') {
        throw new Error('Permission denied. Please check your database access');
      } else if (error.code === 'PGRST116') {
        throw new Error('Database table does not exist. Please run the setup script');
      } else if (error.message?.includes('invalid input syntax')) {
        throw new Error('Invalid data format. Please check your field values');
      } else if (error.message?.includes('duplicate')) {
        throw new Error('Duplicate data detected. Please check your input');
      } else {
        throw new Error(error.message || 'Failed to create product');
      }
    }
  }
};
