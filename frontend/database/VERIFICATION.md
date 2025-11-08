# Database Schema Verification Checklist

This document verifies that all tables, columns, indexes, and policies match what the codebase expects.

## ✅ Tables Verification

### 1. users
- ✅ id (UUID, PRIMARY KEY, REFERENCES auth.users)
- ✅ email (TEXT, NOT NULL, UNIQUE)
- ✅ username (TEXT, NOT NULL)
- ✅ role (TEXT, DEFAULT 'user', CHECK IN ('user', 'admin', 'manager'))
- ✅ is_active (BOOLEAN, DEFAULT true)
- ✅ theme_preference (TEXT, DEFAULT 'light', CHECK IN ('light', 'dark', 'system'))
- ✅ created_at (TIMESTAMPTZ, DEFAULT NOW())
- ✅ updated_at (TIMESTAMPTZ, DEFAULT NOW())

**Used in:**
- `src/contexts/AuthContext.tsx`
- `src/lib/api/auth.ts`
- `src/lib/supabase.ts`
- `src/pages/EmailConfirmation.tsx`
- `src/contexts/ThemeContext.tsx`

### 2. industries
- ✅ id (UUID, PRIMARY KEY)
- ✅ name (TEXT, NOT NULL, UNIQUE)
- ✅ display_name (TEXT, NOT NULL)
- ✅ icon (TEXT, DEFAULT 'store')
- ✅ color (TEXT, DEFAULT '#3b82f6')
- ✅ description (TEXT)
- ✅ default_fields (JSONB, DEFAULT '[]')
- ✅ default_categories (TEXT[], DEFAULT ARRAY[])
- ✅ is_active (BOOLEAN, DEFAULT true)
- ✅ created_at (TIMESTAMPTZ, DEFAULT NOW())
- ✅ updated_at (TIMESTAMPTZ, DEFAULT NOW())

**Used in:**
- `src/lib/multi-industry-api.ts`
- `src/types/multi-industry.ts`

### 3. user_industry_settings
- ✅ id (UUID, PRIMARY KEY)
- ✅ user_id (UUID, REFERENCES users, UNIQUE)
- ✅ industry_id (UUID, REFERENCES industries)
- ✅ business_name (TEXT, NOT NULL)
- ✅ currency (TEXT, DEFAULT 'PKR')
- ✅ currency_symbol (TEXT, DEFAULT '₨')
- ✅ tax_rate (DECIMAL(5,4), DEFAULT 0.0000)
- ✅ custom_categories (TEXT[], DEFAULT ARRAY[])
- ✅ created_at (TIMESTAMPTZ, DEFAULT NOW())
- ✅ updated_at (TIMESTAMPTZ, DEFAULT NOW())

**Used in:**
- `src/lib/multi-industry-api.ts`
- `src/types/multi-industry.ts`

### 4. product_field_configs
- ✅ id (UUID, PRIMARY KEY)
- ✅ user_id (UUID, REFERENCES users)
- ✅ field_key (TEXT, NOT NULL)
- ✅ field_label (TEXT, NOT NULL)
- ✅ field_type (TEXT, CHECK IN ('text', 'number', 'select', 'date', 'boolean', 'multiselect'))
- ✅ is_required (BOOLEAN, DEFAULT false)
- ✅ is_active (BOOLEAN, DEFAULT true)
- ✅ field_options (TEXT[], DEFAULT ARRAY[])
- ✅ validation_rules (JSONB, DEFAULT '{}')
- ✅ placeholder_text (TEXT, DEFAULT '')
- ✅ help_text (TEXT, DEFAULT '')
- ✅ display_order (INTEGER, DEFAULT 0)
- ✅ is_custom (BOOLEAN, DEFAULT false)
- ✅ created_at (TIMESTAMPTZ, DEFAULT NOW())
- ✅ updated_at (TIMESTAMPTZ, DEFAULT NOW())
- ✅ UNIQUE(user_id, field_key) - **Named constraint for upsert**

**Used in:**
- `src/lib/multi-industry-api.ts` (uses upsert with onConflict: 'user_id,field_key')
- `src/types/multi-industry.ts`
- `src/components/FieldSettings.tsx`

### 5. products
- ✅ id (UUID, PRIMARY KEY)
- ✅ user_id (UUID, REFERENCES users)
- ✅ industry_id (UUID, REFERENCES industries, nullable)
- ✅ sku (TEXT, NOT NULL)
- ✅ name (TEXT, NOT NULL)
- ✅ brand (TEXT, nullable)
- ✅ category (TEXT, DEFAULT 'General')
- ✅ sale_price (DECIMAL(12,2), nullable, CHECK >= 0)
- ✅ retail_price (DECIMAL(12,2), nullable, CHECK >= 0)
- ✅ stock (INTEGER, DEFAULT 0, CHECK >= 0)
- ✅ custom_data (JSONB, DEFAULT '{}')
- ✅ field_config_version (INTEGER, DEFAULT 1)
- ✅ is_active (BOOLEAN, DEFAULT true)
- ✅ created_at (TIMESTAMPTZ, DEFAULT NOW())
- ✅ updated_at (TIMESTAMPTZ, DEFAULT NOW())
- ✅ UNIQUE(user_id, sku)

**Used in:**
- `src/lib/supabase.ts`
- `src/lib/multi-industry-api.ts`
- `src/lib/api/products.ts`
- `src/pages/Products.tsx`
- `src/pages/POS.tsx`
- `src/pages/Returns.tsx`

### 6. orders
- ✅ id (UUID, PRIMARY KEY)
- ✅ user_id (UUID, REFERENCES users)
- ✅ order_number (TEXT, NOT NULL, UNIQUE)
- ✅ type (TEXT, CHECK IN ('Sale', 'Refund'))
- ✅ subtotal (DECIMAL(12,2), DEFAULT 0, CHECK >= 0)
- ✅ discount_type (TEXT, DEFAULT 'percentage', CHECK IN ('percentage', 'fixed'))
- ✅ discount_value (DECIMAL(12,2), DEFAULT 0, CHECK >= 0)
- ✅ discount_amount (DECIMAL(12,2), DEFAULT 0, CHECK >= 0)
- ✅ tax (DECIMAL(12,2), DEFAULT 0, CHECK >= 0)
- ✅ total (DECIMAL(12,2), DEFAULT 0, CHECK >= 0)
- ✅ notes (TEXT, nullable)
- ✅ created_at (TIMESTAMPTZ, DEFAULT NOW())
- ✅ updated_at (TIMESTAMPTZ, DEFAULT NOW())

**Used in:**
- `src/lib/supabase.ts`
- `src/lib/api/orders.ts`
- `src/lib/api/printer.ts`
- `src/pages/Dashboard.tsx`
- `src/pages/Reports.tsx`

### 7. order_items
- ✅ id (UUID, PRIMARY KEY)
- ✅ order_id (UUID, REFERENCES orders)
- ✅ product_id (UUID, REFERENCES products, nullable)
- ✅ sku (TEXT, NOT NULL)
- ✅ name (TEXT, NOT NULL)
- ✅ category (TEXT, nullable)
- ✅ unit_price (DECIMAL(12,2), NOT NULL, CHECK >= 0)
- ✅ quantity (INTEGER, NOT NULL, CHECK > 0)
- ✅ line_total (DECIMAL(12,2), NOT NULL, CHECK >= 0)
- ✅ created_at (TIMESTAMPTZ, DEFAULT NOW())

**Used in:**
- `src/lib/supabase.ts`
- `src/lib/api/orders.ts`
- `src/lib/api/reports.ts`

### 8. printer_configs
- ✅ id (UUID, PRIMARY KEY)
- ✅ user_id (UUID, REFERENCES users)
- ✅ printer_type (TEXT, CHECK IN ('usb', 'network'))
- ✅ device_address (TEXT, NOT NULL)
- ✅ printer_name (TEXT, NOT NULL)
- ✅ is_active (BOOLEAN, DEFAULT true)
- ✅ config_options (JSONB, DEFAULT '{}')
- ✅ created_at (TIMESTAMPTZ, DEFAULT NOW())
- ✅ updated_at (TIMESTAMPTZ, DEFAULT NOW())

**Used in:**
- `src/lib/supabase.ts`
- `src/lib/api/printer.ts`
- `src/pages/PrinterManager.tsx`

### 9. print_jobs
- ✅ id (UUID, PRIMARY KEY)
- ✅ user_id (UUID, REFERENCES users)
- ✅ printer_config_id (UUID, REFERENCES printer_configs, nullable)
- ✅ job_type (TEXT, CHECK IN ('receipt', 'return_receipt', 'test', 'test_page'))
- ✅ order_id (UUID, REFERENCES orders, nullable)
- ✅ receipt_data (JSONB, nullable)
- ✅ receipt_text (TEXT, nullable)
- ✅ status (TEXT, DEFAULT 'pending', CHECK IN ('pending', 'completed', 'failed'))
- ✅ error_message (TEXT, nullable)
- ✅ printed_at (TIMESTAMPTZ, nullable)
- ✅ attempted_at (TIMESTAMPTZ, nullable)
- ✅ created_at (TIMESTAMPTZ, DEFAULT NOW())

**Used in:**
- `src/lib/supabase.ts`
- `src/lib/api/printer.ts`
- `src/pages/PrinterManager.tsx`

## ✅ Indexes Verification

All tables have appropriate indexes on:
- Foreign keys (user_id, order_id, product_id, etc.)
- Frequently queried columns (email, username, sku, order_number)
- Filter columns (is_active, status, type)
- JSONB columns (custom_data with GIN index)
- Sort columns (created_at DESC)

## ✅ RLS Policies Verification

All tables have RLS enabled with policies for:
- ✅ SELECT: Users can only view their own data
- ✅ INSERT: Users can only insert their own data
- ✅ UPDATE: Users can only update their own data
- ✅ DELETE: Users can only delete their own data (where applicable)
- ✅ Industries: Public read access for active industries
- ✅ Order Items: Access through parent order ownership

## ✅ Constraints Verification

- ✅ Foreign key constraints on all relationships
- ✅ Unique constraints (users.email, users.username, orders.order_number, products(user_id, sku))
- ✅ Check constraints (role, theme_preference, type, status, etc.)
- ✅ NOT NULL constraints on required fields
- ✅ Default values on appropriate fields

## ✅ Triggers Verification

- ✅ `update_updated_at_column()` function created
- ✅ Triggers on all tables with `updated_at` column:
  - users
  - industries
  - user_industry_settings
  - product_field_configs
  - products
  - orders
  - printer_configs

## ✅ Initial Data Verification

- ✅ Vape industry with default fields
- ✅ Retail industry with default fields
- ✅ Restaurant industry with default fields
- ✅ All industries have proper JSONB field configurations
- ✅ All industries have default categories arrays

## ✅ Code Compatibility

### Upsert Operations
- ✅ `product_field_configs` uses `upsert` with `onConflict: 'user_id,field_key'`
- ✅ SQL has `UNIQUE(user_id, field_key)` constraint - **COMPATIBLE**

### Field Name Mapping
- ✅ Database uses snake_case (user_id, created_at, etc.)
- ✅ Code transforms to camelCase (userId, createdAt) in frontend
- ✅ All field names match between code and SQL

### Data Types
- ✅ UUID for all IDs
- ✅ TEXT for strings
- ✅ DECIMAL for prices and amounts
- ✅ INTEGER for quantities and stock
- ✅ BOOLEAN for flags
- ✅ JSONB for dynamic data (custom_data, config_options, etc.)
- ✅ TEXT[] for arrays (categories, options)
- ✅ TIMESTAMPTZ for timestamps

## ✅ Summary

**All tables, columns, indexes, constraints, policies, and initial data are correctly defined and match the codebase requirements.**

The SQL schema is complete and ready for deployment to Supabase.

