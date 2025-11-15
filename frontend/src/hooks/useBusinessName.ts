import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to get the current user's business name
 * Returns a fallback if business name is not set
 */
export function useBusinessName(): string {
  const { user } = useAuth();

  if (!user) {
    return 'My Business'; // Default for unauthenticated users
  }

  return user.businessName || user.username || 'My Business';
}

