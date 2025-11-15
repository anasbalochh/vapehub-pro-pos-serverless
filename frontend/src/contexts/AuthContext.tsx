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
      console.log('AuthContext: Starting login for', sanitizedEmail);
      
      // First, test Supabase connection quickly
      try {
        const { error: healthError } = await Promise.race([
          supabase.from('users').select('id').limit(0),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection test timeout')), 5000))
        ]) as any;
        
        if (healthError && !healthError.message?.includes('JWT')) {
          console.warn('AuthContext: Supabase connection test warning:', healthError.message);
        }
      } catch (healthTestError: any) {
        console.warn('AuthContext: Supabase connection test failed:', healthTestError?.message);
        // Continue anyway - might be a permissions issue, not a connection issue
      }
      
      // Use Supabase Auth with a reasonable timeout
      // Increase timeout to 30 seconds to allow for slower connections
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Login request timed out after 30 seconds. The server may be slow or unreachable. Please try again.'));
        }, 30000); // 30 second timeout
      });

      console.log('AuthContext: Calling Supabase signInWithPassword...');
      const startTime = Date.now();
      
      // Start the Supabase auth call
      const signInPromise = supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: password
      }).then((result) => {
        const duration = Date.now() - startTime;
        console.log(`AuthContext: Supabase signInWithPassword completed in ${duration}ms`);
        // Clear timeout if successful
        if (timeoutId) clearTimeout(timeoutId);
        return result;
      }).catch((err) => {
        const duration = Date.now() - startTime;
        console.error(`AuthContext: Supabase signInWithPassword failed after ${duration}ms:`, err);
        // Clear timeout on error
        if (timeoutId) clearTimeout(timeoutId);
        throw err;
      });

      // Race between sign in and timeout
      let result: any;
      try {
        result = await Promise.race([
          signInPromise,
          timeoutPromise
        ]);
      } catch (raceError: any) {
        // If it's our timeout error, throw it
        if (raceError?.message?.includes('timed out')) {
          console.error('AuthContext: Login timeout error');
          throw raceError;
        }
        // Otherwise, it's a Supabase error - log and rethrow it
        console.error('AuthContext: Supabase error during login:', raceError);
        throw raceError;
      }

      const { data, error } = result;

      if (error) {
        console.error('AuthContext: Supabase login error:', error);
        // Handle network/timeout errors
        if (error.message?.includes('timeout') || error.message?.includes('Failed to fetch') || error.message?.includes('network') || error.message?.includes('NetworkError')) {
          throw new Error('Connection timeout. Please check your internet connection and try again.');
        }
        // Handle email confirmation error
        if (error.message?.includes('Email not confirmed') || error.message?.includes('unconfirmed')) {
          throw new Error('Please check your email and click the confirmation link before logging in.');
        }
        // Handle invalid credentials
        if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials')) {
          throw new Error('Invalid email or password.');
        }
        // Handle rate limiting
        if (error.message?.includes('rate limit') || error.status === 429) {
          throw new Error('Too many login attempts. Please wait a moment and try again.');
        }
        throw new Error(error.message || 'Login failed. Please try again.');
      }

      if (!data?.user) {
        console.error('AuthContext: No user data returned from Supabase');
        throw new Error('Login failed. Please try again.');
      }

      console.log('AuthContext: User authenticated, email confirmed:', !!data.user.email_confirmed_at);

        // Check if email is confirmed
        if (!data.user.email_confirmed_at) {
          throw new Error('Please confirm your email before logging in. Check your email for the confirmation link.');
        }

        // Get user details from our users table - with fallback and timeout
        let userSet = false;
        try {
          console.log('AuthContext: Fetching user data from database for user ID:', data.user.id);
          
          // Add timeout for database query (10 seconds - more reasonable)
          let dbTimeoutId: NodeJS.Timeout;
          const dbTimeout = new Promise<never>((_, reject) => {
            dbTimeoutId = setTimeout(() => {
              reject(new Error('Database query timeout'));
            }, 10000);
          });

          const userQueryPromise = (async () => {
            try {
              const result = await supabase
                .from('users')
                .select('id, email, username, role')
                .eq('id', data.user.id)
                .single();
              if (dbTimeoutId) clearTimeout(dbTimeoutId);
              return result;
            } catch (err) {
              if (dbTimeoutId) clearTimeout(dbTimeoutId);
              throw err;
            }
          })();

          const result = await Promise.race([
            userQueryPromise,
            dbTimeout
          ]) as any;

          const { data: userData, error: userError } = result;

          if (userData && !userError) {
            setUser({
                id: userData.id,
                email: userData.email,
                username: userData.username,
                role: userData.role
            });
            userSet = true;
            return;
          }

          // If user doesn't exist, try to create them (might be created by trigger)
          if (userError?.code === 'PGRST116') {
            // Wait a moment for trigger to create user
            await new Promise(resolve => setTimeout(resolve, 500));

            const retryTimeout = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Retry timeout')), 5000);
            });

            const retryQueryPromise = supabase
              .from('users')
              .select('id, email, username, role')
              .eq('id', data.user.id)
              .single() as any;

            const { data: retryUserData } = await Promise.race([
              retryQueryPromise,
              retryTimeout
            ]) as any;

            if (retryUserData) {
              setUser({
                id: retryUserData.id,
                email: retryUserData.email,
                username: retryUserData.username,
                role: retryUserData.role
              });
              userSet = true;
              return;
            }
          }
        } catch (dbError: any) {
          console.warn('Database query failed, using fallback:', dbError?.message);
          // Continue to fallback
        }

        // Fallback: use auth session data if database query fails
        if (!userSet) {
        setUser({
          id: data.user.id,
          email: data.user.email || sanitizedEmail,
          username: data.user.email?.split('@')[0] || 'user',
          role: 'user'
        });
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
