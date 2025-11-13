import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const checkAuth = async () => {
      try {
        // Set a timeout to prevent infinite loading (10 seconds)
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Auth check timeout - please check your connection'));
          }, 10000);
        });

        const sessionPromise = supabase.auth.getSession();
        
        let sessionResult;
        try {
          sessionResult = await Promise.race([
            sessionPromise,
            timeoutPromise
          ]);
        } catch (raceError: any) {
          // Timeout or other error
          if (timeoutId) clearTimeout(timeoutId);
          console.warn('Session check failed:', raceError?.message || 'Unknown error');
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        const { data: { session }, error } = sessionResult as any;

        if (error || !session?.user) {
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        // Get user details from our users table with timeout
        try {
          const userDataPromise = supabase
            .from('users')
            .select('id, email, username, role')
            .eq('id', session.user.id)
            .single();

          const userTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('User query timeout')), 5000);
          });

          const userResult = await Promise.race([
            userDataPromise,
            userTimeoutPromise
          ]);

          const { data: userData } = userResult as any;

          if (mounted && userData) {
            setUser({
              id: userData.id,
              email: userData.email,
              username: userData.username,
              role: userData.role
            });
          }
        } catch (userError: any) {
          // If user table query fails, still set loading to false
          console.warn('Failed to fetch user data:', userError?.message || 'Unknown error');
          // Continue - user might not exist in users table yet
        }
      } catch (error: any) {
        // Handle any other errors
        console.warn('Auth check failed:', error?.message || 'Unknown error');
      } finally {
        // Always set loading to false, even on errors
        if (mounted) {
          setIsLoading(false);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    checkAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

          if (event === 'SIGNED_IN' && session?.user) {
        const { data: userData } = await supabase
              .from('users')
              .select('id, email, username, role')
              .eq('id', session.user.id)
              .single();

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

        // Get user details from our users table with timeout (3 seconds max)
        const getUserData = async (): Promise<any> => {
          let timeoutId: NodeJS.Timeout;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('User query timeout')), 3000);
          });

          const userQueryPromise = supabase
            .from('users')
            .select('id, email, username, role')
            .eq('id', data.user.id)
            .single();

          try {
            const result = await Promise.race([userQueryPromise, timeoutPromise]);
            clearTimeout(timeoutId);
            return result;
          } catch (raceError: any) {
            clearTimeout(timeoutId);
            if (raceError?.message?.includes('timeout')) {
              // If timeout, return error to use fallback
              return { data: null, error: { code: 'TIMEOUT' } };
            }
            // Return the actual error from the query
            return { data: null, error: raceError };
          }
        };

        const { data: userData, error: userError } = await getUserData();

        if (userData && !userError) {
          setUser({
            id: userData.id,
            email: userData.email,
            username: userData.username,
            role: userData.role
          });
          return;
        }

      // If user doesn't exist or query timed out, try once more immediately (no delay)
      if (userError?.code === 'PGRST116' || userError?.code === 'TIMEOUT') {
        // Try again immediately without delay
        const { data: retryUserData, error: retryError } = await supabase
          .from('users')
          .select('id, email, username, role')
          .eq('id', data.user.id)
          .single();

        if (retryUserData && !retryError) {
          setUser({
            id: retryUserData.id,
            email: retryUserData.email,
            username: retryUserData.username,
            role: retryUserData.role
          });
          return;
        }

        // If still not found, use fallback from auth data
        // This allows login to proceed even if users table query fails
        const fallbackUsername = data.user.email?.split('@')[0] || 'user';
        setUser({
          id: data.user.id,
          email: data.user.email || sanitizedEmail,
          username: fallbackUsername,
          role: 'user'
        });
        return;
      }

      throw new Error('User profile not found. Please contact support.');
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
        await supabase.from('users').insert([{
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
