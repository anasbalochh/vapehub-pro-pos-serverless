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
    const checkAuth = async () => {
      try {
        // Check if we have a valid session in Supabase
        const { data: { session }, error } = await supabase.auth.getSession();

        if (session && session.user) {
          // Get user details from our users table using the Supabase user ID
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, username, role')
            .eq('id', session.user.id)
            .single();

          if (userData && !userError) {
            const user = {
              id: userData.id,
              email: userData.email,
              username: userData.username,
              role: userData.role
            };
            setUser(user);
          } else {
            // If user doesn't exist in our users table, create them
            if (userError?.code === 'PGRST116') {
              try {
                const { data: newUserData, error: createError } = await supabase
                  .from('users')
                  .insert([{
                    id: session.user.id,
                    email: session.user.email || '',
                    username: session.user.email?.split('@')[0] || 'user',
                    role: 'user',
                    is_active: true,
                    theme_preference: 'light'
                  }])
                  .select()
                  .single();

                if (newUserData && !createError) {
                  const user = {
                    id: newUserData.id,
                    email: newUserData.email,
                    username: newUserData.username,
                    role: newUserData.role
                  };
                  setUser(user);
                }
              } catch (createError) {
                // Silently handle error - user will need to sign up properly
              }
            }
          }
        }
      } catch (error) {
        // Silently handle auth check errors
      } finally {
        setIsLoading(false);

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            // Get user details from our users table
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, email, username, role')
              .eq('id', session.user.id)
              .single();

            if (userData && !userError) {
              const user = {
                id: userData.id,
                email: userData.email,
                username: userData.username,
                role: userData.role
              };
              setUser(user);
            } else {
              // If user doesn't exist in our users table, create them
              if (userError?.code === 'PGRST116') {
                try {
                  const { data: newUserData, error: createError } = await supabase
                    .from('users')
                    .insert([{
                      id: session.user.id,
                      email: session.user.email || '',
                      username: session.user.email?.split('@')[0] || 'user',
                      role: 'user',
                      is_active: true,
                      theme_preference: 'light'
                    }])
                    .select()
                    .single();

                  if (newUserData && !createError) {
                    const user = {
                      id: newUserData.id,
                      email: newUserData.email,
                      username: newUserData.username,
                      role: newUserData.role
                    };
                    setUser(user);
                  }
                } catch (createError) {
                  // Silently handle error
                }
              }
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          }
        });

        return () => subscription.unsubscribe();
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Validate input
      if (!email || !password) {
        throw new Error('Email and password are required.');
      }

      // Sanitize email
      const sanitizedEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        throw new Error('Invalid email format.');
      }

      // Use Supabase Auth with proper email format
      // If configuration is missing, the proxy will throw an error
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: password
      });

      if (error) {
        // Handle configuration errors
        if (error.message.includes('configuration is missing') || error.message.includes('Supabase configuration')) {
          throw new Error('Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file and restart the server.');
        }
        // Handle email confirmation error specifically
        if (error.message.includes('Email not confirmed') || error.message.includes('unconfirmed')) {
          throw new Error('Please check your email and click the confirmation link before logging in.');
        }
        // Handle invalid credentials - generic message for security
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password.');
        }
        throw new Error('Login failed. Please try again.');
      }

      if (data.user) {
        // Check if email is confirmed
        if (!data.user.email_confirmed_at) {
          throw new Error('Please confirm your email before logging in. Check your email for the confirmation link.');
        }

        // Get user details from our users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, username, role')
          .eq('id', data.user.id)
          .single();

        if (userData && !userError) {
          const user = {
            id: userData.id,
            email: userData.email,
            username: userData.username,
            role: userData.role
          };

          setUser(user);
        } else {
          // If user doesn't exist in our users table, create them
          // Now that email is confirmed, RLS should allow this
          if (userError?.code === 'PGRST116') {
            try {
              const { data: newUserData, error: createError } = await supabase
                .from('users')
                .insert([{
                  id: data.user.id,
                  email: data.user.email || sanitizedEmail,
                  username: data.user.email?.split('@')[0] || sanitizedEmail.split('@')[0],
                  role: 'user',
                  is_active: true,
                  theme_preference: 'light'
                }])
                .select()
                .single();

              if (newUserData && !createError) {
                const user = {
                  id: newUserData.id,
                  email: newUserData.email,
                  username: newUserData.username,
                  role: newUserData.role
                };
                setUser(user);
              } else if (createError) {
                // If creation fails, try to get user again (might have been created by trigger)
                const { data: retryUserData } = await supabase
                  .from('users')
                  .select('id, email, username, role')
                  .eq('id', data.user.id)
                  .single();

                if (retryUserData) {
                  const user = {
                    id: retryUserData.id,
                    email: retryUserData.email,
                    username: retryUserData.username,
                    role: retryUserData.role
                  };
                  setUser(user);
                } else {
                  throw new Error('Failed to create user profile. Please try logging in again.');
                }
              }
            } catch (createError: any) {
              // Try one more time to get user
              const { data: retryUserData } = await supabase
                .from('users')
                .select('id, email, username, role')
                .eq('id', data.user.id)
                .single();

              if (retryUserData) {
                const user = {
                  id: retryUserData.id,
                  email: retryUserData.email,
                  username: retryUserData.username,
                  role: retryUserData.role
                };
                setUser(user);
              } else {
                throw new Error('Failed to create user profile. Please contact support.');
              }
            }
          } else {
            throw new Error('User data not found. Please contact support.');
          }
        }
      }
    } catch (error: any) {
      // Don't expose internal error details
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
