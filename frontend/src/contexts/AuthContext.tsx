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
  updateBusinessName: (businessName: string) => Promise<void>;
  updateLogo: (logoUrl: string) => Promise<void>;
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
    const { data, error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password: password,
      options: {
        data: {
          username: sanitizedUsername,
          business_name: sanitizedBusinessName
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
        // User will be created after email confirmation
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

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, updateBusinessName, updateLogo, isLoading }}>
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
