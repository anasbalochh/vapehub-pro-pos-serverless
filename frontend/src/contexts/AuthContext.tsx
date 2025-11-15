import { supabase } from '@/lib/supabase';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  businessName: string;
  logoUrl?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, username: string, businessName: string) => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<boolean>;
  updateBusinessName: (businessName: string) => Promise<void>;
  updateLogo: (logoUrl: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session?.user) {
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        // Get user from database
        const { data: userData } = await supabase
            .from('users')
          .select('id, email, username, role, business_name, logo_url')
            .eq('id', session.user.id)
            .single() as any;

          if (mounted && userData) {
            setUser({
                id: userData.id,
                email: userData.email,
                username: userData.username,
            role: userData.role,
            businessName: userData.business_name || userData.username || 'My Business',
            logoUrl: userData.logo_url || undefined
          });
        } else if (mounted && session.user) {
          // Fallback: use session data if user not in database
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              username: session.user.email?.split('@')[0] || 'user',
            role: 'user',
            businessName: session.user.email?.split('@')[0] || 'My Business'
            });
        }
      } catch (error: any) {
          console.warn('Auth check error:', error.message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    // Listen for auth changes (only for external auth events, not manual login)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Only handle SIGNED_OUT here - SIGNED_IN is handled by login function
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
      }
      // Note: SIGNED_IN events are handled by the login function to avoid race conditions
        });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
      // Validate input
      if (!email || !password) {
        throw new Error('Email and password are required.');
      }

      // Sanitize email
      const sanitizedEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        throw new Error('Invalid email format.');
      }

    try {
      console.log('AuthContext: Starting login for', sanitizedEmail);

      // Check Supabase configuration
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured. Please check your .env file.');
      }
      console.log('AuthContext: Supabase URL:', supabaseUrl);

      // Direct Supabase auth call - NO TIMEOUT, let Supabase handle it
      console.log('AuthContext: Calling Supabase signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: password
      });

      if (error) {
        console.error('AuthContext: Supabase login error:', error);
        console.error('AuthContext: Error status:', error.status);
        console.error('AuthContext: Error message:', error.message);

        // Handle specific error types
        if (error.status === 404) {
          throw new Error('Supabase endpoint not found (404). Please verify your VITE_SUPABASE_URL in the .env file. It should be: https://your-project-id.supabase.co');
        }

        if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials')) {
          throw new Error('Invalid email or password.');
        }

        if (error.message?.includes('Email not confirmed') || error.message?.includes('unconfirmed')) {
          throw new Error('Please check your email and click the confirmation link before logging in.');
        }

        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
          throw new Error('Cannot connect to Supabase. Please check your internet connection and Supabase URL configuration.');
        }

        throw new Error(error.message || 'Login failed. Please try again.');
      }

      if (!data?.user) {
        console.error('AuthContext: No user data returned from Supabase');
        throw new Error('Login failed. No user data returned.');
      }

      console.log('AuthContext: User authenticated, email confirmed:', !!data.user.email_confirmed_at);

        // Check if email is confirmed
        if (!data.user.email_confirmed_at) {
          throw new Error('Please confirm your email before logging in. Check your email for the confirmation link.');
        }

      // Get user details from database
          console.log('AuthContext: Fetching user data from database for user ID:', data.user.id);
      const { data: userData, error: userError } = await supabase
                .from('users')
        .select('id, email, username, role, business_name, logo_url')
                .eq('id', data.user.id)
        .single() as any;

          if (userData && !userError) {
        const user = {
                id: userData.id,
                email: userData.email,
                username: userData.username,
          role: userData.role,
          businessName: userData.business_name || userData.username || 'My Business',
          logoUrl: userData.logo_url || undefined
        };
        setUser(user);
        setIsLoading(false);
        console.log('AuthContext: User data set successfully', user);
        // Wait a moment to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
            return;
          }

      // If user doesn't exist, create them
          if (userError?.code === 'PGRST116') {
        console.log('AuthContext: User not found in database, creating...');
        const defaultBusinessName = data.user.user_metadata?.business_name || data.user.email?.split('@')[0] || 'My Business';
        const { data: newUser, error: createError } = await (supabase.from('users') as any)
          .insert([{
            id: data.user.id,
            email: data.user.email || sanitizedEmail,
            username: data.user.email?.split('@')[0] || 'user',
            business_name: defaultBusinessName,
            role: 'user',
            is_active: true,
            theme_preference: 'light'
          }])
          .select()
          .single();

        if (newUser && !createError) {
          const user = {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            role: newUser.role,
            businessName: newUser.business_name || newUser.username || 'My Business',
            logoUrl: newUser.logo_url || undefined
          };
          setUser(user);
          setIsLoading(false);
          console.log('AuthContext: New user created and set', user);
          // Wait a moment to ensure state is updated
          await new Promise(resolve => setTimeout(resolve, 100));
              return;
            }
          }

      // Fallback: use auth session data
      console.log('AuthContext: Using fallback user data from session');
      const user = {
          id: data.user.id,
          email: data.user.email || sanitizedEmail,
          username: data.user.email?.split('@')[0] || 'user',
        role: 'user',
        businessName: data.user.user_metadata?.business_name || data.user.email?.split('@')[0] || 'My Business'
      };
      setUser(user);
      setIsLoading(false);
      // Wait a moment to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.error('AuthContext: Login exception:', error);
      // Re-throw the error so it can be handled by the Login component
      throw error instanceof Error ? error : new Error('Login failed. Please try again.');
    }
  };

  const signup = async (email: string, password: string, username: string, businessName: string) => {
    // Basic validation
    if (!email || !password || !username || !businessName) {
      throw new Error('All fields are required.');
    }

    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedUsername = username.trim();
    const sanitizedBusinessName = businessName.trim();

    // Create user in Supabase Auth
    // IMPORTANT: Supabase uses the Site URL from Dashboard > Authentication > URL Configuration
    // Make sure to set it to your production URL there!
    // 
    // Also set VITE_SITE_URL environment variable in production to ensure correct redirects
    // Use environment variable for production URL, fallback to current origin
    // In production, always prefer VITE_SITE_URL to avoid localhost issues
    const isProduction = import.meta.env.PROD || (!import.meta.env.DEV && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
    const redirectUrl = import.meta.env.VITE_SITE_URL
      ? `${import.meta.env.VITE_SITE_URL}/auth/confirm`
      : isProduction && window.location.origin.includes('localhost')
        ? (() => {
            console.error('⚠️ WARNING: VITE_SITE_URL not set in production! Email confirmation links may not work correctly.');
            console.error('Please set VITE_SITE_URL environment variable to your production URL.');
            return `${window.location.origin}/auth/confirm`;
          })()
        : `${window.location.origin}/auth/confirm`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Signup redirect URL:', redirectUrl);
    }
    
    const { data, error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password: password,
      options: {
        data: {
          username: sanitizedUsername,
          business_name: sanitizedBusinessName
        },
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        throw new Error('Email already registered. Please login instead.');
      }
      throw new Error(error.message || 'Signup failed. Please try again.');
    }

    // Check if email confirmation was sent
    if (data.user && !data.user.email_confirmed_at) {
      // Email confirmation should be sent automatically by Supabase
      // If it wasn't sent, it might be a configuration issue in Supabase dashboard
      console.log('User created. Confirmation email should be sent to:', sanitizedEmail);

      // Verify that user was created (even if unconfirmed)
      if (data.user.id) {
        try {
          // Try to create user record (will be activated after email confirmation)
          await (supabase.from('users') as any).insert([{
            id: data.user.id,
            email: sanitizedEmail,
            username: sanitizedUsername,
            business_name: sanitizedBusinessName,
            role: 'user',
            is_active: false, // Set to false until email is confirmed
            theme_preference: 'light'
          }]).catch((err: any) => {
            // If user already exists or insert fails, that's okay
            // User will be created/updated after email confirmation
            console.log('User record creation skipped (will be created after confirmation):', err.message);
          });
        } catch (insertError) {
          // User will be created after email confirmation
          console.log('User record will be created after email confirmation');
        }
      }
    } else if (data.user && data.user.email_confirmed_at) {
      // Email already confirmed (shouldn't happen on signup, but handle it)
      try {
        await (supabase.from('users') as any).insert([{
          id: data.user.id,
          email: sanitizedEmail,
          username: sanitizedUsername,
          business_name: sanitizedBusinessName,
          role: 'user',
          is_active: true,
          theme_preference: 'light'
        }]);
      } catch {
        // User already exists
      }
    }
  };

  const resendConfirmationEmail = async (email: string) => {
    try {
      // Use environment variable for production URL, fallback to current origin
      const redirectUrl = import.meta.env.VITE_SITE_URL
        ? `${import.meta.env.VITE_SITE_URL}/auth/confirm`
        : `${window.location.origin}/auth/confirm`;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to resend confirmation email');
      }

      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to resend confirmation email');
    }
  };

  const logout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      // Still clear user even if Supabase logout fails
      setUser(null);
    }
  };

  const updateBusinessName = async (newBusinessName: string) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    if (!newBusinessName || newBusinessName.trim().length === 0) {
      throw new Error('Business name cannot be empty');
    }

    const sanitizedBusinessName = newBusinessName.trim();

    // Update in database
    const { error } = await (supabase
      .from('users') as any)
      .update({ business_name: sanitizedBusinessName })
      .eq('id', user.id);

    if (error) {
      throw new Error(error.message || 'Failed to update business name');
    }

    // Update local state
    setUser({
      ...user,
      businessName: sanitizedBusinessName
    });
  };

  const updateLogo = async (logoUrl: string) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    // Update in database
    const { error } = await (supabase
      .from('users') as any)
      .update({ logo_url: logoUrl || null })
      .eq('id', user.id);

    if (error) {
      throw new Error(error.message || 'Failed to update logo');
    }

    // Update local state
    setUser({
      ...user,
      logoUrl: logoUrl || undefined
    });
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    if (!currentPassword || !newPassword) {
      throw new Error('Both current and new passwords are required');
    }

    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    // Verify current password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (verifyError) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update password');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, resendConfirmationEmail, updateBusinessName, updateLogo, changePassword, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
