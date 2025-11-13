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
    let timeoutId: NodeJS.Timeout | null = null;

    const checkAuth = async () => {
      try {
        console.log('Auth: Checking existing session...');

        // Set a timeout to prevent infinite loading (15 seconds - increased for slow connections)
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Auth check timeout - please check your connection'));
          }, 15000);
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
          const errorMsg = raceError?.message || 'Unknown error';
          console.warn('Auth: Session check failed:', errorMsg);
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

        // Get user details from our users table with timeout
        let userData = null;
        try {
          const userDataPromise = supabase
            .from('users')
            .select('id, email, username, role')
            .eq('id', session.user.id)
            .single();

          const userTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('User query timeout')), 3000); // Reduced to 3 seconds
          });

          const userResult = await Promise.race([
            userDataPromise,
            userTimeoutPromise
          ]);

          const { data: dbUser, error: userError } = userResult as any;

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
      console.log('Login: Starting authentication for', sanitizedEmail);

      // Use Supabase Auth with timeout handling
      const authPromise = supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: password
      });

      // Add timeout to auth call (20 seconds - increased for slow connections)
      const authTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Authentication timeout')), 20000);
      });

      let authResult;
      try {
        authResult = await Promise.race([authPromise, authTimeout]);
      } catch (raceErr: any) {
        if (raceErr?.message?.includes('timeout')) {
          throw new Error('Connection timeout. Please check your internet connection and try again.');
        }
        throw raceErr;
      }

      const { data, error } = authResult as any;

      if (error) {
        console.error('Login: Auth error', error);
        // Handle network/timeout errors
        if (error.message?.includes('timeout') || error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
          throw new Error('Connection timeout. Please check your internet connection and try again.');
        }
        // Handle email confirmation error
        if (error.message?.includes('Email not confirmed') || error.message?.includes('unconfirmed')) {
          throw new Error('Please check your email and click the confirmation link before logging in.');
        }
        // Handle invalid credentials
        if (error.message?.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password.');
        }
        throw new Error(error.message || 'Login failed. Please try again.');
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

      // Try to get user from database, but don't wait too long
      let userData = null;
      try {
        const userQuery = supabase
          .from('users')
          .select('id, email, username, role')
          .eq('id', data.user.id)
          .single();

        const queryTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), 5000); // 5 second timeout
        });

        const queryResult = await Promise.race([userQuery, queryTimeout]);
        const { data: dbUser, error: dbError } = queryResult as any;

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
