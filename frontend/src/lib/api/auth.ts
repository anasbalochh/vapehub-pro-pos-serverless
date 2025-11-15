import { supabase } from '../supabase';

// Helper function to get current user - only uses Supabase Auth
export async function getCurrentUser() {
  // Get user from Supabase Auth session
  const { data: { session }, error } = await supabase.auth.getSession();

  if (!session || !session.user) {
    throw new Error('User not authenticated');
  }

  // Check if email is confirmed
  if (!session.user.email_confirmed_at) {
    throw new Error('Please confirm your email before accessing this feature.');
  }

  // Get user details from our users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, username, role, business_name')
    .eq('id', session.user.id)
    .single();

  // If user doesn't exist in users table, create it
  if (userError && userError.code === 'PGRST116') {
    try {
      const { data: newUserData, error: createError } = await supabase
        .from('users')
        .insert([{
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.email?.split('@')[0] || 'user',
          business_name: session.user.user_metadata?.business_name || session.user.email?.split('@')[0] || 'My Business',
          role: 'user',
          is_active: true,
          theme_preference: 'light'
        }])
        .select('id, email, username, role, business_name')
        .single();

      if (newUserData && !createError) {
        return newUserData;
      }
    } catch (createError: any) {
      // If creation fails due to RLS, try to get user again after a moment
      // This handles race conditions
      const { data: retryUserData } = await supabase
        .from('users')
        .select('id, email, username, role, business_name')
        .eq('id', session.user.id)
        .single();

      if (retryUserData) {
        return retryUserData;
      }
    }
  }

  if (!userData) {
    throw new Error('User not found in database. Please contact support.');
  }

  return userData;
}

// Auth API - Note: This API is deprecated in favor of AuthContext which uses Supabase Auth directly
// Keeping for backward compatibility but all auth should go through AuthContext
export const authApi = {
  async verify() {
    try {
      const user = await getCurrentUser();
      return {
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        }
      };
    } catch (error: any) {
      throw { response: { data: { message: 'User not authenticated' } } };
    }
  }
};
