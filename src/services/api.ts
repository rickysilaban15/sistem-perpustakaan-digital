import { supabase } from './supabase'

// STORAGE API
export const storageApi = {
  // Upload book cover
  uploadBookCover: async (file: File, bookId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${bookId}-${Date.now()}.${fileExt}`
    const filePath = `book-covers/${fileName}`

const { data: _data, error } = await supabase.storage
      .from('book-covers')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('book-covers')
      .getPublicUrl(filePath)

    return publicUrl
  },

  // Upload inventory image
  uploadInventoryImage: async (file: File, itemId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${itemId}-${Date.now()}.${fileExt}`
    const filePath = `inventory-images/${fileName}`

const { data: _data2, error: error2 } = await supabase.storage
      .from('inventory-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('inventory-images')
      .getPublicUrl(filePath)

    return publicUrl
  },

  // Delete image
  deleteImage: async (url: string): Promise<void> => {
    // Extract file path from URL
    const urlParts = url.split('/')
    const bucket = urlParts[3]
    const filePath = urlParts.slice(4).join('/')

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])

    if (error) throw error
  },

  // Get image URL
  getImageUrl: (path: string, bucket: string = 'book-covers'): string => {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return publicUrl
  }
}

// Types berdasarkan database schema
export interface Book {
  id: string
  book_code: string
  title: string
  author: string
  publisher: string | null
  publication_year: number | null
  category: string | null
  total_copies: number
  available_copies: number
  shelf_location: string | null
  description: string | null
  cover_url: string | null
  created_at: string
  updated_at: string
}

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
  book?: Book | null
}

export interface Inventory {
  id: string
  item_name: string
  category: string
  condition: 'baik' | 'rusak_ringan' | 'rusak_berat' | 'hilang'
  quantity: number
  location: string | null
  notes: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

// BOOKS API - PERBAIKI DUPLICATE FUNCTION
export const booksApi = {
  // Get all books
  getAll: async (): Promise<Book[]> => {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  create: async (book: Omit<Book, 'id' | 'created_at' | 'updated_at' | 'available_copies' | 'cover_url'>): Promise<Book> => {
    const { data, error } = await supabase
      .from('books')
      .insert({
        ...book,
        available_copies: book.total_copies,
        cover_url: null
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // TAMBAHKAN fungsi khusus untuk update stock
  updateStock: async (bookId: string, change: number): Promise<Book> => {
    const { data: currentBook, error: fetchError } = await supabase
      .from('books')
      .select('available_copies')
      .eq('id', bookId)
      .single()
    
    if (fetchError) throw fetchError
    
    const newAvailable = Math.max(0, (currentBook.available_copies || 0) + change)
    
    const { data, error } = await supabase
      .from('books')
      .update({ 
        available_copies: newAvailable,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Create book with cover
  createWithCover: async (book: Omit<Book, 'id' | 'created_at' | 'updated_at' | 'available_copies' | 'cover_url'>, coverFile?: File): Promise<Book> => {
    let coverUrl: string | null = null
    
    // First create the book to get ID
    const { data: bookData, error: createError } = await supabase
      .from('books')
      .insert({
        ...book,
        available_copies: book.total_copies,
        cover_url: null
      })
      .select()
      .single()
    
    if (createError) throw createError

    // Upload cover if provided
    if (coverFile && bookData.id) {
      coverUrl = await storageApi.uploadBookCover(coverFile, bookData.id)
      
      // Update book with cover URL
      const { data: updatedBook, error: updateError } = await supabase
        .from('books')
        .update({ cover_url: coverUrl })
        .eq('id', bookData.id)
        .select()
        .single()
      
      if (updateError) throw updateError
      return updatedBook
    }

    return bookData
  },

  // Update book - HAPUS SATU VERSI UPDATE YANG DUPLICATE
  update: async (id: string, updates: Partial<Book>): Promise<Book> => {
    // Jika mengupdate total_copies, adjust available_copies juga
    if (updates.total_copies !== undefined) {
      // Get current book data
      const { data: currentBook } = await supabase
        .from('books')
        .select('available_copies, total_copies')
        .eq('id', id)
        .single()
      
      if (currentBook) {
        // Calculate new available_copies
        const diff = updates.total_copies - currentBook.total_copies
        updates.available_copies = Math.max(0, currentBook.available_copies + diff)
      }
    }
    
    const { data, error } = await supabase
      .from('books')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update book with cover
  updateWithCover: async (id: string, updates: Partial<Book>, coverFile?: File): Promise<Book> => {
    let coverUrl = updates.cover_url
    
    // Upload new cover if provided
    if (coverFile) {
      coverUrl = await storageApi.uploadBookCover(coverFile, id)
    }

    const { data, error } = await supabase
      .from('books')
      .update({ ...updates, cover_url: coverUrl })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  delete: async (id: string): Promise<void> => {
    console.log('🗑️ Deleting book:', id);
    
    try {
      // 1. Cek apakah buku ada
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('id, title, cover_url, available_copies, total_copies')
        .eq('id', id)
        .single()
      
      if (bookError) {
        if (bookError.code === 'PGRST116') {
          throw new Error('Buku tidak ditemukan');
        }
        throw bookError;
      }
      
      if (!book) {
        throw new Error('Buku tidak ditemukan');
      }
      
      console.log('📖 Book found:', book.title, 'Available:', book.available_copies, 'Total:', book.total_copies);
      
      // 2. Cek peminjaman aktif (jika available_copies tidak sama dengan total_copies)
      if (book.available_copies !== book.total_copies) {
        const borrowedCount = book.total_copies - book.available_copies;
        throw new Error(`Buku memiliki ${borrowedCount} peminjaman aktif dan tidak dapat dihapus`);
      }
      
      // 3. Hapus cover image jika ada
      if (book.cover_url) {
        try {
          console.log('🖼️ Deleting cover image:', book.cover_url);
          await storageApi.deleteImage(book.cover_url);
          console.log('✅ Cover image deleted');
        } catch (imageError) {
          console.warn('⚠️ Could not delete cover image:', imageError);
          // Continue even if image deletion fails
        }
      }
      
      // 4. Hapus data peminjaman yang terkait (history)
      console.log('🗂️ Deleting borrowing history...');
      const { error: deleteBorrowingsError } = await supabase
        .from('borrowings')
        .delete()
        .eq('book_id', id)
      
      if (deleteBorrowingsError) {
        console.error('❌ Error deleting borrowings:', deleteBorrowingsError);
        // Jika ada foreign key constraint error, beri pesan yang jelas
        if (deleteBorrowingsError.code === '23503') {
          throw new Error('Buku tidak dapat dihapus karena masih terkait dengan data peminjaman');
        }
        throw deleteBorrowingsError;
      }
      
      console.log('✅ Borrowing history deleted');
      
      // 5. Hapus buku
      console.log('📚 Deleting book record...');
      const { error: deleteBookError } = await supabase
        .from('books')
        .delete()
        .eq('id', id)
      
      if (deleteBookError) {
        console.error('❌ Error deleting book:', deleteBookError);
        throw deleteBookError;
      }
      
      console.log('✅ Book deleted successfully');
      
    } catch (error) {
      console.error('❌ Error in delete book process:', error);
      throw error;
    }
  },

  // Search books
  search: async (query: string): Promise<Book[]> => {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .or(`title.ilike.%${query}%,author.ilike.%${query}%,book_code.ilike.%${query}%`)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }
}

// Type untuk create borrowing
export interface CreateBorrowingData {
  borrower_name: string
  borrower_unit: string
  book_id: string
  borrow_date: string
  due_date: string
  return_date: string | null  // TAMBAHKAN INI
  status: 'borrowed' | 'returned' | 'overdue'
  notes: string | null
}

// BORROWINGS API - PERBAIKI TYPE
export const borrowingsApi = {
  // Get all borrowings with book data
  getAll: async (): Promise<Borrowing[]> => {
    const { data, error } = await supabase
      .from('borrowings')
      .select(`
        *,
        book:books(*)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Create new borrowing - PERBAIKI TYPE PARAMETER
  create: async (borrowing: Omit<CreateBorrowingData, 'status' | 'return_date'> & { return_date?: string | null }): Promise<Borrowing> => {
    console.log('📚 Creating borrowing for book:', borrowing.book_id);
    
    try {
      // 1. Check if book exists and has available copies
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('available_copies, title, total_copies')
        .eq('id', borrowing.book_id)
        .single()

      console.log('📖 Book data before:', book);
      
      if (bookError) {
        console.error('❌ Book error:', bookError);
        throw bookError;
      }
      if (!book) throw new Error('Buku tidak ditemukan');
      if (book.available_copies <= 0) {
        console.log('⚠️ No available copies for book:', book.title);
        throw new Error('Stok buku habis');
      }

      // 2. Update book stock (decrease available_copies)
      console.log(`🔢 Updating stock from ${book.available_copies} to ${book.available_copies - 1}`);
      
      await booksApi.updateStock(borrowing.book_id, -1);
      
      console.log('✅ Stock updated successfully');

      // 3. Create borrowing record - TAMBAHKAN return_date
      const { data: borrowingData, error: borrowingError } = await supabase
        .from('borrowings')
        .insert({
          ...borrowing,
          borrow_date: borrowing.borrow_date || new Date().toISOString().split('T')[0],
          status: 'borrowed',
          return_date: null // Default null untuk peminjaman baru
        })
        .select(`
          *,
          book:books(*)
        `)
        .single()

      if (borrowingError) {
        console.error('❌ Create borrowing error:', borrowingError);
        // Rollback stock update jika gagal
        await booksApi.updateStock(borrowing.book_id, 1);
        throw borrowingError;
      }

      console.log('✅ Borrowing created:', borrowingData);
      return borrowingData;
    } catch (error) {
      console.error('❌ Error creating borrowing:', error);
      throw error;
    }
  },

  // Update borrowing
  update: async (id: string, updates: Partial<Borrowing>): Promise<Borrowing> => {
    const { data, error } = await supabase
      .from('borrowings')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        book:books(*)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  // Return book
  returnBook: async (id: string): Promise<Borrowing> => {
    console.log('🔄 Returning book for borrowing:', id);
    
    try {
      // 1. Get the borrowing record
      const { data: borrowing, error: borrowingError } = await supabase
        .from('borrowings')
        .select('book_id, status')
        .eq('id', id)
        .single()

      if (borrowingError) throw borrowingError;
      if (!borrowing) throw new Error('Data peminjaman tidak ditemukan');
      
      // 2. Update book stock (increase available_copies)
      console.log(`📚 Increasing stock for book: ${borrowing.book_id}`);
      await booksApi.updateStock(borrowing.book_id, 1);
      
      console.log('✅ Stock increased successfully');

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
          book:books(*)
        `)
        .single()

      if (updateBorrowingError) {
        console.error('❌ Update borrowing error:', updateBorrowingError);
        // Rollback stock jika gagal
        await booksApi.updateStock(borrowing.book_id, -1);
        throw updateBorrowingError;
      }

      console.log('✅ Book returned successfully:', updatedBorrowing);
      return updatedBorrowing;
    } catch (error) {
      console.error('❌ Error returning book:', error);
      throw error;
    }
  },

  // Delete borrowing
  delete: async (id: string): Promise<void> => {
    console.log('🗑️ Deleting borrowing:', id);
    
    try {
      // 1. Get the borrowing record
      const { data: borrowing, error: borrowingError } = await supabase
        .from('borrowings')
        .select('book_id, status')
        .eq('id', id)
        .single()

      if (borrowingError) throw borrowingError;

      // 2. If book was borrowed and not returned, restore stock
      if (borrowing && borrowing.status === 'borrowed' && borrowing.book_id) {
        console.log(`📚 Restoring stock for book: ${borrowing.book_id}`);
        await booksApi.updateStock(borrowing.book_id, 1);
      }

      // 3. Delete the borrowing record
      const { error: deleteError } = await supabase
        .from('borrowings')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError;
      
      console.log('✅ Borrowing deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting borrowing:', error);
      throw error;
    }
  }
}

// INVENTORY API - TAMBAHKAN deleteImage
export const inventoryApi = {
  // Get all inventory items
  getAll: async (): Promise<Inventory[]> => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Create inventory item
  create: async (item: Omit<Inventory, 'id' | 'created_at' | 'updated_at' | 'image_url'>): Promise<Inventory> => {
    const { data, error } = await supabase
      .from('inventory')
      .insert({
        ...item,
        image_url: null
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Create inventory with image
  createWithImage: async (item: Omit<Inventory, 'id' | 'created_at' | 'updated_at' | 'image_url'>, imageFile?: File): Promise<Inventory> => {
    let imageUrl: string | null = null
    
    // First create the item to get ID
    const { data: itemData, error: createError } = await supabase
      .from('inventory')
      .insert({
        ...item,
        image_url: null
      })
      .select()
      .single()
    
    if (createError) throw createError

    // Upload image if provided
    if (imageFile && itemData.id) {
      imageUrl = await storageApi.uploadInventoryImage(imageFile, itemData.id)
      
      // Update item with image URL
      const { data: updatedItem, error: updateError } = await supabase
        .from('inventory')
        .update({ image_url: imageUrl })
        .eq('id', itemData.id)
        .select()
        .single()
      
      if (updateError) throw updateError
      return updatedItem
    }

    return itemData
  },

  // Update inventory item
  update: async (id: string, updates: Partial<Inventory>): Promise<Inventory> => {
    const { data, error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update inventory with image
  updateWithImage: async (id: string, updates: Partial<Inventory>, imageFile?: File): Promise<Inventory> => {
    let imageUrl = updates.image_url
    
    // Upload new image if provided
    if (imageFile) {
      imageUrl = await storageApi.uploadInventoryImage(imageFile, id)
    }

    const { data, error } = await supabase
      .from('inventory')
      .update({ ...updates, image_url: imageUrl })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete inventory item
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // TAMBAHKAN fungsi deleteImage
  deleteImage: async (imageUrl: string): Promise<void> => {
    await storageApi.deleteImage(imageUrl);
  }
}

// DASHBOARD API
export const dashboardApi = {
  // Get dashboard statistics
  getStats: async () => {
    const [
      { count: totalBooks },
      { count: totalBorrowings },
      { count: activeBorrowings },
      { count: overdueBorrowings },
      { count: totalInventory }
    ] = await Promise.all([
      supabase.from('books').select('*', { count: 'exact', head: true }),
      supabase.from('borrowings').select('*', { count: 'exact', head: true }),
      supabase.from('borrowings').select('*', { count: 'exact', head: true }).eq('status', 'borrowed'),
      supabase.from('borrowings').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
      supabase.from('inventory').select('*', { count: 'exact', head: true })
    ])

    const { data: books } = await supabase.from('books').select('available_copies')
    const availableBooks = books?.reduce((sum, book) => sum + book.available_copies, 0) || 0

    return {
      totalBooks: totalBooks || 0,
      availableBooks,
      totalBorrowings: totalBorrowings || 0,
      activeBorrowings: activeBorrowings || 0,
      overdueBorrowings: overdueBorrowings || 0,
      totalInventory: totalInventory || 0
    }
  },

  // Get recent borrowings
  getRecentBorrowings: async (limit = 10): Promise<Borrowing[]> => {
    const { data, error } = await supabase
      .from('borrowings')
      .select(`
        *,
        book:books(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  },

  // Get monthly statistics
  getMonthlyStats: async () => {
    return [
      { month: 'Jan', peminjaman: 65, pengembalian: 40 },
      { month: 'Feb', peminjaman: 78, pengembalian: 55 },
      { month: 'Mar', peminjaman: 90, pengembalian: 65 },
    ]
  }
}