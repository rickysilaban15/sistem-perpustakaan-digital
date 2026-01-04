import { useState, useEffect } from 'react'
import { 
  Plus, Search, Filter, Calendar, User, BookOpen, 
  CheckCircle, AlertCircle, Trash2, Eye, ChevronLeft, 
  ChevronRight, Clock, MoreVertical, ArrowLeft 
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useBorrowings } from '../hooks/useBorrowings'
import { useBooks } from '../hooks/useBooks'
import { Borrowing } from '../services/api'

export default function Borrowings() {
  const { borrowings, isLoading, createBorrowing, returnBook, deleteBorrowing, refetch } = useBorrowings()
  const { books } = useBooks()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showBorrowModal, setShowBorrowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showMobileActions, setShowMobileActions] = useState<string | null>(null)
  const itemsPerPage = 10
  
  // Form state
  const [formData, setFormData] = useState({
    borrower_name: '',
    borrower_unit: '',
    book_id: '',
    due_date: '',
    notes: ''
  })

  // Reset form
  const resetForm = () => {
    setFormData({
      borrower_name: '',
      borrower_unit: '',
      book_id: '',
      due_date: '',
      notes: ''
    })
  }

  // Calculate due date (7 days from now)
  useEffect(() => {
    const today = new Date()
    const dueDate = new Date(today)
    dueDate.setDate(today.getDate() + 7)
    setFormData(prev => ({
      ...prev,
      due_date: dueDate.toISOString().split('T')[0]
    }))
  }, [])

  // Filter borrowings
  const filteredBorrowings = borrowings.filter(borrowing => {
    const matchesSearch = borrowing.borrower_name.toLowerCase().includes(search.toLowerCase()) ||
                         borrowing.book?.title.toLowerCase().includes(search.toLowerCase()) ||
                         borrowing.borrower_unit.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || borrowing.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Pagination
  const totalPages = Math.ceil(filteredBorrowings.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedBorrowings = filteredBorrowings.slice(startIndex, startIndex + itemsPerPage)

  // Get status badge
  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status === 'borrowed'
    const actualStatus = isOverdue ? 'overdue' : status
    
    const styles = {
      borrowed: 'bg-blue-100 text-blue-800',
      overdue: 'bg-red-100 text-red-800',
      returned: 'bg-green-100 text-green-800'
    }
    
    const icons = {
      borrowed: <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />,
      overdue: <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />,
      returned: <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
    }
    
    return (
      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex items-center justify-center sm:justify-start ${styles[actualStatus as keyof typeof styles]}`}>
        {icons[actualStatus as keyof typeof icons]}
        <span className="hidden sm:inline">
          {actualStatus === 'borrowed' ? 'Dipinjam' : 
           actualStatus === 'overdue' ? 'Terlambat' : 'Dikembalikan'}
        </span>
        <span className="sm:hidden">
          {actualStatus === 'borrowed' ? 'Pinjam' : 
           actualStatus === 'overdue' ? 'Telat' : 'Kembali'}
        </span>
      </span>
    )
  }

  // Handle return book
  const handleReturn = async (id: string) => {
    try {
      await returnBook(id)
      toast.success('Buku berhasil dikembalikan')
      setShowMobileActions(null)
    } catch (error) {
      toast.error('Gagal mengembalikan buku')
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data peminjaman ini?')) {
      try {
        await deleteBorrowing(id)
        toast.success('Data peminjaman berhasil dihapus')
        setShowMobileActions(null)
      } catch (error) {
        toast.error('Gagal menghapus data peminjaman')
      }
    }
  }

  // Handle view detail
  const handleViewDetail = (borrowing: Borrowing) => {
    setSelectedBorrowing(borrowing)
    setShowDetailModal(true)
    setShowMobileActions(null)
  }

  // Handle create borrowing
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate available copies
    const selectedBook = books.find(b => b.id === formData.book_id)
    if (selectedBook && selectedBook.available_copies <= 0) {
      toast.error('Buku tidak tersedia untuk dipinjam')
      return
    }

    try {
      await createBorrowing({
        ...formData,
        borrow_date: new Date().toISOString().split('T')[0],
        status: 'borrowed'
      })
      toast.success('Peminjaman berhasil dicatat')
      setShowBorrowModal(false)
      resetForm()
    } catch (error) {
      toast.error('Gagal mencatat peminjaman')
    }
  }

  // Calculate days remaining
  const getDaysRemaining = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Get overdue borrowings
  const overdueBorrowings = borrowings.filter(b => {
    return new Date(b.due_date) < new Date() && b.status === 'borrowed'
  })

  // Get active borrowings
  const activeBorrowings = borrowings.filter(b => b.status === 'borrowed')
  const returnedBorrowings = borrowings.filter(b => b.status === 'returned')

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manajemen Peminjaman</h1>
          <p className="text-sm sm:text-base text-gray-600">Kelola peminjaman dan pengembalian buku</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowBorrowModal(true)
          }}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors w-full md:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm sm:text-base">Peminjaman Baru</span>
        </button>
      </div>

      {/* Stats - Mobile Scrollable */}
      <div className="overflow-x-auto pb-2">
        <div className="flex md:grid md:grid-cols-4 gap-4 min-w-max md:min-w-0">
          <div className="bg-white rounded-xl shadow p-4 min-w-[180px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Peminjaman</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{borrowings.length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4 min-w-[180px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Sedang Dipinjam</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{activeBorrowings.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {activeBorrowings.length > 0 ? `${activeBorrowings.length} aktif` : 'Tidak ada'}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4 min-w-[180px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Terlambat</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{overdueBorrowings.length}</p>
                <p className="text-xs text-red-600 mt-1">
                  {overdueBorrowings.length > 0 ? 'Perlu perhatian' : 'Tidak ada'}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4 min-w-[180px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Sudah Dikembalikan</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{returnedBorrowings.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {returnedBorrowings.length > 0 ? 
                    `${Math.round((returnedBorrowings.length / borrowings.length) * 100)}%` : 
                    '0%'}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueBorrowings.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-medium text-red-800">Ada {overdueBorrowings.length} peminjaman terlambat!</p>
                <p className="text-sm text-red-600">
                  Segera hubungi peminjam untuk pengembalian buku
                </p>
              </div>
            </div>
            <button 
              onClick={() => setStatusFilter('overdue')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm w-full sm:w-auto"
            >
              Lihat Detail
            </button>
          </div>
        </div>
      )}

      {/* Filters - Desktop */}
      <div className="hidden md:block bg-white rounded-xl shadow p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, kelas, atau judul buku..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">Semua Status</option>
              <option value="borrowed">Dipinjam</option>
              <option value="overdue">Terlambat</option>
              <option value="returned">Dikembalikan</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-x-4">
              <span className="text-gray-600">Menampilkan: {filteredBorrowings.length} data</span>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters - Mobile */}
      <div className="md:hidden bg-white rounded-xl shadow p-4">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, kelas, atau judul buku..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Filter className="w-5 h-5" />
              <span>Filter</span>
            </button>
            
            <span className="text-gray-600 text-sm">{filteredBorrowings.length} data</span>
            
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              Refresh
            </button>
          </div>
          
          {showMobileFilters && (
            <div className="pt-4 border-t">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="borrowed">Dipinjam</option>
                  <option value="overdue">Terlambat</option>
                  <option value="returned">Dikembalikan</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Borrowings Table - Desktop */}
      <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peminjam</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Judul Buku</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sisa Hari</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : paginatedBorrowings.length > 0 ? (
                paginatedBorrowings.map((borrowing) => {
                  const daysRemaining = getDaysRemaining(borrowing.due_date)
                  const isOverdue = new Date(borrowing.due_date) < new Date() && borrowing.status === 'borrowed'
                  
                  return (
                    <tr key={borrowing.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{borrowing.borrower_name}</div>
                            <div className="text-sm text-gray-500">{borrowing.borrower_unit}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{borrowing.book?.title}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <BookOpen className="w-3 h-3 mr-1" />
                            {borrowing.book?.author}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            <span>Pinjam: {borrowing.borrow_date}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            <span className={isOverdue ? 'text-red-600' : ''}>
                              Jatuh tempo: {borrowing.due_date}
                            </span>
                          </div>
                          {borrowing.return_date && (
                            <div className="flex items-center text-sm text-green-600">
                              <Calendar className="w-4 h-4 mr-2" />
                              <span>Kembali: {borrowing.return_date}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(borrowing.status, borrowing.due_date)}
                      </td>
                      <td className="px-6 py-4">
                        {borrowing.status === 'borrowed' ? (
                          <div className={`flex items-center ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                            <Clock className="w-4 h-4 mr-2" />
                            <span className="font-medium">
                              {isOverdue ? `Terlambat ${Math.abs(daysRemaining)} hari` : 
                               daysRemaining > 0 ? `${daysRemaining} hari lagi` : 'Hari ini'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleViewDetail(borrowing)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Lihat detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {borrowing.status === 'borrowed' && (
                            <button 
                              onClick={() => handleReturn(borrowing.id)}
                              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                              title="Kembalikan buku"
                            >
                              Kembalikan
                            </button>
                          )}
                          
                          <button 
                            onClick={() => handleDelete(borrowing.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Hapus data"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada data peminjaman</h3>
                    <p className="text-gray-500">Coba ubah pencarian atau filter Anda</p>
                    <button
                      onClick={() => {
                        setSearch('')
                        setStatusFilter('all')
                      }}
                      className="mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      Reset filter
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredBorrowings.length > itemsPerPage && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredBorrowings.length)} dari {filteredBorrowings.length} data
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

      {/* Borrowings List - Mobile */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : paginatedBorrowings.length > 0 ? (
          paginatedBorrowings.map((borrowing) => {
            const daysRemaining = getDaysRemaining(borrowing.due_date)
            const isOverdue = new Date(borrowing.due_date) < new Date() && borrowing.status === 'borrowed'
            
            return (
              <div key={borrowing.id} className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{borrowing.borrower_name}</div>
                        <div className="text-sm text-gray-500">{borrowing.borrower_unit}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(borrowing.status, borrowing.due_date)}
                      <button
                        onClick={() => setShowMobileActions(
                          showMobileActions === borrowing.id ? null : borrowing.id
                        )}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* Book Info */}
                  <div className="mb-3">
                    <div className="font-medium text-gray-900 truncate">{borrowing.book?.title}</div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <BookOpen className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{borrowing.book?.author}</span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                      <span>Pinjam: {borrowing.borrow_date}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                      <span className={isOverdue ? 'text-red-600' : ''}>
                        Jatuh tempo: {borrowing.due_date}
                      </span>
                    </div>
                    {borrowing.return_date && (
                      <div className="flex items-center text-green-600">
                        <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>Kembali: {borrowing.return_date}</span>
                      </div>
                    )}
                  </div>

                  {/* Days Remaining */}
                  <div className="flex items-center justify-between">
                    {borrowing.status === 'borrowed' ? (
                      <div className={`flex items-center ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="font-medium">
                          {isOverdue ? `Terlambat ${Math.abs(daysRemaining)} hari` : 
                           daysRemaining > 0 ? `${daysRemaining} hari lagi` : 'Hari ini'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                    
                    <button
                      onClick={() => handleViewDetail(borrowing)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Detail
                    </button>
                  </div>

                  {/* Mobile Actions Dropdown */}
                  {showMobileActions === borrowing.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleViewDetail(borrowing)}
                          className="flex-1 min-w-[120px] px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Lihat Detail</span>
                        </button>
                        
                        {borrowing.status === 'borrowed' && (
                          <button
                            onClick={() => handleReturn(borrowing.id)}
                            className="flex-1 min-w-[120px] px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Kembalikan</span>
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDelete(borrowing.id)}
                          className="flex-1 min-w-[120px] px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada data peminjaman</h3>
            <p className="text-gray-500 text-sm mb-4">Coba ubah pencarian atau filter Anda</p>
            <button
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
              }}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              Reset filter
            </button>
          </div>
        )}

        {/* Pagination - Mobile */}
        {filteredBorrowings.length > itemsPerPage && (
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex flex-col space-y-4">
              <div className="text-sm text-gray-700 text-center">
                Halaman {currentPage} dari {totalPages}
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Sebelumnya</span>
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 3) {
                      pageNum = i + 1
                    } else if (currentPage === 1) {
                      pageNum = i + 1
                    } else if (currentPage === totalPages) {
                      pageNum = totalPages - 2 + i
                    } else {
                      pageNum = currentPage - 1 + i
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
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Selanjutnya</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="text-xs text-gray-500 text-center">
                Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredBorrowings.length)} dari {filteredBorrowings.length} data
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Borrow Modal - Responsive */}
      {showBorrowModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 sm:p-6 border-b z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setShowBorrowModal(false)
                      resetForm()
                    }}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Peminjaman Buku Baru</h3>
                </div>
                <button
                  onClick={() => {
                    setShowBorrowModal(false)
                    resetForm()
                  }}
                  className="hidden md:block p-2 hover:bg-gray-100 rounded-lg"
                >
                  <span className="sr-only">Tutup</span>
                  ×
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Nama Peminjam *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.borrower_name}
                    onChange={(e) => setFormData({...formData, borrower_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nama lengkap"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Kelas/Unit *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.borrower_unit}
                    onChange={(e) => setFormData({...formData, borrower_unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Kelas 10 IPA 1"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Pilih Buku *</label>
                  <select 
                    required
                    value={formData.book_id}
                    onChange={(e) => setFormData({...formData, book_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Pilih buku...</option>
                    {books
                      .filter(book => book.available_copies > 0)
                      .map(book => (
                        <option key={book.id} value={book.id}>
                          {book.book_code} - {book.title} (Tersedia: {book.available_copies})
                        </option>
                      ))}
                  </select>
                  {formData.book_id && (
                    <div className="mt-2 p-2 bg-blue-50 rounded">
                      <p className="text-sm text-blue-700">
                        Buku akan otomatis dikurangi dari stok tersedia
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Tanggal Jatuh Tempo *</label>
                  <input 
                    type="date" 
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maksimal 30 hari dari tanggal pinjam
                  </p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Catatan</label>
                  <textarea 
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2} 
                    placeholder="Catatan peminjaman..."
                  />
                </div>
              </div>
            </form>
            
            <div className="sticky bottom-0 bg-white p-4 sm:p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBorrowModal(false)
                  resetForm()
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg w-full sm:w-auto"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
              >
                Simpan Peminjaman
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal - Responsive */}
      {showDetailModal && selectedBorrowing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 sm:p-6 border-b z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Detail Peminjaman</h3>
                    <p className="text-xs sm:text-sm text-gray-600">ID: {selectedBorrowing.id.substring(0, 8)}...</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="hidden md:block p-2 hover:bg-gray-100 rounded-lg"
                >
                  <span className="sr-only">Tutup</span>
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 space-y-6">
              {/* Borrower Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Informasi Peminjam</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Nama</p>
                    <p className="font-medium text-gray-900">{selectedBorrowing.borrower_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Kelas/Unit</p>
                    <p className="font-medium text-gray-900">{selectedBorrowing.borrower_unit}</p>
                  </div>
                </div>
              </div>

              {/* Book Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Informasi Buku</h4>
                
                {selectedBorrowing.book ? (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Book Cover */}
                      <div className="flex-shrink-0 self-center sm:self-start">
                        {selectedBorrowing.book.cover_url ? (
                          <div className="relative">
                            <img 
                              src={selectedBorrowing.book.cover_url} 
                              alt={selectedBorrowing.book.title}
                              className="w-20 h-28 object-cover rounded-lg shadow-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.parentElement?.querySelector('.cover-fallback');
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                            <div className="cover-fallback hidden w-20 h-28 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                              <BookOpen className="w-8 h-8 text-blue-600" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-20 h-28 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-blue-600" />
                          </div>
                        )}
                      </div>

                      {/* Book Details */}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-gray-900 text-lg truncate">
                          {selectedBorrowing.book.title}
                        </h5>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Penulis:</span> {selectedBorrowing.book.author}
                        </p>
                        
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">Kode Buku</p>
                            <p className="font-medium bg-blue-50 px-2 py-1 rounded inline-block">
                              {selectedBorrowing.book.book_code}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">Penerbit</p>
                            <p className="font-medium truncate">{selectedBorrowing.book.publisher || '-'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">Tahun Terbit</p>
                            <p className="font-medium">{selectedBorrowing.book.publication_year || '-'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">Kategori</p>
                            <p className="font-medium">{selectedBorrowing.book.category || '-'}</p>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <p className="text-xs text-gray-500">Lokasi Rak</p>
                            <p className="font-medium">{selectedBorrowing.book.shelf_location || '-'}</p>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <p className="text-xs text-gray-500">Stok</p>
                            <p className="font-medium">
                              {selectedBorrowing.book.available_copies} / {selectedBorrowing.book.total_copies} tersedia
                            </p>
                          </div>
                        </div>

                        {/* Description */}
                        {selectedBorrowing.book.description && (
                          <div className="mt-4 pt-3 border-t">
                            <p className="text-xs text-gray-500 mb-1">Deskripsi</p>
                            <p className="text-sm text-gray-700 line-clamp-3">
                              {selectedBorrowing.book.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-yellow-800">Informasi buku tidak tersedia</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          Buku dengan ID: <code className="bg-yellow-100 px-2 py-1 rounded">{selectedBorrowing.book_id.substring(0, 8)}...</code> mungkin telah dihapus dari sistem.
                        </p>
                        <div className="mt-2 text-xs text-yellow-600">
                          <p>Informasi peminjaman tetap tersimpan, tetapi detail buku tidak dapat ditampilkan.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Timeline Peminjaman</h4>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <Calendar className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Tanggal Pinjam</p>
                      <p className="text-sm text-gray-600">{selectedBorrowing.borrow_date}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                      new Date(selectedBorrowing.due_date) < new Date() && selectedBorrowing.status === 'borrowed'
                        ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      <Calendar className={`w-4 h-4 ${
                        new Date(selectedBorrowing.due_date) < new Date() && selectedBorrowing.status === 'borrowed'
                          ? 'text-red-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Jatuh Tempo</p>
                      <p className={`text-sm ${
                        new Date(selectedBorrowing.due_date) < new Date() && selectedBorrowing.status === 'borrowed'
                          ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {selectedBorrowing.due_date}
                        {new Date(selectedBorrowing.due_date) < new Date() && selectedBorrowing.status === 'borrowed' && 
                          ' (Terlambat)'}
                      </p>
                    </div>
                  </div>
                  
                  {selectedBorrowing.return_date && (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Tanggal Pengembalian</p>
                        <p className="text-sm text-gray-600">{selectedBorrowing.return_date}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Status</h4>
                  {getStatusBadge(selectedBorrowing.status, selectedBorrowing.due_date)}
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Catatan</h4>
                  <p className="text-sm text-gray-600">
                    {selectedBorrowing.notes || 'Tidak ada catatan'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-6 border-t flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                {selectedBorrowing.status === 'borrowed' && (
                  <button
                    onClick={() => {
                      handleReturn(selectedBorrowing.id)
                      setShowDetailModal(false)
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full sm:w-auto"
                  >
                    Tandai Dikembalikan
                  </button>
                )}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg w-full sm:w-auto"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}