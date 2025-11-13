import { supabase } from '@/lib/supabase';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, username: string) => Promise<void>;
  isLoading: boolean;
}

// Create context - using undefined as default is the standard pattern
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        console.log('Auth: Checking existing session...');

        // Simplified - no race condition, let Supabase handle timeouts
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('Auth: Session error:', error.message || error);
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        if (!session?.user) {
          console.log('Auth: No active session found');
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        console.log('Auth: Session found, user ID:', session.user.id);

        // Get user details from our users table - simplified, no race condition
        let userData = null;
        try {
          const { data: dbUser, error: userError } = await supabase
            .from('users')
            .select('id, email, username, role')
            .eq('id', session.user.id)
            .single();

          if (dbUser && !userError) {
            userData = dbUser;
            console.log('Auth: User found in database');
          } else {
            console.warn('Auth: User query returned error:', userError?.code || userError?.message || 'Unknown error');
          }
        } catch (userError: any) {
          // If user table query fails, use fallback
          console.warn('Auth: Failed to fetch user data, using fallback:', userError?.message || 'Unknown error');
        }

        // Always set user - use database data if available, otherwise use fallback
        if (mounted) {
          const finalUser = userData || {
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.email?.split('@')[0] || 'user',
            role: 'user'
          };

          console.log('Auth: Setting user state', { id: finalUser.id, email: finalUser.email });
          setUser(finalUser);
        }
      } catch (error: any) {
        // Handle any other errors
        console.error('Auth: Auth check failed:', error?.message || 'Unknown error', error);
      } finally {
        // Always set loading to false, even on errors
        if (mounted) {
          console.log('Auth: Setting isLoading to false');
          setIsLoading(false);
        }
      }
    };

    checkAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

          if (event === 'SIGNED_IN' && session?.user) {
        console.log('Auth: SIGNED_IN event, user ID:', session.user.id);
        let userData = null;
        try {
          const { data: dbUser, error: userError } = await supabase
                .from('users')
                .select('id, email, username, role')
                .eq('id', session.user.id)
                .single();

          if (dbUser && !userError) {
            userData = dbUser;
            console.log('Auth: User found in database via onAuthStateChange');
          } else {
            console.warn('Auth: User query returned error:', userError?.code || userError?.message || 'Unknown error');
          }
        } catch (err: any) {
          console.warn('Auth: Failed to fetch user data in onAuthStateChange, using fallback:', err?.message || 'Unknown error');
        }

        // Always set user - use database data if available, otherwise use fallback
        const finalUser = userData || {
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.email?.split('@')[0] || 'user',
          role: 'user'
        };

        console.log('Auth: Setting user state via onAuthStateChange', { id: finalUser.id, email: finalUser.email });
        setUser(finalUser);
          } else if (event === 'SIGNED_OUT') {
            console.log('Auth: SIGNED_OUT event');
            setUser(null);
          }
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
      console.log('Login: Starting authentication for', sanitizedEmail);
      console.log('Login: Checking Supabase configuration...');

      // Check if Supabase is properly configured
      const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
      const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

      if (!supabaseUrl || !supabaseKey) {
        const configError = 'Supabase configuration is missing! Please create a .env file in the frontend directory with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the development server.';
        console.error('❌', configError);
        throw new Error(configError);
      }

      console.log('Login: Supabase URL configured:', supabaseUrl.substring(0, 30) + '...');
      console.log('Login: Attempting sign in...');

      // Use Supabase Auth - simplified, no custom timeout handling
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: password
      });

      if (error) {
        console.error('Login: Auth error', error);
        console.error('Login: Error code:', error.status, 'Error message:', error.message);

        // Handle specific Supabase errors
        if (error.message?.includes('Invalid login credentials') || error.status === 400) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }

        // Handle email confirmation error
        if (error.message?.includes('Email not confirmed') || error.message?.includes('unconfirmed')) {
          throw new Error('Please check your email and click the confirmation link before logging in.');
        }

        // Handle network/timeout errors with more detail
        if (error.message?.includes('timeout') || error.message?.includes('Failed to fetch') || error.message?.includes('network') || error.message?.includes('NetworkError')) {
          const networkError = `Connection failed. Please check:\n1. Your Supabase URL and key in .env file\n2. Your internet connection\n3. Restart the development server after updating .env`;
          console.error('❌', networkError);
          throw new Error(networkError);
        }

        // Handle configuration errors
        if (error.message?.includes('configuration') || error.message?.includes('missing')) {
          throw new Error('Supabase configuration error. Please check your .env file and restart the server.');
        }

        // Generic error with actual message
        throw new Error(error.message || `Login failed (Error ${error.status || 'unknown'}). Please try again.`);
      }

      if (!data?.user) {
        console.error('Login: No user data returned');
        throw new Error('Login failed. Please try again.');
      }

      console.log('Login: Auth successful, user ID:', data.user.id);

      // Check if email is confirmed
      if (!data.user.email_confirmed_at) {
        throw new Error('Please confirm your email before logging in. Check your email for the confirmation link.');
      }

      // Try to get user from database - simplified, no race condition
      let userData = null;
      try {
        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .select('id, email, username, role')
          .eq('id', data.user.id)
          .single();

        if (dbUser && !dbError) {
          userData = dbUser;
          console.log('Login: Found user in database');
        }
      } catch (queryErr: any) {
        console.warn('Login: User query failed or timed out, using fallback', queryErr?.message);
      }

      // Set user - use database data if available, otherwise use fallback
      const finalUser = userData || {
        id: data.user.id,
        email: data.user.email || sanitizedEmail,
        username: data.user.email?.split('@')[0] || 'user',
        role: 'user'
      };

      console.log('Login: Setting user', { id: finalUser.id, email: finalUser.email });
      setUser(finalUser);
      console.log('Login: User set successfully, login complete');
      return;
    } catch (error: any) {
      console.error('Login: Error in login function', error);
      console.error('Login: Error type:', error?.name, 'Error message:', error?.message);

      // If it's already a user-friendly error, just rethrow it
      if (error instanceof Error && error.message && !error.message.includes('timeout')) {
        throw error;
      }

      // Handle timeout errors with more context
      if (error?.message?.includes('timeout') || error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        const timeoutError = `Connection failed. Please check:\n1. Your Supabase URL and key in .env file\n2. Your internet connection\n3. Restart the development server after updating .env`;
        console.error('❌', timeoutError);
        throw new Error(timeoutError);
      }

      // Re-throw the error as-is if it's already an Error
      throw error instanceof Error ? error : new Error('Login failed. Please try again.');
    }
  };

  const signup = async (email: string, password: string, username: string) => {
    // Basic validation
    if (!email || !password || !username) {
      throw new Error('All fields are required.');
    }

    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedUsername = username.trim();

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password: password,
      options: {
        data: {
          username: sanitizedUsername
        },
        emailRedirectTo: `${window.location.origin}/auth/confirm`
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error('Email already registered. Please login instead.');
      }
      throw new Error(error.message || 'Signup failed. Please try again.');
    }

    // If user created, try to create user record (will be created after email confirmation)
    if (data.user) {
      try {
        const { error: insertError } = await supabase.from('users').insert([{
          id: data.user.id,
          email: sanitizedEmail,
          username: sanitizedUsername,
          role: 'user',
          is_active: true,
          theme_preference: 'light'
        }] as any);

        if (insertError) {
          // User might already exist or RLS policy prevents insertion
          // This is okay - user will be created after email confirmation or by trigger
          console.warn('Could not create user record during signup (this is normal):', insertError.message);
        }
      } catch (err) {
        // User will be created after email confirmation or by database trigger
        console.warn('User record creation failed during signup (this is normal):', err);
      }
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

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, isLoading }}>
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
