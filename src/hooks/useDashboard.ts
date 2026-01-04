import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabase'

interface DashboardStats {
  totalBooks: number
  availableBooks: number // Dari tabel books.available_copies
  activeBorrowings: number
  overdueBorrowings: number
  totalBorrowings: number
  totalInventory: number // Dari tabel inventory.quantity
}

interface MonthlyStat {
  month: string
  peminjaman: number
  pengembalian: number
}

interface CategoryStat {
  name: string
  value: number
}

interface PopularBook {
  title: string
  author: string
  borrowed: number
}

interface RecentBorrowing {
  id: string
  borrower_name: string
  book: {
    title: string
  } | null
  borrow_date: string
  status: string
  created_at: string
}

export function useDashboard() {
  // Fetch Stats
  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // 1. Get stats from BOOKS table
      const { count: totalBooks, error: booksError } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true })

      if (booksError) throw booksError

      // Get total available copies from books (SUM of available_copies)
      const { data: booksData, error: booksDataError } = await supabase
        .from('books')
        .select('available_copies')

      if (booksDataError) throw booksDataError

      const availableBooks = booksData?.reduce((sum, book) => sum + (book.available_copies || 0), 0) || 0

      // 2. Get stats from INVENTORY table
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select('quantity, condition')

      if (inventoryError) throw inventoryError

      // Total inventory items (count of rows)
      const totalInventoryItems = inventoryData?.length || 0
      
      // Total quantity from inventory (sum of quantity)
      const totalInventoryQuantity = inventoryData?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
      
      // Items in good condition
      const goodConditionItems = inventoryData?.filter(item => item.condition === 'baik').length || 0

      // 3. Get stats from BORROWINGS table
      const { data: borrowings, error: borrowingsError } = await supabase
        .from('borrowings')
        .select('*')

      if (borrowingsError) throw borrowingsError

      const activeBorrowings = borrowings?.filter(b => b.status === 'borrowed').length || 0
      const overdueBorrowings = borrowings?.filter(b => {
        const dueDate = new Date(b.due_date)
        return dueDate < new Date() && b.status === 'borrowed'
      }).length || 0
      const totalBorrowings = borrowings?.length || 0

      return {
        totalBooks: totalBooks || 0,
        availableBooks: availableBooks, // Jumlah salinan yang tersedia dari buku
        activeBorrowings,
        overdueBorrowings,
        totalBorrowings,
        totalInventory: totalInventoryQuantity, // Jumlah total item inventaris (sum quantity)
        totalInventoryItems, // Jumlah jenis item inventaris
        goodConditionItems // Item inventaris dalam kondisi baik
      } as DashboardStats
    },
    refetchInterval: 60000, // Auto-refresh setiap 1 menit
  })

  // Fetch Monthly Stats (untuk chart)
  const monthlyStatsQuery = useQuery({
    queryKey: ['dashboard-monthly-stats'],
    queryFn: async () => {
      const { data: borrowings, error } = await supabase
        .from('borrowings')
        .select('borrow_date, return_date, status')
        .gte('borrow_date', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString()) // 6 bulan terakhir

      if (error) throw error

      // Group by month
      const monthlyStats: { [key: string]: { peminjaman: number, pengembalian: number } } = {}

      borrowings?.forEach(borrowing => {
        const borrowDate = new Date(borrowing.borrow_date)
        const monthYear = borrowDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
        
        if (!monthlyStats[monthYear]) {
          monthlyStats[monthYear] = { peminjaman: 0, pengembalian: 0 }
        }
        
        // Count peminjaman
        monthlyStats[monthYear].peminjaman++
        
        // Count pengembalian jika ada return_date
        if (borrowing.return_date && borrowing.status === 'returned') {
          const returnDate = new Date(borrowing.return_date)
          const returnMonthYear = returnDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
          
          if (!monthlyStats[returnMonthYear]) {
            monthlyStats[returnMonthYear] = { peminjaman: 0, pengembalian: 0 }
          }
          monthlyStats[returnMonthYear].pengembalian++
        }
      })

      // Convert to array and sort by date
      const result = Object.entries(monthlyStats)
        .map(([month, stats]) => ({
          month,
          peminjaman: stats.peminjaman,
          pengembalian: stats.pengembalian
        }))
        .sort((a, b) => {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
          const aMonth = a.month.split(' ')[0]
          const bMonth = b.month.split(' ')[0]
          return months.indexOf(aMonth) - months.indexOf(bMonth)
        })
        .slice(-6) // Ambil 6 bulan terakhir

      return result as MonthlyStat[]
    },
  })

  // Fetch Category Stats (dari buku)
  const categoryStatsQuery = useQuery({
    queryKey: ['dashboard-category-stats'],
    queryFn: async () => {
      const { data: books, error } = await supabase
        .from('books')
        .select('category, total_copies')

      if (error) throw error

      // Group by category
      const categoryMap = new Map<string, number>()
      
      books?.forEach(book => {
        const category = book.category || 'Lainnya'
        const current = categoryMap.get(category) || 0
        categoryMap.set(category, current + 1) // Count by book, not by copies
      })

      // Convert to array and calculate percentages
      const totalBooks = books?.length || 1
      
      const result = Array.from(categoryMap.entries())
        .map(([name, count]) => ({
          name,
          value: Math.round((count / totalBooks) * 100)
        }))
        .sort((a, b) => b.value - a.value) // Sort by highest percentage
        .slice(0, 6) // Top 6 categories

      return result as CategoryStat[]
    },
  })

  // Fetch Popular Books
  const popularBooksQuery = useQuery({
    queryKey: ['dashboard-popular-books'],
    queryFn: async () => {
      // Get borrowings count per book for the last 30 days
      const { data: borrowings, error } = await supabase
        .from('borrowings')
        .select('book_id, books(title, author)')
        .gte('borrow_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 30 hari terakhir

      if (error) throw error

      // Count borrowings per book
      const bookCounts = new Map<string, { title: string, author: string, count: number }>()

      borrowings?.forEach(borrowing => {
        if (borrowing.book_id) {
          const book = borrowing.books as any
          
          if (book && book.title) {
            const current = bookCounts.get(borrowing.book_id) || { 
              title: book.title, 
              author: book.author || 'Tidak diketahui',
              count: 0 
            }
            bookCounts.set(borrowing.book_id, { ...current, count: current.count + 1 })
          }
        }
      })

      // Convert to array and sort
      const result = Array.from(bookCounts.values())
        .map(book => ({
          title: book.title,
          author: book.author,
          borrowed: book.count
        }))
        .sort((a, b) => b.borrowed - a.borrowed)
        .slice(0, 5) // Top 5 books

      return result as PopularBook[]
    },
  })

  // Fetch Recent Borrowings
  const recentBorrowingsQuery = useQuery({
    queryKey: ['dashboard-recent-borrowings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('borrowings')
        .select(`
          id,
          borrower_name,
          borrow_date,
          status,
          created_at,
          books (
            title
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error

      const result = data?.map(item => ({
        id: item.id,
        borrower_name: item.borrower_name,
        book: item.books ? { title: (item.books as any).title } : null,
        borrow_date: new Date(item.borrow_date).toLocaleDateString('id-ID'),
        status: item.status,
        created_at: item.created_at
      })) || []

      return result as RecentBorrowing[]
    },
  })

  return {
    stats: statsQuery.data,
    monthlyStats: monthlyStatsQuery.data,
    categoryStats: categoryStatsQuery.data,
    popularBooks: popularBooksQuery.data,
    recentBorrowings: recentBorrowingsQuery.data,
    isLoading: statsQuery.isLoading || monthlyStatsQuery.isLoading || 
                categoryStatsQuery.isLoading || popularBooksQuery.isLoading || 
                recentBorrowingsQuery.isLoading,
    refetch: () => {
      statsQuery.refetch()
      monthlyStatsQuery.refetch()
      categoryStatsQuery.refetch()
      popularBooksQuery.refetch()
      recentBorrowingsQuery.refetch()
    }
  }
}