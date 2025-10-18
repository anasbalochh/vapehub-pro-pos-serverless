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
          console.log('Found existing session:', session.user.id);

          // Get user details from our users table using the Supabase user ID
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, username, role')
            .eq('id', session.user.id)
            .single();

          if (userData && !userError) {
            console.log('User data loaded:', userData);
            const user = {
              id: userData.id,
              email: userData.email,
              username: userData.username,
              role: userData.role
            };
            setUser(user);
          } else {
            console.error('Error loading user data:', userError);
            // If user doesn't exist in our users table, create them
            if (userError?.code === 'PGRST116') {
              console.log('User not found in users table, creating user record...');
              try {
                const { data: newUserData, error: createError } = await supabase
                  .from('users')
                  .insert([{
                    id: session.user.id,
                    email: session.user.email || '',
                    username: session.user.email?.split('@')[0] || 'user',
                    password: '', // Will be updated on next login
                    role: 'user',
                    is_active: true,
                    theme_preference: 'light'
                  }])
                  .select()
                  .single();

                if (newUserData && !createError) {
                  console.log('User record created:', newUserData);
                  const user = {
                    id: newUserData.id,
                    email: newUserData.email,
                    username: newUserData.username,
                    role: newUserData.role
                  };
                  setUser(user);
                }
              } catch (createError) {
                console.error('Error creating user record:', createError);
              }
            }
          }
        } else {
          console.log('No existing session found');
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsLoading(false);

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.id);

          if (event === 'SIGNED_IN' && session?.user) {
            // Get user details from our users table
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, email, username, role')
              .eq('id', session.user.id)
              .single();

            if (userData && !userError) {
              console.log('User signed in:', userData);
              const user = {
                id: userData.id,
                email: userData.email,
                username: userData.username,
                role: userData.role
              };
              setUser(user);
            } else {
              console.error('Error loading user data after sign in:', userError);
              // If user doesn't exist in our users table, create them
              if (userError?.code === 'PGRST116') {
                console.log('User not found in users table, creating user record...');
                try {
                  const { data: newUserData, error: createError } = await supabase
                    .from('users')
                    .insert([{
                      id: session.user.id,
                      email: session.user.email || '',
                      username: session.user.email?.split('@')[0] || 'user',
                      password: '', // Will be updated on next login
                      role: 'user',
                      is_active: true,
                      theme_preference: 'light'
                    }])
                    .select()
                    .single();

                  if (newUserData && !createError) {
                    console.log('User record created:', newUserData);
                    const user = {
                      id: newUserData.id,
                      email: newUserData.email,
                      username: newUserData.username,
                      role: newUserData.role
                    };
                    setUser(user);
                  }
                } catch (createError) {
                  console.error('Error creating user record:', createError);
                }
              }
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('User signed out');
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
      console.log('Attempting login for:', email);

      // Use Supabase Auth with proper email format
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        console.error('Login error:', error);
        // Handle email confirmation error specifically
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before logging in.');
        }
        // Handle invalid credentials
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials.');
        }
        // Handle unconfirmed email
        if (error.message.includes('unconfirmed')) {
          throw new Error('Please check your email and click the confirmation link before logging in.');
        }
        throw error;
      }

      if (data.user) {
        console.log('Login successful for user:', data.user.id);

        // Get user details from our users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, username, role')
          .eq('id', data.user.id)
          .single();

        if (userData && !userError) {
          console.log('User data loaded:', userData);
          const user = {
            id: userData.id,
            email: userData.email,
            username: userData.username,
            role: userData.role
          };

          setUser(user);
        } else {
          console.error('Error loading user data:', userError);
          // If user doesn't exist in our users table, create them quickly
          if (userError?.code === 'PGRST116') {
            console.log('Creating user record...');
            try {
              const { data: newUserData, error: createError } = await supabase
                .from('users')
                .insert([{
                  id: data.user.id,
                  email: data.user.email || email,
                  username: data.user.email?.split('@')[0] || email.split('@')[0],
                  password: password,
                  role: 'user',
                  is_active: true,
                  theme_preference: 'light'
                }])
                .select()
                .single();

              if (newUserData && !createError) {
                console.log('User record created:', newUserData);
                const user = {
                  id: newUserData.id,
                  email: newUserData.email,
                  username: newUserData.username,
                  role: newUserData.role
                };
                setUser(user);
              } else {
                console.error('Error creating user record:', createError);
                throw new Error('Failed to create user profile. Please try again.');
              }
            } catch (createError) {
              console.error('Error creating user record:', createError);
              throw new Error('Failed to create user profile. Please try again.');
            }
          } else {
            throw new Error('User data not found. Please contact support.');
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, username: string) => {
    try {
      console.log('Starting signup for:', email);

      // Use Supabase Auth to create user with proper email
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
      });

      if (error) {
        // Handle rate limiting error specifically
        if (error.message.includes('50 seconds')) {
          throw new Error('Too many signup attempts. Please wait 50 seconds before trying again.');
        }
        throw error;
      }

      if (data.user) {
        console.log('Supabase user created:', data.user.id);

        // Create user record in our users table immediately
        const { data: newUserData, error: userError } = await supabase
          .from('users')
          .insert([{
            id: data.user.id,
            email: email,
            username: username,
            password: password,
            role: 'user',
            is_active: true,
            theme_preference: 'light'
          }])
          .select()
          .single();

        if (userError) {
          console.error('Error creating user record:', userError);
          throw new Error('Failed to create user profile. Please try again.');
        }

        console.log('User record created successfully:', newUserData);

        // Check if email confirmation is required
        if (data.user.email_confirmed_at === null) {
          console.log('Email confirmation required - user needs to confirm email');
          // Don't set user - user needs to confirm email first
          throw new Error('Signup successful! Please check your email and click the confirmation link to complete your registration. You can then login.');
        }

        // This should not happen in normal flow with email confirmation enabled
        console.log('Email already confirmed - this should not happen');
        throw new Error('Unexpected error. Please check your email for confirmation link.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
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
