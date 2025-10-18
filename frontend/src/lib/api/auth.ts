import { db, supabase } from '../supabase';

// Helper function to get current user - only uses Supabase Auth
async function getCurrentUser() {
  // Get user from Supabase Auth session
  const { data: { session }, error } = await supabase.auth.getSession();

  if (!session || !session.user) {
    throw new Error('User not authenticated');
  }

  // Get user details from our users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, username, role')
    .eq('id', session.user.id)
    .single();

  if (userError || !userData) {
    throw new Error('User not found in database');
  }

  return userData;
}

// Auth API
export const authApi = {
  async signup(data: { username: string; password: string }) {
    try {
      // Check if user already exists
      const existingUser = await db.getUserByUsername(data.username);
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Create user with hashed password
      const userData = {
        username: data.username,
        password: data.password, // Will be hashed by Supabase
        role: 'user',
        is_active: true
      };

      const user = await db.createUser(userData);

      // Generate a simple token
      const token = btoa(JSON.stringify({ userId: user.id, username: user.username }));

      return {
        data: {
          message: 'User created successfully',
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        }
      };
    } catch (error: any) {
      throw { response: { data: { message: error.message } } };
    }
  },

  async login(data: { username: string; password: string }) {
    try {
      const user = await db.getUserByUsername(data.username);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password from database
      if (user.password !== data.password) {
        throw new Error('Invalid credentials');
      }

      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      // Generate a simple token
      const token = btoa(JSON.stringify({ userId: user.id, username: user.username }));

      return {
        data: {
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        }
      };
    } catch (error: any) {
      throw { response: { data: { message: error.message } } };
    }
  },

  async verify() {
    try {
      const user = await getCurrentUser();
      const dbUser = await db.getUserById(user.id);

      return {
        data: {
          user: {
            id: dbUser.id,
            username: dbUser.username,
            role: dbUser.role
          }
        }
      };
    } catch (error: any) {
      throw { response: { data: { message: 'User not found or inactive' } } };
    }
  }
};

export { getCurrentUser };
