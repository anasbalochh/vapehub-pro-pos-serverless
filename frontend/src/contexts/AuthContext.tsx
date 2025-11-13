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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set a maximum timeout to ensure isLoading is always false eventually
  useEffect(() => {
    const maxTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 10000); // 10 second absolute maximum - allows for slower connections

    return () => clearTimeout(maxTimeout);
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkAuth = async () => {
      try {
        // Check localStorage first for faster initial load
        const storedSession = typeof window !== 'undefined'
          ? localStorage.getItem('supabase.auth.token')
          : null;

        // Use a longer timeout to allow for slower connections
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Auth check timeout'));
          }, 10000); // Increased to 10 seconds
        });

        const sessionPromise = supabase.auth.getSession();

        let sessionResult;
        try {
          sessionResult = await Promise.race([
            sessionPromise,
            timeoutPromise
          ]) as any;
        } catch (raceError: any) {
          // Timeout occurred - silently proceed without session
          // Don't log this as it's expected behavior for slow connections
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const { data: { session }, error } = sessionResult;

        if (error || !session?.user) {
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        // Get user details from our users table with shorter timeout
        try {
          const userQueryPromise = supabase
            .from('users')
            .select('id, email, username, role')
            .eq('id', session.user.id)
            .single() as any;

          const userTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('User query timeout')), 5000);
          });

          let userResult;
          try {
            userResult = await Promise.race([
              userQueryPromise,
              userTimeoutPromise
            ]) as any;
          } catch (queryError: any) {
            // Query timed out or failed, use fallback silently
            if (mounted && session.user) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                username: session.user.email?.split('@')[0] || 'user',
                role: 'user'
              });
            }
            if (mounted) {
              setIsLoading(false);
            }
            return;
          }

          const { data: userData } = userResult;
          if (mounted && userData) {
            setUser({
                id: userData.id,
                email: userData.email,
                username: userData.username,
                role: userData.role
            });
          }
        } catch (userError) {
          // If users table query fails, use fallback from session silently
          if (mounted && session.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              username: session.user.email?.split('@')[0] || 'user',
              role: 'user'
            });
          }
        }
      } catch (error: any) {
        // Silently handle errors - don't log timeout as it's expected
        // Only log non-timeout errors in development
        if (error?.message && !error.message.includes('timeout') && import.meta.env.DEV) {
          console.warn('Auth check error:', error.message);
        }
        if (mounted) {
          setIsLoading(false);
        }
      } finally {
        // Always ensure loading is false
        if (mounted) {
          setIsLoading(false);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    // Wrap checkAuth to prevent unhandled promise rejections
    checkAuth().catch((error) => {
      // Silently handle any unhandled errors from checkAuth
      // This prevents console errors from timeout rejections
      if (mounted && error?.message && !error.message.includes('timeout')) {
        // Only log non-timeout errors in development
        if (import.meta.env.DEV) {
          console.warn('Auth check failed:', error.message);
        }
      }
      if (mounted) {
        setIsLoading(false);
      }
    });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

          if (event === 'SIGNED_IN' && session?.user) {
        const { data: userData } = await supabase
              .from('users')
              .select('id, email, username, role')
              .eq('id', session.user.id)
              .single() as any;

        if (userData) {
          setUser({
                id: userData.id,
                email: userData.email,
                username: userData.username,
                role: userData.role
          });
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          }
        });

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
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
      // Use Supabase Auth with timeout handling
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: password
      });

      if (error) {
        // Handle network/timeout errors
        if (error.message.includes('timeout') || error.message.includes('Failed to fetch') || error.message.includes('network')) {
          throw new Error('Connection timeout. Please check your internet connection and try again.');
        }
        // Handle email confirmation error
        if (error.message.includes('Email not confirmed') || error.message.includes('unconfirmed')) {
          throw new Error('Please check your email and click the confirmation link before logging in.');
        }
        // Handle invalid credentials
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password.');
        }
        throw new Error(error.message || 'Login failed. Please try again.');
      }

      if (!data?.user) {
        throw new Error('Login failed. Please try again.');
      }

        // Check if email is confirmed
        if (!data.user.email_confirmed_at) {
          throw new Error('Please confirm your email before logging in. Check your email for the confirmation link.');
        }

        // Get user details from our users table - with fallback
        let userSet = false;
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, username, role')
            .eq('id', data.user.id)
            .single() as any;

          if (userData && !userError) {
            setUser({
                id: userData.id,
                email: userData.email,
                username: userData.username,
                role: userData.role
            });
            userSet = true;
            // Wait a moment to ensure state is updated
            await new Promise(resolve => setTimeout(resolve, 100));
            return;
          }

          // If user doesn't exist, try to create them (might be created by trigger)
          if (userError?.code === 'PGRST116') {
            // Wait a moment for trigger to create user
            await new Promise(resolve => setTimeout(resolve, 500));

            const { data: retryUserData } = await supabase
              .from('users')
              .select('id, email, username, role')
              .eq('id', data.user.id)
              .single() as any;

            if (retryUserData) {
              setUser({
                id: retryUserData.id,
                email: retryUserData.email,
                username: retryUserData.username,
                role: retryUserData.role
              });
              userSet = true;
              // Wait a moment to ensure state is updated
              await new Promise(resolve => setTimeout(resolve, 100));
              return;
            }
          }
        } catch (dbError: any) {
          console.warn('Database query failed, using fallback:', dbError?.message);
        }

        // Fallback: use auth session data if database query fails
        if (!userSet) {
          setUser({
            id: data.user.id,
            email: data.user.email || sanitizedEmail,
            username: data.user.email?.split('@')[0] || 'user',
            role: 'user'
          });
          // Wait a moment to ensure state is updated
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        return;
    } catch (error: any) {
      // Handle timeout errors specifically
      if (error?.message?.includes('timeout') || error?.message?.includes('Failed to fetch')) {
        throw new Error('Connection timeout. Please check your internet connection and try again.');
      }
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
        await (supabase.from('users') as any).insert([{
          id: data.user.id,
          email: sanitizedEmail,
          username: sanitizedUsername,
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
