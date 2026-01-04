// services/api/borrowingsApi.ts
import { supabase } from './supabase'

export interface Borrowing {
  id: string
  borrower_name: string
  borrower_unit: string
  book_id: string
  borrow_date: string
  due_date: string
  return_date: string | null
  status: 'borrowed' | 'returned' | 'overdue'
  notes: string | null
  created_at: string
  book?: {
    id: string
    title: string
    book_code: string
    available_copies: number
  }
}

export const borrowingsApi = {
  // Get all borrowings with book data
  getAll: async (): Promise<Borrowing[]> => {
    const { data, error } = await supabase
      .from('borrowings')
      .select(`
        *,
        book:books(id, title, book_code, available_copies)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Create new borrowing AND update book stock
  create: async (borrowing: Omit<Borrowing, 'id' | 'created_at' | 'book'>): Promise<Borrowing> => {
    try {
      // 1. Check if book exists and has available copies
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('available_copies')
        .eq('id', borrowing.book_id)
        .single()

      if (bookError) throw bookError
      if (!book) throw new Error('Buku tidak ditemukan')
      if (book.available_copies <= 0) throw new Error('Stok buku habis')

      // 2. Start a transaction (Supabase doesn't have true transactions, so we use RPC or do sequentially)
      // First, update book stock (decrease available_copies)
      const { error: updateError } = await supabase
        .from('books')
        .update({ 
          available_copies: book.available_copies - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', borrowing.book_id)

      if (updateError) throw updateError

      // 3. Create borrowing record
      const { data: borrowingData, error: borrowingError } = await supabase
        .from('borrowings')
        .insert(borrowing)
        .select(`
          *,
          book:books(id, title, book_code, available_copies)
        `)
        .single()

      if (borrowingError) throw borrowingError

      return borrowingData
    } catch (error) {
      console.error('Error creating borrowing:', error)
      throw error
    }
  },

  // Return book AND update book stock
  returnBook: async (id: string): Promise<Borrowing> => {
    try {
      // 1. Get the borrowing record with book info
      const { data: borrowing, error: borrowingError } = await supabase
        .from('borrowings')
        .select(`
          *,
          book:books(id, available_copies)
        `)
        .eq('id', id)
        .single()

      if (borrowingError) throw borrowingError
      if (!borrowing) throw new Error('Data peminjaman tidak ditemukan')

      // 2. Update book stock (increase available_copies)
      if (borrowing.book) {
        const { error: updateError } = await supabase
          .from('books')
          .update({ 
            available_copies: (borrowing.book.available_copies || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', borrowing.book_id)

        if (updateError) throw updateError
      }

      // 3. Update borrowing status
      const { data: updatedBorrowing, error: updateBorrowingError } = await supabase
        .from('borrowings')
        .update({ 
          status: 'returned',
          return_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', id)
        .select(`
          *,
          book:books(id, title, book_code, available_copies)
        `)
        .single()

      if (updateBorrowingError) throw updateBorrowingError

      return updatedBorrowing
    } catch (error) {
      console.error('Error returning book:', error)
      throw error
    }
  },

  // Update borrowing (only for non-stock related updates)
  update: async (id: string, updates: Partial<Borrowing>): Promise<Borrowing> => {
    const { data, error } = await supabase
      .from('borrowings')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        book:books(id, title, book_code, available_copies)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  // Delete borrowing AND restore book stock
  delete: async (id: string): Promise<void> => {
    try {
      // 1. Get the borrowing record
      const { data: borrowing, error: borrowingError } = await supabase
        .from('borrowings')
        .select('book_id, status')
        .eq('id', id)
        .single()

      if (borrowingError) throw borrowingError

      // 2. If book was borrowed and not returned, restore stock
      if (borrowing.status === 'borrowed' && borrowing.book_id) {
        const { data: book, error: bookError } = await supabase
          .from('books')
          .select('available_copies')
          .eq('id', borrowing.book_id)
          .single()

        if (bookError) throw bookError

        if (book) {
          const { error: updateError } = await supabase
            .from('books')
            .update({ 
              available_copies: book.available_copies + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', borrowing.book_id)

          if (updateError) throw updateError
        }
      }

      // 3. Delete the borrowing record
      const { error: deleteError } = await supabase
        .from('borrowings')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
    } catch (error) {
      console.error('Error deleting borrowing:', error)
      throw error
    }
  }
}