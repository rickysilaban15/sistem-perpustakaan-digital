// hooks/useBooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { booksApi, storageApi, Book } from '../services/api'
import toast from 'react-hot-toast'
import { supabase } from '../services/supabase'
import { useEffect } from 'react'

export const useBooks = () => {
  const queryClient = useQueryClient()

  // SUBSCRIBE TO REALTIME UPDATES
  useEffect(() => {
    console.log('📡 Subscribing to books realtime updates...');
    
    const channel = supabase
      .channel('books-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'books'
        },
        (payload) => {
          console.log('📢 Books table changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['books'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'borrowings'
        },
        () => {
          console.log('📢 Borrowings changed, refetching books...');
          queryClient.invalidateQueries({ queryKey: ['books'] });
        }
      )
      .subscribe()

    return () => {
      console.log('📡 Unsubscribing from books realtime updates');
      channel.unsubscribe();
    }
  }, [queryClient])

  // Get all books WITH CACHE CONFIGURATION
  const booksQuery = useQuery({
    queryKey: ['books'],
    queryFn: booksApi.getAll,
    refetchOnWindowFocus: true,
    staleTime: 10000, // Data dianggap stale setelah 10 detik
  })

  // Create book mutation
  const createBook = useMutation({
    mutationFn: booksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Buku berhasil ditambahkan')
    },
    onError: (error: Error) => {
      toast.error(`Gagal menambahkan buku: ${error.message}`)
    },
  })

  // Update book mutation
  const updateBook = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Book> }) =>
      booksApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Buku berhasil diperbarui')
    },
    onError: (error: Error) => {
      toast.error(`Gagal memperbarui buku: ${error.message}`)
    },
  })

   const deleteBook = useMutation({
    mutationFn: booksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['borrowings'] })
      toast.success('Buku berhasil dihapus')
    },
    onError: (error: Error) => {
      console.error('Delete book error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Custom error messages
      if (error.message.includes('peminjaman aktif')) {
        toast.error(error.message);
      } else if (error.message.includes('foreign key constraint')) {
        toast.error('Buku tidak dapat dihapus karena masih terkait dengan data peminjaman');
      } else if (error.message.includes('tidak ditemukan')) {
        toast.error('Buku tidak ditemukan');
      } else {
        toast.error(`Gagal menghapus buku: ${error.message}`);
      }
    },
  })
  
  // Create book with cover mutation
  const createBookWithCover = useMutation({
    mutationFn: async ({ book, coverFile }: { book: any; coverFile?: File }) => {
      if (coverFile) {
        return await booksApi.createWithCover(book, coverFile)
      } else {
        return await booksApi.create(book)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Buku berhasil ditambahkan')
    },
    onError: (error: Error) => {
      toast.error(`Gagal menambahkan buku: ${error.message}`)
    },
  })

  // Update book with cover mutation
  const updateBookWithCover = useMutation({
    mutationFn: async ({ id, updates, coverFile }: { id: string; updates: Partial<any>; coverFile?: File }) => {
      if (coverFile) {
        return await booksApi.updateWithCover(id, updates, coverFile)
      } else {
        return await booksApi.update(id, updates)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Buku berhasil diperbarui')
    },
    onError: (error: Error) => {
      toast.error(`Gagal memperbarui buku: ${error.message}`)
    },
  })

  // Delete book cover mutation
  const deleteBookCover = useMutation({
    mutationFn: async (coverUrl: string) => {
      await storageApi.deleteImage(coverUrl)
    },
    onSuccess: () => {
      toast.success('Cover buku berhasil dihapus')
    },
    onError: (error: Error) => {
      toast.error(`Gagal menghapus cover: ${error.message}`)
    },
  })

  return {
    books: booksQuery.data || [],
    isLoading: booksQuery.isLoading,
    error: booksQuery.error,
    createBook: createBook.mutate,
    updateBook: updateBook.mutate,
    deleteBook: deleteBook.mutate,
    createBookWithCover: createBookWithCover.mutate,
    updateBookWithCover: updateBookWithCover.mutate,
    deleteBookCover: deleteBookCover.mutate,
    refetch: booksQuery.refetch,
  }
}