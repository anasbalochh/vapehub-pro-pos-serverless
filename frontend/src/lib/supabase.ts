import { createClient } from '@supabase/supabase-js';

// Supabase configuration with fallback values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wfmllkabeisedfvrmscm.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmbWxsa2FiZWlzZWRmdnJtc2NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODMyMTAsImV4cCI6MjA3NTY1OTIxMH0.NDPccHACcbqPANu7EEp7mAJbdNOwPszZUr_ah8jEnmw';

// Debug environment variables
console.log('Supabase Configuration Debug:');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);
console.log('Key starts with eyJ:', supabaseKey?.startsWith('eyJ'));

// Validate configuration
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing. Please check your .env file.');
}

if (!supabaseUrl.includes('supabase.co')) {
    throw new Error('Invalid Supabase URL. Please check VITE_SUPABASE_URL in your .env file.');
}

if (!supabaseKey.startsWith('eyJ')) {
    throw new Error('Invalid Supabase key. Please check VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// Helper function to get current user - only uses Supabase Auth
const getCurrentUser = async () => {
    // Get user from Supabase Auth session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (!session || !session.user) {
        throw new Error('No user found in session');
    }

    // Get user details from our users table
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, username, role')
        .eq('id', session.user.id)
        .single();

    if (userError || !userData) {
        throw new Error('User not found in database');
    }

    return userData;
};

// Test Supabase connection
export const testSupabaseConnection = async () => {
    try {
        console.log('Testing Supabase connection...');
        const { data, error } = await supabase
            .from('users')
            .select('id, username')
            .limit(1);

        console.log('Supabase connection test result:', { data, error });
        return { success: !error, data, error };
    } catch (error) {
        console.error('Supabase connection test failed:', error);
        return { success: false, error };
    }
};

// Database helper functions
export const db = {
    // Users
    async createUser(userData: any) {
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getUserByUsername(username: string) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    async getUserById(id: string) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    // Products
    async getProducts(userId: string, searchTerm = '') {
        let query = supabase
            .from('products')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getProductById(id: string, userId: string) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return data;
    },

    async createProduct(productData: any) {
        const { data, error } = await supabase
            .from('products')
            .insert([productData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateProduct(id: string, userId: string, updateData: any) {
        const { data, error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteProduct(id: string, userId: string) {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
    },

    async updateProductStock(id: string, userId: string, newStock: number) {
        const { data, error } = await supabase
            .from('products')
            .update({ stock: newStock, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Orders
    async createOrder(orderData: any) {
        const { data, error } = await supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async createOrderItems(orderItems: any[]) {
        const { data, error } = await supabase
            .from('order_items')
            .insert(orderItems)
            .select();

        if (error) throw error;
        return data;
    },

    async getOrders(userId: string, limit = 100, offset = 0) {
        const { data, error } = await supabase
            .from('orders')
            .select(`
        *,
        order_items (*)
      `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return data;
    },

    async getOrderById(id: string, userId: string) {
        const { data, error } = await supabase
            .from('orders')
            .select(`
        *,
        order_items (*)
      `)
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return data;
    },

    async getOrderItems(orderId: string) {
        const { data, error } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    },

    // Reports
    async getSalesSummary(userId: string) {
        const { data, error } = await supabase
            .from('orders')
            .select('type, total, discount_amount')
            .eq('user_id', userId);

        if (error) throw error;
        return data;
    },

    async getTopProducts(userId: string, limit = 4) {
        const { data, error } = await supabase
            .from('order_items')
            .select(`
        name,
        sku,
        quantity,
        line_total,
        orders!inner(user_id)
      `)
            .eq('orders.user_id', userId)
            .eq('orders.type', 'Sale');

        if (error) throw error;
        return data;
    },

    async getSalesByCategory(userId: string) {
        const { data, error } = await supabase
            .from('order_items')
            .select(`
        category,
        quantity,
        line_total,
        orders!inner(user_id)
      `)
            .eq('orders.user_id', userId)
            .eq('orders.type', 'Sale');

        if (error) throw error;
        return data;
    },

    // Printer configurations
    async createPrinterConfig(configData: any) {
        try {
            const user = await getCurrentUser();
            console.log('Creating printer config for user:', user.id);
            console.log('Config data:', configData);

            const { data, error } = await supabase
                .from('printer_configs')
                .insert([{
                    user_id: user.id,
                    ...configData
                }])
                .select()
                .single();

            console.log('Create printer config result:', { data, error });

            if (error) {
                console.error('Create printer config error:', error);
                throw error;
            }
            return data;
        } catch (error) {
            console.error('createPrinterConfig error:', error);
            throw error;
        }
    },

    async getPrinterConfig() {
        try {
            const user = await getCurrentUser();
            console.log('Current user ID:', user.id);
            console.log('User ID type:', typeof user.id);

            // Try a simpler query first
            const { data, error } = await supabase
                .from('printer_configs')
                .select('*')
                .eq('user_id', user.id);

            console.log('Printer config query result:', { data, error });

            if (error) {
                console.error('Printer config query error:', error);
                console.error('Error details:', error.message, error.code, error.details);
                return null;
            }

            // Filter for active configs in the application
            const activeConfig = data?.find(config => config.is_active === true);
            console.log('Active config found:', activeConfig);

            return activeConfig || null;
        } catch (error) {
            console.error('getPrinterConfig error:', error);
            return null;
        }
    },

    async updatePrinterConfig(configData: any) {
        const user = await getCurrentUser();
        const { data, error } = await supabase
            .from('printer_configs')
            .update(configData)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deactivatePrinterConfig() {
        const user = await getCurrentUser();
        const { data, error } = await supabase
            .from('printer_configs')
            .update({ is_active: false })
            .eq('user_id', user.id)
            .eq('is_active', true);

        if (error) throw error;
        return data;
    },

    // Printer logs for tracking print history
    async logPrintJob(jobData: any) {
        const user = await getCurrentUser();
        const { data, error } = await supabase
            .from('print_jobs')
            .insert([{
                user_id: user.id,
                ...jobData
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getPrintHistory(limit = 50) {
        const user = await getCurrentUser();
        const { data, error } = await supabase
            .from('print_jobs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }
};

export default supabase;