// hooks/useInventory.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi, Inventory } from '../services/api'
import toast from 'react-hot-toast'

export const useInventory = () => {
  const queryClient = useQueryClient()

  // Get all inventory items
  const inventoryQuery = useQuery({
    queryKey: ['inventory'],
    queryFn: inventoryApi.getAll,
  })

  // Handle error fetching
  if (inventoryQuery.error) {
    console.error('Error fetching inventory:', inventoryQuery.error)
    toast.error('Gagal memuat data inventaris')
  }

  // Create inventory item mutation
  const createMutation = useMutation({
    mutationFn: (item: Omit<Inventory, 'id' | 'created_at' | 'updated_at' | 'image_url'>) =>
      inventoryApi.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Item berhasil ditambahkan')
    },
    onError: (error: any) => {
      console.error('Error creating inventory:', error)
      toast.error(`Gagal menambahkan item: ${error.message}`)
    },
  })

  // Create inventory with image mutation
  const createWithImageMutation = useMutation({
    mutationFn: (params: { 
      item: Omit<Inventory, 'id' | 'created_at' | 'updated_at' | 'image_url'>,
      imageFile?: File 
    }) => inventoryApi.createWithImage(params.item, params.imageFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Item berhasil ditambahkan')
    },
    onError: (error: any) => {
      console.error('Error creating inventory with image:', error)
      toast.error(`Gagal menambahkan item: ${error.message}`)
    },
  })

  // Update inventory item mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Inventory> }) =>
      inventoryApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Item berhasil diperbarui')
    },
    onError: (error: any) => {
      console.error('Error updating inventory:', error)
      toast.error(`Gagal memperbarui item: ${error.message}`)
    },
  })

  // Update inventory with image mutation
  const updateWithImageMutation = useMutation({
    mutationFn: (params: { 
      id: string; 
      updates: Partial<Inventory>;
      imageFile?: File 
    }) => inventoryApi.updateWithImage(params.id, params.updates, params.imageFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Item berhasil diperbarui')
    },
    onError: (error: any) => {
      console.error('Error updating inventory with image:', error)
      toast.error(`Gagal memperbarui item: ${error.message}`)
    },
  })

  // Delete inventory item mutation
  const deleteMutation = useMutation({
    mutationFn: inventoryApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Item berhasil dihapus')
    },
    onError: (error: any) => {
      console.error('Error deleting inventory:', error)
      toast.error(`Gagal menghapus item: ${error.message}`)
    },
  })

  // Delete inventory image mutation - Hapus jika tidak ada fungsi deleteImage di API
  // const deleteImageMutation = useMutation({
  //   mutationFn: (imageUrl: string) => inventoryApi.deleteImage(imageUrl),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['inventory'] })
  //     toast.success('Gambar berhasil dihapus')
  //   },
  //   onError: (error: any) => {
  //     console.error('Error deleting inventory image:', error)
  //     toast.error(`Gagal menghapus gambar: ${error.message}`)
  //   },
  // })

  return {
    // Data
    inventory: inventoryQuery.data || [],
    isLoading: inventoryQuery.isLoading,
    error: inventoryQuery.error,
    
    // Actions
    createInventory: createMutation.mutate,
    createInventoryWithImage: createWithImageMutation.mutateAsync,
    updateInventory: updateMutation.mutate,
    updateInventoryWithImage: updateWithImageMutation.mutateAsync,
    deleteInventory: deleteMutation.mutateAsync,
    // deleteInventoryImage: deleteImageMutation.mutateAsync, // Hapus jika tidak ada
    
    // Refetch
    refetch: inventoryQuery.refetch,
    
    // Loading states
    isCreating: createMutation.isPending,
    isCreatingWithImage: createWithImageMutation.isPending,
    isUpdating: updateMutation.isPending,
    isUpdatingWithImage: updateWithImageMutation.isPending,
    isDeleting: deleteMutation.isPending,
    // isDeletingImage: deleteImageMutation.isPending, // Hapus jika tidak ada
  }
}