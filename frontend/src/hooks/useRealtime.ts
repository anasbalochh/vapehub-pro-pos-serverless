import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to set up real-time subscriptions for orders, order_items, and products
 * Automatically invalidates React Query cache when data changes
 */
export const useRealtime = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up real-time subscriptions for user:', user.id);

    // Subscribe to orders changes
    const ordersChannel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Orders real-time update:', payload);
          // Invalidate all order-related queries
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['reports'] });
          queryClient.invalidateQueries({ queryKey: ['summary'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }
      )
      .subscribe();

    // Subscribe to order_items changes
    const orderItemsChannel = supabase
      .channel('order-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
        },
        async (payload) => {
          console.log('Order items real-time update:', payload);
          // Get the order_id from the payload to invalidate specific order
          const orderId = payload.new?.order_id || payload.old?.order_id;
          if (orderId) {
            // Invalidate order-specific queries
            queryClient.invalidateQueries({ queryKey: ['order', orderId] });
          }
          // Invalidate all order-related queries
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['reports'] });
          queryClient.invalidateQueries({ queryKey: ['summary'] });
        }
      )
      .subscribe();

    // Subscribe to products changes
    const productsChannel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Products real-time update:', payload);
          // Invalidate all product-related queries
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['stock'] });
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      console.log('Cleaning up real-time subscriptions');
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(orderItemsChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [user?.id, queryClient]);
};

