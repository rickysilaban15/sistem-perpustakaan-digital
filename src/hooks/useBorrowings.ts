// hooks/useBorrowings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { borrowingsApi, Borrowing } from '../services/api'
import toast from 'react-hot-toast'

export const useBorrowings = () => {
  const queryClient = useQueryClient()

  // Get all borrowings
  const borrowingsQuery = useQuery({
    queryKey: ['borrowings'],
    queryFn: borrowingsApi.getAll,
    staleTime: 1000 * 60 * 5, // Cache selama 5 menit
  })

  // Handle error fetching
  if (borrowingsQuery.error) {
    console.error('Error fetching borrowings:', borrowingsQuery.error)
    toast.error('Gagal memuat data peminjaman')
  }

  // Format data untuk memastikan book ada
  const formattedBorrowings = (borrowingsQuery.data || []).map((borrowing: Borrowing) => ({
    ...borrowing,
    book: borrowing.book || {
      id: borrowing.book_id,
      title: 'Buku Tidak Ditemukan',
      author: 'Tidak Diketahui',
      book_code: 'N/A',
      cover_url: null,
      available_copies: 0,
      total_copies: 0
    }
  }))

  // Create borrowing mutation
  const createMutation = useMutation({
    mutationFn: borrowingsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowings'] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Peminjaman berhasil dicatat')
    },
    onError: (error: any) => {
      console.error('Error creating borrowing:', error)
      toast.error(error.message || 'Gagal mencatat peminjaman')
    }
  })

  // Return book mutation
  const returnMutation = useMutation({
    mutationFn: borrowingsApi.returnBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowings'] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Buku berhasil dikembalikan')
    },
    onError: (error: any) => {
      console.error('Error returning book:', error)
      toast.error(error.message || 'Gagal mengembalikan buku')
    }
  })

  // Delete borrowing mutation
  const deleteMutation = useMutation({
    mutationFn: borrowingsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowings'] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Data peminjaman berhasil dihapus')
    },
    onError: (error: any) => {
      console.error('Error deleting borrowing:', error)
      toast.error(error.message || 'Gagal menghapus data peminjaman')
    }
  })

  return {
    borrowings: formattedBorrowings,
    isLoading: borrowingsQuery.isLoading,
    isError: borrowingsQuery.isError,
    error: borrowingsQuery.error,
    
    // Actions
    createBorrowing: createMutation.mutateAsync,
    returnBook: returnMutation.mutateAsync,
    deleteBorrowing: deleteMutation.mutateAsync,
    
    // Refetch
    refetch: borrowingsQuery.refetch,
    
    // Mutations status
    isCreating: createMutation.isPending,
    isReturning: returnMutation.isPending,
    isDeleting: deleteMutation.isPending
  }
}