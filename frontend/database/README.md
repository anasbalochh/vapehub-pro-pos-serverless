# Database Schema Setup Guide

This directory contains the complete database schema for the VapeHub Pro POS System.

## Files

- `schema.sql` - Complete database schema with all tables, indexes, RLS policies, and initial data

## Quick Start

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `schema.sql`
5. Click **Run** (or press `Ctrl+Enter`)

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run the schema file
supabase db reset --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" < database/schema.sql
```

### Option 3: Using psql

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f database/schema.sql
```

## What's Included

### Tables Created

1. **users** - User accounts linked to Supabase Auth
2. **industries** - Available industries with default configurations
3. **user_industry_settings** - User-specific industry settings
4. **product_field_configs** - Dynamic field configurations for products
5. **products** - Products with dynamic custom data support
6. **orders** - Sales and return orders
7. **order_items** - Individual items within orders
8. **printer_configs** - Printer configurations per user
9. **print_jobs** - Print job history and receipts

### Features

- ✅ Complete table structure with proper data types
- ✅ Foreign key relationships
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Automatic `updated_at` timestamp triggers
- ✅ Initial industry data (Vape, Retail, Restaurant)
- ✅ Unique constraints and check constraints
- ✅ JSONB support for dynamic data

## Verification

After running the schema, verify the tables were created:

```sql
-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

## Initial Data

The schema includes initial data for:

- **Vape Shop** industry with vape-specific fields
- **General Retail** industry with basic fields
- **Restaurant** industry with food service fields

## Security

All tables have Row Level Security (RLS) enabled with policies that ensure:
- Users can only access their own data
- Industries are publicly readable (for selection)
- All operations are authenticated via Supabase Auth

## Troubleshooting

### Error: "relation already exists"
If tables already exist, you can either:
1. Drop existing tables (⚠️ **WARNING**: This will delete all data)
2. Use `CREATE TABLE IF NOT EXISTS` (already included in schema)
3. Modify the schema to use `ALTER TABLE` for existing tables

### Error: "permission denied"
Make sure you're running the SQL as the `postgres` user or have sufficient privileges.

### Error: "extension does not exist"
The schema uses `uuid-ossp` and `pgcrypto` extensions. These should be available by default in Supabase, but if not, contact Supabase support.

## Next Steps

After running the schema:

1. ✅ Verify all tables were created
2. ✅ Test user registration (creates user in `users` table)
3. ✅ Test product creation (creates product in `products` table)
4. ✅ Test order creation (creates order in `orders` table)
5. ✅ Configure printer settings (creates config in `printer_configs` table)

## Support

If you encounter any issues:
1. Check the Supabase logs in the dashboard
2. Verify your RLS policies are correct
3. Ensure your Supabase Auth is properly configured
4. Check that environment variables are set correctly

