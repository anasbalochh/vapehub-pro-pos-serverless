# Multi-Tenant Dynamic Branding Implementation

## Overview
This document describes the implementation of multi-tenant dynamic branding, allowing each user to set their own business/website name that appears throughout the application.

## Database Changes

### Migration Required
Run the SQL migration file: `frontend/database/migration_add_business_name.sql`

This adds a `business_name` column to the `users` table with:
- Type: VARCHAR(255)
- Default: 'My Business'
- Existing users get their username as business_name

## Implementation Details

### 1. User Interface Updates

**AuthContext (`frontend/src/contexts/AuthContext.tsx`)**
- Added `businessName: string` to User interface
- Updated signup function to accept `businessName` parameter
- All user queries now fetch `business_name` from database
- Fallback logic: `business_name` → `username` → `'My Business'`

**Signup Page (`frontend/src/pages/Signup.tsx`)**
- Added "Business/Website Name" input field
- Required field with validation
- Help text: "This name will appear throughout your POS system"
- Removed hardcoded "vape-hub" text

**Login Page (`frontend/src/pages/Login.tsx`)**
- Uses `useBusinessName()` hook to display dynamic business name
- Replaces hardcoded "vape-hub" title

**Layout Component (`frontend/src/components/Layout.tsx`)**
- Navigation bar displays user's business name
- Uses `useBusinessName()` hook

### 2. Utility Hook

**useBusinessName Hook (`frontend/src/hooks/useBusinessName.ts`)**
- New hook for easy access to business name
- Returns business name from user context
- Fallback: 'My Business' if user not authenticated or name not set

### 3. Printer Integration

**Printer API (`frontend/src/lib/api/printer.ts`)**
- `formatReceipt()` function now accepts `businessName` parameter
- Receipt header shows: `"{BUSINESS_NAME} POS"`
- Business name truncated to 28 chars if too long
- All print functions (test, receipt, return receipt) use dynamic name

### 4. API Updates

**Auth API (`frontend/src/lib/api/auth.ts`)**
- `getCurrentUser()` now fetches `business_name` from database
- User creation includes `business_name` from metadata or fallback

## Files Modified

1. `frontend/database/migration_add_business_name.sql` (NEW)
2. `frontend/src/contexts/AuthContext.tsx`
3. `frontend/src/pages/Signup.tsx`
4. `frontend/src/pages/Login.tsx`
5. `frontend/src/components/Layout.tsx`
6. `frontend/src/hooks/useBusinessName.ts` (NEW)
7. `frontend/src/lib/api/printer.ts`
8. `frontend/src/lib/api/auth.ts`
9. `frontend/src/pages/EmailConfirmation.tsx`

## Usage

### For New Users
1. During signup, user enters their business/website name
2. Name is stored in database
3. Name appears throughout the application:
   - Login page title
   - Navigation bar
   - Printer receipts

### For Existing Users
- Existing users without `business_name` get their `username` as fallback
- If username is also missing, default to "My Business"
- Migration script sets business_name for existing users

## Testing Checklist

- [ ] Run database migration
- [ ] Create new account with business name
- [ ] Verify business name appears on login page
- [ ] Verify business name appears in navigation
- [ ] Verify business name appears on printed receipts
- [ ] Test with existing user (should see username or "My Business")
- [ ] Test signup validation (business name required)
- [ ] Test long business names (should truncate on receipts)

## Future Enhancements

1. Allow users to update business name in settings
2. Add business logo upload
3. Customize colors per business
4. Multi-location support with different names per location

