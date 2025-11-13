import { createClient } from '@supabase/supabase-js';

// Supabase configuration - MUST be set via environment variables
// Vite automatically loads .env files, but variables must be prefixed with VITE_

// Environment variables are loaded by Vite automatically

// Try multiple ways to get the environment variables
const supabaseUrl = (
    import.meta.env.VITE_SUPABASE_URL ||
    (import.meta.env as any).VITE_SUPABASE_URL ||
    ''
)?.trim();

const supabaseKey = (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    (import.meta.env as any).VITE_SUPABASE_ANON_KEY ||
    ''
)?.trim();

// Check if environment variables are missing (only log error, no excessive debug)
if ((!supabaseUrl || !supabaseKey) && import.meta.env.DEV) {
    console.error('⚠️ Supabase environment variables not found!');
    console.error('Please create frontend/.env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Helper function to validate and get configuration
const getSupabaseConfig = () => {
    // Check if variables are missing or empty
    const urlMissing = !supabaseUrl || supabaseUrl === '';
    const keyMissing = !supabaseKey || supabaseKey === '';

    if (urlMissing || keyMissing) {
        const errorMessage = `
Supabase configuration is missing!

Please create a .env file in the root directory with:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

You can get these values from your Supabase project settings:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings > API
4. Copy the Project URL and anon/public key

After creating the .env file, restart your development server.

Current values:
- VITE_SUPABASE_URL: ${supabaseUrl ? 'Set (but may be invalid)' : 'MISSING'}
- VITE_SUPABASE_ANON_KEY: ${supabaseKey ? 'Set (but may be invalid)' : 'MISSING'}
        `.trim();

        console.error(errorMessage);

        // Throw error in Node.js environment (build time)
        if (typeof window === 'undefined') {
            throw new Error('Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
        }

        return null;
    }

    // Validate URL format
    if (!supabaseUrl.includes('supabase.co') && !supabaseUrl.includes('supabase.in')) {
        console.warn('Warning: Supabase URL does not match expected format. Should contain "supabase.co" or "supabase.in"');
    }

    if (!supabaseUrl.startsWith('https://')) {
        console.warn('Warning: Supabase URL should start with https://');
    }

    // Validate key format
    if (!supabaseKey.startsWith('eyJ')) {
        console.warn('Warning: Supabase key format may be invalid. Should start with "eyJ"');
    }

    if (supabaseKey.length < 100) {
        console.warn('Warning: Supabase key seems too short. Please verify it is the complete anon key.');
    }

    return { url: supabaseUrl, key: supabaseKey };
};

// Get validated configuration
const config = getSupabaseConfig();

// Create Supabase client only if we have valid configuration
let supabaseClient: ReturnType<typeof createClient>;

if (config) {
    // Valid configuration - create normal client with timeout settings
    try {
        console.log('🔧 Initializing Supabase client with URL:', config.url.substring(0, 30) + '...');
        supabaseClient = createClient(config.url, config.key, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
                storageKey: 'supabase.auth.token'
            },
            global: {
                fetch: (url, options = {}) => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout - increased for slow connections

                    return fetch(url, {
                        ...options,
                        signal: controller.signal
                    }).then(response => {
                        clearTimeout(timeoutId);
                        if (!response.ok) {
                            console.error('❌ Supabase fetch error:', response.status, response.statusText, url);
                        }
                        return response;
                    }).catch(error => {
                        clearTimeout(timeoutId);
                        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                            const timeoutError = new Error(`Connection timeout after 60 seconds. URL: ${url}. Please check your Supabase configuration and internet connection.`);
                            console.error('❌', timeoutError.message);
                            throw timeoutError;
                        }
                        console.error('❌ Supabase fetch error:', error.message, url);
                        throw error;
                    });
                }
            }
        });
        console.log('✅ Supabase client initialized successfully');
    } catch (err) {
        console.error('❌ Failed to create Supabase client:', err);
        throw err;
    }
} else {
    // Invalid configuration - create a dummy client that will throw helpful errors at runtime
    const dummyUrl = 'https://dummy.supabase.co';
    const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.dummy';

    try {
        supabaseClient = createClient(dummyUrl, dummyKey);
    } catch (err) {
        console.error('❌ Failed to create dummy Supabase client:', err);
        throw err;
    }

    // Override methods to throw helpful errors at runtime
    const configError = new Error(
        'Supabase configuration is missing. Please create a .env file in the frontend directory with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the development server.'
    );

    // Wrap the client methods to throw errors with better messages
    const originalFrom = supabaseClient.from.bind(supabaseClient);
    supabaseClient.from = ((table: string) => {
        console.error('❌ Supabase configuration error:', configError.message);
        throw configError;
    }) as any;

    const originalAuth = supabaseClient.auth;
    supabaseClient.auth = new Proxy(originalAuth, {
        get(_target, prop) {
            if (prop === 'getSession' || prop === 'signInWithPassword' || prop === 'signUp' || prop === 'signOut' || prop === 'onAuthStateChange') {
                return (...args: any[]) => {
                    console.error('❌ Supabase configuration error:', configError.message);
                    return Promise.reject(configError);
                };
            }
            return (originalAuth as any)[prop];
        }
    }) as any;

    console.error('⚠️ Supabase client created with dummy config - all operations will fail');
}

export const supabase = supabaseClient;

// Helper function to get current user - only uses Supabase Auth
const getCurrentUser = async () => {
    // Get user from Supabase Auth session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (!session || !session.user) {
        throw new Error('No user found in session');
    }

    // Try to get user details from our users table, but use fallback if it fails
    try {
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, username, role')
            .eq('id', session.user.id)
            .single();

        if (userData && !userError) {
            return userData;
        }
    } catch (err) {
        console.warn('getCurrentUser: Failed to fetch from users table, using fallback', err);
    }

    // Fallback: return user data from auth session
    return {
        id: session.user.id,
        email: session.user.email || '',
        username: session.user.email?.split('@')[0] || 'user',
        role: 'user'
    };
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
            .insert([userData] as any)
            .select()
            .single();

        if (error) {
            // Handle 403 Forbidden errors - usually RLS policy issues
            if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
                // User might already exist or RLS is blocking
                // Try to get existing user
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userData.id)
                    .single();

                if (existingUser) {
                    return existingUser;
                }
                throw new Error('Permission denied. Please ensure your email is confirmed.');
            }
            throw error;
        }
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
            .insert([productData] as any)
            .select()
            .single();

        if (error) {
            // Handle 403 Forbidden errors - usually RLS policy issues
            if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
                throw new Error('Permission denied. Please ensure your email is confirmed and you have the necessary permissions.');
            }
            throw error;
        }
        return data;
    },

    async updateProduct(id: string, userId: string, updateData: any) {
        const { data, error } = await (supabase
            .from('products') as any)
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
        const { data, error } = await (supabase
            .from('products') as any)
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
            .insert([orderData] as any)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async createOrderItems(orderItems: any[]) {
        if (!orderItems || orderItems.length === 0) {
            throw new Error('No order items provided');
        }

        // Ensure all required fields are present and valid
        const validatedItems = orderItems.map(item => ({
            order_id: item.order_id,
            product_id: item.product_id || null,
            sku: String(item.sku || '').trim(),
            name: String(item.name || '').trim(),
            category: item.category ? String(item.category).trim() : null,
            unit_price: parseFloat(item.unit_price) || 0,
            quantity: parseInt(item.quantity) || 0,
            line_total: parseFloat(item.line_total) || 0,
        }));

        // Validate required fields
        for (const item of validatedItems) {
            if (!item.order_id) {
                throw new Error('Order ID is required for all items');
            }
            if (!item.sku || item.sku === '') {
                throw new Error('SKU is required for all items');
            }
            if (!item.name || item.name === '') {
                throw new Error('Product name is required for all items');
            }
            if (item.unit_price < 0) {
                throw new Error('Unit price cannot be negative');
            }
            if (item.quantity <= 0) {
                throw new Error('Quantity must be greater than 0');
            }
            if (item.line_total < 0) {
                throw new Error('Line total cannot be negative');
            }
        }

        const { data, error } = await supabase
            .from('order_items')
            .insert(validatedItems as any)
            .select();

        if (error) {
            console.error('Supabase error creating order items:', error);
            console.error('Items attempted:', JSON.stringify(validatedItems, null, 2));
            throw error;
        }

        if (!data || data.length === 0) {
            throw new Error('Order items were inserted but no data was returned');
        }

        return data;
    },

    async getOrders(userId: string, limit?: number, offset = 0, dateRange?: { start?: string; end?: string }) {
        try {
            let query = supabase
            .from('orders')
            .select(`
        *,
        order_items (*)
      `)
            .eq('user_id', userId);

            // Apply date filtering if provided
            if (dateRange?.start) {
                query = query.gte('created_at', dateRange.start);
            }
            if (dateRange?.end) {
                // Add one day to end date to include the entire end date
                const endDate = new Date(dateRange.end);
                endDate.setDate(endDate.getDate() + 1);
                query = query.lt('created_at', endDate.toISOString().split('T')[0]);
            }

            query = query.order('created_at', { ascending: false });

            // Only apply limit if specified, otherwise get all orders
            if (limit && limit > 0) {
                query = query.range(offset, offset + limit - 1);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching orders:', error);
                throw new Error(`Failed to fetch orders: ${error.message || 'Unknown error'}`);
            }

            return data || [];
        } catch (error: any) {
            console.error('getOrders error:', error);
            // Return empty array instead of throwing to prevent app crashes
            return [];
        }
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
            console.log('Creating printer config for user:', (user as any).id);
            console.log('Config data:', configData);

            const { data, error } = await supabase
                .from('printer_configs')
                .insert([{
                    user_id: (user as any).id,
                    ...configData
                }] as any)
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
            console.log('Current user ID:', (user as any).id);
            console.log('User ID type:', typeof (user as any).id);

            // Try a simpler query first
            const { data, error } = await supabase
                .from('printer_configs')
                .select('*')
                .eq('user_id', (user as any).id);

            console.log('Printer config query result:', { data, error });

            if (error) {
                console.error('Printer config query error:', error);
                console.error('Error details:', error.message, error.code, error.details);
                return null;
            }

            // Filter for active configs in the application
            const activeConfig = data?.find((config: any) => config.is_active === true);
            console.log('Active config found:', activeConfig);

            return activeConfig || null;
        } catch (error) {
            console.error('getPrinterConfig error:', error);
            return null;
        }
    },

    async updatePrinterConfig(configData: any) {
        const user = await getCurrentUser();
        const { data, error } = await (supabase
            .from('printer_configs') as any)
            .update(configData)
            .eq('user_id', (user as any).id)
            .eq('is_active', true)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deactivatePrinterConfig() {
        const user = await getCurrentUser();
        const { data, error } = await (supabase
            .from('printer_configs') as any)
            .update({ is_active: false })
            .eq('user_id', (user as any).id)
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
                user_id: (user as any).id,
                ...jobData
            }] as any)
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
            .eq('user_id', (user as any).id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }
};

export default supabase;
