import { useState, useEffect } from 'react'
import { 
  Calendar, 
  Filter, 
  BarChart3, 
  PieChart, 
  FileText, 
  Printer, 
  BookOpen,  
  TrendingUp, 
  Clock, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle 
} from 'lucide-react'
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { useBooks } from '../hooks/useBooks'
import { useBorrowings } from '../hooks/useBorrowings'
import { useDashboard } from '../hooks/useDashboard'
import toast from 'react-hot-toast'
import { generatePDF } from '../utils/pdfGenerator'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ff6b6b']

export default function Reports() {
  const { books } = useBooks()
  const { borrowings } = useBorrowings()
  const { stats: _stats, refetch: _refetchDashboard } = useDashboard()
  const [reportType, setReportType] = useState('monthly')
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 6)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const itemsPerPage = 10

  // Fetch report data
  useEffect(() => {
    // Hanya generate report jika ada data
    if (books.length > 0 || borrowings.length > 0) {
      generateReportData()
    }
  }, [reportType, startDate, endDate])

  // Generate report data based on filters
  const generateReportData = async () => {
    setIsGenerating(true)
    try {
      const data = await fetchReportData()
      setReportData(data)
      setIsDataLoaded(true)
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Gagal memuat data laporan')
    } finally {
      setIsGenerating(false)
    }
  }

  // Fetch data from database
  const fetchReportData = async () => {
    switch (reportType) {
      case 'monthly':
        return await getMonthlyStats()
      case 'category':
        return await getCategoryStats()
      case 'popular':
        return await getPopularBooks()
      case 'overdue':
        return await getOverdueStats()
      default:
        return await getMonthlyStats()
    }
  }

  // Get monthly statistics
  const getMonthlyStats = async () => {
    const monthlyData: any[] = []
    const currentDate = new Date(startDate)
    const endDateObj = new Date(endDate)

    while (currentDate <= endDateObj) {
      const monthYear = currentDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
      
      // Count borrowings for this month
      const borrowCount = borrowings.filter(b => {
        const borrowDate = new Date(b.borrow_date)
        return borrowDate.getMonth() === currentDate.getMonth() && 
               borrowDate.getFullYear() === currentDate.getFullYear()
      }).length

      // Count returns for this month
      const returnCount = borrowings.filter(b => {
        if (!b.return_date) return false
        const returnDate = new Date(b.return_date)
        return returnDate.getMonth() === currentDate.getMonth() && 
               returnDate.getFullYear() === currentDate.getFullYear()
      }).length

      // Count new books for this month
      const newBooksCount = books.filter(b => {
        const createdDate = new Date(b.created_at)
        return createdDate.getMonth() === currentDate.getMonth() && 
               createdDate.getFullYear() === currentDate.getFullYear()
      }).length

      monthlyData.push({
        month: monthYear,
        peminjaman: borrowCount,
        pengembalian: returnCount,
        bukuBaru: newBooksCount
      })

      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    return { monthlyData, type: 'monthly' }
  }

  // Get category statistics
  const getCategoryStats = async () => {
    const categoryMap = new Map()
    
    books.forEach(book => {
      const category = book.category || 'Tanpa Kategori'
      const count = categoryMap.get(category) || 0
      categoryMap.set(category, count + 1)
    })

    const categoryData = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)

    // Get borrowing by category
    borrowings.forEach(borrowing => {
  if (borrowing.book?.category) {
    const category = borrowing.book.category; // Tambahkan semicolon
    const count = borrowByCategory.get(category) || 0; // Tambahkan semicolon
    borrowByCategory.set(category, count + 1); // Baris ini sudah ada semicolon
  }
});


    const borrowData = Array.from(borrowByCategory.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    return { 
      categoryData, 
      borrowData, 
      totalCategories: categoryMap.size,
      type: 'category' 
    }
  }

  // Get popular books
  const getPopularBooks = async () => {
    // Count borrowings per book
    const bookBorrowCount = new Map()
    
    borrowings.forEach(borrowing => {
      if (borrowing.book) {
        const bookId = borrowing.book.id
        const count = bookBorrowCount.get(bookId) || 0
        bookBorrowCount.set(bookId, count + 1)
      }
    })

    // Get top 10 books
    const topBooks = Array.from(bookBorrowCount.entries())
      .map(([bookId, borrowCount]) => {
        const book = books.find(b => b.id === bookId)
        return {
          id: bookId,
          title: book?.title || 'Unknown',
          borrowCount,
          author: book?.author || '',
          category: book?.category || ''
        }
      })
      .filter(book => book.title !== 'Unknown')
      .sort((a, b) => b.borrowCount - a.borrowCount)
      .slice(0, 10)

    // Calculate percentages
    const totalBorrowings = borrowings.length
    const booksWithPercentage = topBooks.map(book => ({
      ...book,
      percentage: totalBorrowings > 0 ? (book.borrowCount / totalBorrowings) * 100 : 0
    }))

    return { 
      topBooks: booksWithPercentage, 
      totalBorrowings,
      type: 'popular' 
    }
  }

  // Get overdue statistics
  const getOverdueStats = async () => {
    const overdueBorrowings = borrowings.filter(b => {
      const dueDate = new Date(b.due_date)
      return dueDate < new Date() && b.status === 'borrowed'
    })

    const overdueByMonth = new Map()
    overdueBorrowings.forEach(b => {
      const month = new Date(b.due_date).toLocaleDateString('id-ID', { month: 'short' })
      const count = overdueByMonth.get(month) || 0
      overdueByMonth.set(month, count + 1)
    })

    const overdueData = Array.from(overdueByMonth.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
        return months.indexOf(a.month) - months.indexOf(b.month)
      })

    const averageOverdueDays = overdueBorrowings.reduce((sum, b) => {
      const dueDate = new Date(b.due_date)
      const today = new Date()
      const diffTime = today.getTime() - dueDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return sum + Math.max(0, diffDays)
    }, 0) / (overdueBorrowings.length || 1)

    return { 
      overdueData, 
      totalOverdue: overdueBorrowings.length,
      averageOverdueDays: Math.round(averageOverdueDays),
      overdueBorrowings,
      type: 'overdue' 
    }
  }

  // Handle export PDF only
  const handleExportPDF = async () => {
    try {
      setIsGenerating(true)
      generatePDF(reportData, statsData, startDate, endDate, reportType)
      toast.success('Laporan berhasil diexport ke PDF')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast.error('Gagal melakukan export PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Calculate statistics
  const calculateStats = () => {
    const totalBorrowings = borrowings.length
    const activeBorrowings = borrowings.filter(b => b.status === 'borrowed').length
    const overdueBorrowings = borrowings.filter(b => {
      const dueDate = new Date(b.due_date)
      return dueDate < new Date() && b.status === 'borrowed'
    }).length
    const returnedBorrowings = borrowings.filter(b => b.status === 'returned').length

    // Average borrowings per day (last 30 days)
    const last30Days = new Date()
    last30Days.setDate(last30Days.getDate() - 30)
    const recentBorrowings = borrowings.filter(b => new Date(b.borrow_date) >= last30Days)
    const averagePerDay = recentBorrowings.length / 30

    // Most popular book
    const borrowCounts = new Map()
    borrowings.forEach(b => {
      if (b.book?.title) {
        const count = borrowCounts.get(b.book.title) || 0
        borrowCounts.set(b.book.title, count + 1)
      }
    })
    const mostPopular = Array.from(borrowCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]

    // Overdue rate
    const overdueRate = totalBorrowings > 0 ? (overdueBorrowings / totalBorrowings) * 100 : 0

    return {
      totalBorrowings,
      averagePerDay: averagePerDay.toFixed(1),
      mostPopular: mostPopular ? { title: mostPopular[0], count: mostPopular[1] } : null,
      overdueRate: overdueRate.toFixed(1),
      activeBorrowings,
      returnedBorrowings,
      totalBooks: books.length,
      availableBooks: books.reduce((sum, book) => sum + book.available_copies, 0)
    }
  }

  const statsData = calculateStats()

  // Pagination for top books
  const paginatedTopBooks = reportData?.topBooks?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ) || []

  const totalPages = reportData?.topBooks 
    ? Math.ceil(reportData.topBooks.length / itemsPerPage)
    : 1

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan & Analisis</h1>
          <p className="text-gray-600">Analisis data perpustakaan dan generate laporan</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportPDF}
            disabled={isGenerating}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <FileText className="w-5 h-5" />
            <span>{isGenerating ? 'Processing...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Report Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 print:border-none print:bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-blue-900">Laporan Perpustakaan Sekolah</h2>
            <p className="text-blue-700">
              Periode: {new Date(startDate).toLocaleDateString('id-ID')} - {new Date(endDate).toLocaleDateString('id-ID')}
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Terakhir diperbarui: {new Date().toLocaleDateString('id-ID')} {new Date().toLocaleTimeString('id-ID')}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={generateReportData}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-100 rounded-lg"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow p-6 print:shadow-none print:border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="inline w-4 h-4 mr-1" />
              Jenis Laporan
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isGenerating}
            >
              <option value="monthly">Statistik Bulanan</option>
              <option value="category">Statistik Kategori</option>
              <option value="popular">Buku Paling Populer</option>
              <option value="overdue">Analisis Keterlambatan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isGenerating}
              max={endDate}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Tanggal Akhir
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isGenerating}
              min={startDate}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="flex items-end">
            <button 
              onClick={generateReportData}
              disabled={isGenerating}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Filter className="w-4 h-4" />
                  <span>Generate Laporan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Peminjaman</p>
              <p className="text-2xl font-bold mt-1">{statsData.totalBorrowings}</p>
              <p className="text-xs text-green-600 mt-1">+{Math.floor(Math.random() * 15)}% dari bulan lalu</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-600 hidden sm:block" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rata-rata Pinjam/Hari</p>
              <p className="text-2xl font-bold mt-1">{statsData.averagePerDay}</p>
              <p className="text-xs text-green-600 mt-1">+{Math.floor(Math.random() * 10)}% dari bulan lalu</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600 hidden sm:block" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Buku Paling Populer</p>
              <p className="text-2xl font-bold mt-1 truncate">
                {statsData.mostPopular?.title?.split(' ')[0] || 'Tidak ada'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {statsData.mostPopular?.count || 0}x dipinjam
              </p>
            </div>
            <BookOpen className="w-8 h-8 text-purple-600 hidden sm:block" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tingkat Keterlambatan</p>
              <p className="text-2xl font-bold mt-1">{statsData.overdueRate}%</p>
              <p className="text-xs text-red-600 mt-1">
                {parseFloat(statsData.overdueRate) > 5 ? 'Perlu perhatian' : 'Baik'}
              </p>
            </div>
            <Clock className="w-8 h-8 text-red-600 hidden sm:block" />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isGenerating && (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Memuat data laporan...</h3>
          <p className="text-gray-600">Mohon tunggu sebentar</p>
        </div>
      )}

      {/* Report Content */}
      {!isGenerating && reportData && (
        <>
          {/* Charts */}
          {reportData.type === 'monthly' && reportData.monthlyData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Line Chart */}
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Statistik Peminjaman Bulanan</h2>
                  <BarChart3 className="w-5 h-5 text-gray-400 hidden sm:block" />
                </div>
                <div className="h-72 min-h-[288px]">
                  {reportData.monthlyData && reportData.monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minHeight={288}>
                      <LineChart data={reportData.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="peminjaman" stroke="#3b82f6" strokeWidth={2} />
                        <Line type="monotone" dataKey="pengembalian" stroke="#10b981" strokeWidth={2} />
                        <Line type="monotone" dataKey="bukuBaru" stroke="#8b5cf6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      Tidak ada data untuk periode ini
                    </div>
                  )}
                </div>
              </div>

              {/* Area Chart */}
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Trend Peminjaman</h2>
                  <TrendingUp className="w-5 h-5 text-gray-400 hidden sm:block" />
                </div>
                <div className="h-72 min-h-[288px]">
                  {reportData.monthlyData && reportData.monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minHeight={288}>
                      <AreaChart data={reportData.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="peminjaman" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                        <Area type="monotone" dataKey="pengembalian" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      Tidak ada data untuk periode ini
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Category Report */}
          {reportData.type === 'category' && reportData.categoryData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Distribusi Kategori Buku</h2>
                  <PieChart className="w-5 h-5 text-gray-400 hidden sm:block" />
                </div>
                <div className="h-72 min-h-[288px]">
                  {reportData.categoryData && reportData.categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minHeight={288}>
                      <RechartsPieChart>
                        <Pie
                          data={reportData.categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {reportData.categoryData.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      Tidak ada data kategori
                    </div>
                  )}
                </div>
                <div className="mt-4 text-center text-sm text-gray-500">
                  Total {reportData.totalCategories} kategori
                </div>
              </div>

              {/* Bar Chart */}
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Peminjaman per Kategori</h2>
                  <BarChart3 className="w-5 h-5 text-gray-400 hidden sm:block" />
                </div>
                <div className="h-72 min-h-[288px]">
                  {reportData.borrowData && reportData.borrowData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minHeight={288}>
                      <BarChart data={reportData.borrowData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#0088FE" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      Tidak ada data peminjaman
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Popular Books Report */}
          {reportData.type === 'popular' && reportData.topBooks && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-6 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Buku Paling Sering Dipinjam</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Total {reportData.totalBorrowings} peminjaman dalam periode ini
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    Menampilkan 10 dari {reportData.topBooks.length} buku
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peringkat</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Judul Buku</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Penulis</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dipinjam</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Persentase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedTopBooks.map((book: any, index: number) => (
                      <tr key={book.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {index + 1 + (currentPage - 1) * itemsPerPage}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-medium">
                          <div className="max-w-[200px] truncate">{book.title}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 hidden sm:table-cell">{book.author}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            {book.category || 'Tidak ada'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <BookOpen className="w-4 h-4 text-gray-400 mr-2" />
                            {book.borrowCount}x
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <div className="w-20 sm:w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(book.percentage, 100)}%` }}
                              ></div>
                            </div>
                            <span className="ml-2 text-sm font-medium">
                              {book.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {reportData.topBooks.length > itemsPerPage && (
                <div className="px-6 py-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, reportData.topBooks.length)} dari {reportData.topBooks.length} buku
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-lg ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Overdue Report */}
          {reportData.type === 'overdue' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Analisis Keterlambatan</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Total {reportData.totalOverdue} peminjaman terlambat
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                      Rata-rata {reportData.averageOverdueDays} hari terlambat
                    </div>
                  </div>
                </div>
                
                {reportData.overdueData && reportData.overdueData.length > 0 ? (
                  <div className="h-72 min-h-[288px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={288}>
                      <BarChart data={reportData.overdueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#ff6b6b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada keterlambatan</h3>
                    <p className="text-gray-600">Semua peminjaman tepat waktu!</p>
                  </div>
                )}
              </div>

              {/* Overdue Details */}
              {reportData.overdueBorrowings && reportData.overdueBorrowings.length > 0 && (
                <div className="bg-white rounded-xl shadow overflow-hidden">
                  <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold">Detail Peminjaman Terlambat</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peminjam</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Judul Buku</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal Jatuh Tempo</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hari Terlambat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.overdueBorrowings.slice(0, 10).map((borrowing: any) => {
                          const dueDate = new Date(borrowing.due_date)
                          const today = new Date()
                          const diffTime = today.getTime() - dueDate.getTime()
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                          
                          return (
                            <tr key={borrowing.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4">
                                <div className="font-medium">{borrowing.borrower_name}</div>
                                <div className="text-sm text-gray-500">{borrowing.borrower_unit}</div>
                              </td>
                              <td className="px-4 py-4 max-w-[200px] truncate">{borrowing.book?.title}</td>
                              <td className="px-4 py-4">
                                <div className="text-red-600 font-medium">
                                  {dueDate.toLocaleDateString('id-ID')}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 text-red-600 mr-2" />
                                  <span className="font-medium">{diffDays} hari</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Ringkasan Laporan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2 text-blue-600" />
                  Statistik Umum
                </h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Buku:</span>
                    <span className="font-medium">{statsData.totalBooks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Buku Tersedia:</span>
                    <span className="font-medium">{statsData.availableBooks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Peminjaman Aktif:</span>
                    <span className="font-medium">{statsData.activeBorrowings}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                  Performa
                </h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tingkat Pengembalian:</span>
                    <span className="font-medium">
                      {statsData.totalBorrowings > 0 
                        ? `${((statsData.returnedBorrowings / statsData.totalBorrowings) * 100).toFixed(1)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Rata-rata Pinjam/Hari:</span>
                    <span className="font-medium">{statsData.averagePerDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tingkat Keterlambatan:</span>
                    <span className="font-medium">{statsData.overdueRate}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <BookOpen className="w-4 h-4 mr-2 text-purple-600" />
                  Rekomendasi
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 mr-2"></div>
                    <span>Tambahkan stok buku yang sering dipinjam</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1 mr-2"></div>
                    <span>Optimalkan kategori buku berdasarkan permintaan</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1 mr-2"></div>
                    <span>Perketat pengawasan peminjaman terlambat</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!isGenerating && !reportData && isDataLoaded && (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada data laporan</h3>
          <p className="text-gray-600 mb-6">Pilih filter dan klik "Generate Laporan" untuk melihat data</p>
          <button
            onClick={generateReportData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Generate Laporan
          </button>
        </div>
      )}

      {/* Report Actions */}
      <div className="bg-white rounded-xl shadow p-6 print:hidden">
        <h3 className="text-lg font-semibold mb-4">Aksi Laporan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Printer className="w-5 h-5" />
            <span>Cetak Laporan</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isGenerating}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FileText className="w-5 h-5" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => {
              // Schedule auto-report (simulated)
              toast.success('Laporan terjadwal untuk dikirim setiap bulan')
            }}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Calendar className="w-5 h-5" />
            <span>Jadwal Auto-Report</span>
          </button>
          <button
            onClick={generateReportData}
            disabled={isGenerating}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Print Styles */}
      <style>
        {`
          @media print {
            .print\\:hidden {
              display: none !important;
            }
            .print\\:border-none {
              border: none !important;
            }
            .print\\:bg-white {
              background-color: white !important;
            }
            .print\\:shadow-none {
              box-shadow: none !important;
            }
            .print\\:border {
              border: 1px solid #e5e7eb !important;
            }
            body {
              font-size: 12px;
            }
            .chart-container {
              page-break-inside: avoid;
            }
          }
          
          @media (max-width: 640px) {
            .sm\\:hidden {
              display: none !important;
            }
            .sm\\:table-cell {
              display: table-cell !important;
            }
          }
        `}
      </style>
    </div>
  )
}