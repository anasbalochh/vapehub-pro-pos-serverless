import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dynamicProductsApi, fieldConfigApi } from '@/lib/multi-industry-api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

// Custom hook for products with React Query
export const useProducts = (searchTerm: string = '') => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Debounce search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Products query
  const productsQuery = useQuery({
    queryKey: ['products', user?.id, debouncedSearchTerm],
    queryFn: () => dynamicProductsApi.list(user!.id, debouncedSearchTerm),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes for products
    select: (response) => response.data || [],
  });

  // Fields query
  const fieldsQuery = useQuery({
    queryKey: ['fields', user?.id],
    queryFn: () => fieldConfigApi.getUserFields(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes for fields (they don't change often)
    select: (response) => response.data || [],
  });

  // Create product mutation with optimistic update
  const createProductMutation = useMutation({
    mutationFn: (data: any) => dynamicProductsApi.create(user!.id, data),
    onMutate: async (newProduct) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['products', user?.id] });

      // Snapshot previous value
      const previousProducts = queryClient.getQueryData(['products', user?.id]);

      // Optimistically update
      queryClient.setQueryData(['products', user?.id], (old: any) => {
        const newData = { ...newProduct, id: `temp-${Date.now()}` };
        return { data: [...(old?.data || []), newData] };
      });

      return { previousProducts };
    },
    onError: (err, newProduct, context) => {
      // Rollback on error
      if (context?.previousProducts) {
        queryClient.setQueryData(['products', user?.id], context.previousProducts);
      }
      toast.error('Failed to create product');
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['products', user?.id] });
      toast.success('Product created successfully');
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      dynamicProductsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', user?.id] });
      toast.success('Product updated successfully');
    },
    onError: () => {
      toast.error('Failed to update product');
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => dynamicProductsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', user?.id] });
      toast.success('Product deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete product');
    },
  });

  return {
    products: productsQuery.data || [],
    fields: fieldsQuery.data || [],
    isLoading: productsQuery.isLoading || fieldsQuery.isLoading,
    isError: productsQuery.isError || fieldsQuery.isError,
    refetch: () => {
      productsQuery.refetch();
      fieldsQuery.refetch();
    },
    createProduct: createProductMutation.mutate,
    updateProduct: updateProductMutation.mutate,
    deleteProduct: deleteProductMutation.mutate,
    isCreating: createProductMutation.isPending,
    isUpdating: updateProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
  };
};

