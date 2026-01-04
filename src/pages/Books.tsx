import { useState} from 'react'
import { Plus, Search, Filter, Edit, Trash2, Eye, BookOpen, Image as ImageIcon, ChevronLeft, ChevronRight, MoreVertical, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useBooks } from '../hooks/useBooks'
import { Book } from '../services/api'
import { supabase } from '../services/supabase'

export default function Books() {
  const { books, isLoading, createBookWithCover, updateBookWithCover, deleteBookCover, deleteBook } = useBooks()  
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [formData, setFormData] = useState({
    book_code: '',
    title: '',
    author: '',
    publisher: '',
    publication_year: '',
    category: '',
    total_copies: '1',
    shelf_location: '',
    description: ''
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showMobileActions, setShowMobileActions] = useState<string | null>(null)
  const itemsPerPage = 10

  // Reset form
  const resetForm = () => {
    setFormData({
      book_code: '',
      title: '',
      author: '',
      publisher: '',
      publication_year: '',
      category: '',
      total_copies: '1',
      shelf_location: '',
      description: ''
    })
    setImagePreview(null)
    setSelectedCoverFile(null)
  }

  // Handle edit
  const handleEdit = (book: Book) => {
    setSelectedBook(book)
    setFormData({
      book_code: book.book_code,
      title: book.title,
      author: book.author,
      publisher: book.publisher || '',
      publication_year: book.publication_year?.toString() || '',
      category: book.category || '',
      total_copies: book.total_copies.toString(),
      shelf_location: book.shelf_location || '',
      description: book.description || ''
    })
    setImagePreview(book.cover_url)
    setShowEditModal(true)
    setShowMobileActions(null)
  }

  // Handle detail view
  const handleViewDetail = (book: Book) => {
    setSelectedBook(book)
    setShowDetailModal(true)
    setShowMobileActions(null)
  }

  // Handle delete
  const handleDelete = async (book: Book) => {
    if (!deleteBook) {
      toast.error('Fungsi hapus buku tidak tersedia');
      return;
    }

    try {
      const { data: activeBorrowings, error } = await supabase
        .from('borrowings')
        .select('id, borrower_name, status')
        .eq('book_id', book.id)
        .eq('status', 'borrowed')
      
      if (error) {
        console.error('Error checking borrowings:', error);
        throw error;
      }
      
      if (activeBorrowings && activeBorrowings.length > 0) {
        const borrowerNames = activeBorrowings.map(b => b.borrower_name).join(', ');
        toast.error(
          `Tidak dapat menghapus "${book.title}" karena ada ${activeBorrowings.length} peminjaman aktif\nPeminjam: ${borrowerNames}`
        );
        return;
      }

      const { data: allBorrowings } = await supabase
        .from('borrowings')
        .select('id, status')
        .eq('book_id', book.id)
      
      const hasBorrowingHistory = allBorrowings && allBorrowings.length > 0;
      
      const message = hasBorrowingHistory 
        ? `Buku "${book.title}" memiliki ${allBorrowings.length} riwayat peminjaman.\nHapus buku dan semua riwayat peminjamannya?`
        : `Apakah Anda yakin ingin menghapus "${book.title}"?`;
      
      if (window.confirm(message)) {
        toast.loading('Menghapus buku...');
        
        await deleteBook(book.id);
        
        toast.dismiss();
        toast.success(`Buku "${book.title}" berhasil dihapus`);
        setShowMobileActions(null);
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      
      if (error.message.includes('foreign key constraint')) {
        toast.error('Buku tidak dapat dihapus karena masih terkait dengan data peminjaman');
      } else if (error.message.includes('peminjaman aktif')) {
        toast.error('Buku memiliki peminjaman aktif');
      } else {
        toast.error(`Gagal menghapus buku: ${error.message || 'Unknown error'}`);
      }
    }
  };

  // Handle form submit with cover
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const bookData = {
        book_code: formData.book_code,
        title: formData.title,
        author: formData.author,
        publisher: formData.publisher || null,
        publication_year: formData.publication_year ? parseInt(formData.publication_year) : null,
        category: formData.category || null,
        total_copies: parseInt(formData.total_copies),
        shelf_location: formData.shelf_location || null,
        description: formData.description || null
      }
      
      await createBookWithCover({
        book: bookData,
        coverFile: selectedCoverFile || undefined
      })
      
      setShowAddModal(false)
      resetForm()
    } catch (error) {
      toast.error('Gagal menambahkan buku')
    }
  }

  // Handle update with cover
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBook) return
    
    try {
      const updates = {
        book_code: formData.book_code,
        title: formData.title,
        author: formData.author,
        publisher: formData.publisher || null,
        publication_year: formData.publication_year ? parseInt(formData.publication_year) : null,
        category: formData.category || null,
        total_copies: parseInt(formData.total_copies),
        shelf_location: formData.shelf_location || null,
        description: formData.description || null
      }
      
      await updateBookWithCover({
        id: selectedBook.id,
        updates,
        coverFile: selectedCoverFile || undefined
      })
      
      setShowEditModal(false)
      resetForm()
      setSelectedBook(null)
    } catch (error) {
      toast.error('Gagal memperbarui buku')
    }
  }

  // Handle cover upload
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB')
        return
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Hanya file JPEG, PNG, atau WebP yang diperbolehkan')
        return
      }
      
      setSelectedCoverFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Delete cover
  const handleDeleteCover = async () => {
    if (selectedBook?.cover_url) {
      try {
        await deleteBookCover(selectedBook.cover_url)
        await updateBookWithCover({
          id: selectedBook.id,
          updates: { cover_url: null }
        })
        setImagePreview(null)
        toast.success('Cover buku berhasil dihapus')
      } catch (error) {
        toast.error('Gagal menghapus cover')
      }
    }
  }

  // Get cover URL
  const getCoverUrl = (book: any) => {
    if (book.cover_url) {
      return book.cover_url
    }
    
    const defaultCovers: Record<string, string> = {
      'Pelajaran': '📚',
      'Fiksi': '📖',
      'Sains': '🔬',
      'Sejarah': '🏛️',
      'Seni': '🎨',
      'Teknologi': '💻'
    }
    
    return defaultCovers[book.category] || '📘'
  }

  // Filter books
  const categories = ['all', ...Array.from(new Set(books.map(book => book.category).filter(Boolean) as string[]))]
  
  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(search.toLowerCase()) ||
                         book.author.toLowerCase().includes(search.toLowerCase()) ||
                         book.book_code.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || book.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Pagination
  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedBooks = filteredBooks.slice(startIndex, startIndex + itemsPerPage)

  // Get book condition color
  const getAvailabilityColor = (available: number, total: number) => {
    const percentage = (available / total) * 100
    if (percentage > 70) return 'bg-green-500'
    if (percentage > 30) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  // Get category badge color
  const getCategoryColor = (category: string | null) => {
    const colors: Record<string, string> = {
      'Pelajaran': 'bg-blue-100 text-blue-800',
      'Fiksi': 'bg-purple-100 text-purple-800',
      'Sains': 'bg-green-100 text-green-800',
      'Sejarah': 'bg-amber-100 text-amber-800',
      'Seni': 'bg-pink-100 text-pink-800',
      'Teknologi': 'bg-indigo-100 text-indigo-800'
    }
    return colors[category || ''] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manajemen Buku</h1>
          <p className="text-sm sm:text-base text-gray-600">Kelola koleksi buku perpustakaan</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowAddModal(true)
          }}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors w-full md:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm sm:text-base">Tambah Buku</span>
        </button>
      </div>

      {/* Stats - Mobile Scrollable */}
      <div className="overflow-x-auto pb-2">
        <div className="flex md:grid md:grid-cols-4 gap-4 min-w-max md:min-w-0">
          <div className="bg-white rounded-xl shadow p-4 min-w-[180px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Buku</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{books.length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4 min-w-[180px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Eksemplar</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">
                  {books.reduce((sum, book) => sum + book.total_copies, 0)}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4 min-w-[180px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Tersedia</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">
                  {books.reduce((sum, book) => sum + book.available_copies, 0)}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4 min-w-[180px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Kategori</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">
                  {new Set(books.map(book => book.category).filter(Boolean)).size}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-orange-100 rounded-lg">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Desktop */}
      <div className="hidden md:block bg-white rounded-xl shadow p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari judul, penulis, atau kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Semua Kategori' : cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-x-4">
              <span className="text-gray-600">Total: {filteredBooks.length} buku</span>
              <span className="text-green-600 text-sm">
                Tersedia: {filteredBooks.reduce((sum, book) => sum + book.available_copies, 0)}
              </span>
            </div>
            <button
              onClick={() => window.location.reload()}
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
              placeholder="Cari judul, penulis, atau kode..."
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
            
            <span className="text-gray-600 text-sm">{filteredBooks.length} buku</span>
            
            <button
              onClick={() => window.location.reload()}
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
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'Semua Kategori' : cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Books Table - Desktop */}
      <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cover</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Judul Buku</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Penulis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lokasi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : paginatedBooks.length > 0 ? (
                paginatedBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {book.cover_url ? (
                        <div className="w-12 h-16 overflow-hidden rounded">
                          <img 
                            src={book.cover_url} 
                            alt={book.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.parentElement!.innerHTML = `
                                <div class="w-12 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded flex items-center justify-center">
                                  <div class="text-2xl">${getCoverUrl(book)}</div>
                                </div>
                              `
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded flex items-center justify-center">
                          <div className="text-2xl">
                            {getCoverUrl(book)}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-medium text-blue-600">{book.book_code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 line-clamp-1">{book.title}</div>
                        <div className="text-xs text-gray-500">
                          {book.publication_year && `Tahun: ${book.publication_year}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{book.author}</div>
                      <div className="text-xs text-gray-500">{book.publisher}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(book.category)}`}>
                        {book.category || 'Tidak ada kategori'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${getAvailabilityColor(book.available_copies, book.total_copies)}`}
                              style={{ width: `${(book.available_copies / book.total_copies) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium">
                            {book.available_copies}/{book.total_copies}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {book.available_copies === 0 ? 'Stok habis' : 
                           book.available_copies < 3 ? 'Stok menipis' : 'Stok tersedia'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <BookOpen className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm">{book.shelf_location || 'Belum ditentukan'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleViewDetail(book)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Lihat detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(book)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(book)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Hapus"
                          disabled={book.available_copies !== book.total_copies}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada buku ditemukan</h3>
                    <p className="text-gray-500">Coba ubah pencarian atau filter Anda</p>
                    <button
                      onClick={() => {
                        setSearch('')
                        setSelectedCategory('all')
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

        {/* Pagination - Desktop */}
        {filteredBooks.length > itemsPerPage && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredBooks.length)} dari {filteredBooks.length} buku
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

      {/* Books List - Mobile */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : paginatedBooks.length > 0 ? (
          paginatedBooks.map((book) => (
            <div key={book.id} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4">
                {/* Header with cover and actions */}
                <div className="flex items-start gap-3 mb-4">
                  {/* Cover */}
                  <div className="flex-shrink-0">
                    {book.cover_url ? (
                      <div className="w-16 h-20 overflow-hidden rounded-lg">
                        <img 
                          src={book.cover_url} 
                          alt={book.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.parentElement!.innerHTML = `
                              <div class="w-16 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
                                <div class="text-xl">${getCoverUrl(book)}</div>
                              </div>
                            `
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
                        <div className="text-xl">
                          {getCoverUrl(book)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Book info and actions */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate text-sm">{book.title}</h3>
                        <div className="flex items-center mt-1">
                          <span className="font-mono text-xs text-blue-600 mr-2">{book.book_code}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getCategoryColor(book.category)}`}>
                            {book.category || '-'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowMobileActions(
                          showMobileActions === book.id ? null : book.id
                        )}
                        className="p-1.5 hover:bg-gray-100 rounded-lg ml-2 flex-shrink-0"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>

                    {/* Author and publisher */}
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 truncate">Oleh: {book.author}</p>
                      {book.publisher && (
                        <p className="text-xs text-gray-500 truncate">Penerbit: {book.publisher}</p>
                      )}
                      {book.publication_year && (
                        <p className="text-xs text-gray-500">Tahun: {book.publication_year}</p>
                      )}
                    </div>

                    {/* Stock info */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">Stok:</span>
                        <span className={`text-xs font-bold ${
                          book.available_copies === 0 ? 'text-red-600' :
                          book.available_copies < 3 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {book.available_copies}/{book.total_copies}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${getAvailabilityColor(book.available_copies, book.total_copies)}`}
                          style={{ width: `${(book.available_copies / book.total_copies) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {book.available_copies === 0 ? 'Stok habis' : 
                         book.available_copies < 3 ? 'Stok menipis' : 'Stok tersedia'}
                      </p>
                    </div>

                    {/* Location */}
                    <div className="flex items-center text-xs text-gray-600 mb-4">
                      <BookOpen className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{book.shelf_location || 'Lokasi belum ditentukan'}</span>
                    </div>

                    {/* Quick actions */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetail(book)}
                        className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs rounded-lg hover:bg-blue-100 flex items-center justify-center"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Detail
                      </button>
                      <button
                        onClick={() => handleEdit(book)}
                        className="flex-1 px-3 py-1.5 bg-green-50 text-green-600 text-xs rounded-lg hover:bg-green-100 flex items-center justify-center"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Actions Dropdown */}
                {showMobileActions === book.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleViewDetail(book)}
                        className="flex-1 min-w-[120px] px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Lihat Detail</span>
                      </button>
                      
                      <button
                        onClick={() => handleEdit(book)}
                        className="flex-1 min-w-[120px] px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit Buku</span>
                      </button>
                      
                      <button
                        onClick={() => handleDelete(book)}
                        className="flex-1 min-w-[120px] px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={book.available_copies !== book.total_copies}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Hapus</span>
                      </button>
                    </div>
                    {book.available_copies !== book.total_copies && (
                      <p className="text-xs text-red-600 mt-2 text-center">
                        Tidak dapat dihapus, ada buku yang dipinjam
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada buku ditemukan</h3>
            <p className="text-gray-500 text-sm mb-4">Coba ubah pencarian atau filter Anda</p>
            <button
              onClick={() => {
                setSearch('')
                setSelectedCategory('all')
              }}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              Reset filter
            </button>
          </div>
        )}

        {/* Pagination - Mobile */}
        {filteredBooks.length > itemsPerPage && (
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
                        className={`w-8 h-8 text-sm rounded-lg ${
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
                Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredBooks.length)} dari {filteredBooks.length} buku
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Book Modal - Responsive */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 sm:p-6 border-b z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      resetForm()
                    }}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Tambah Buku Baru</h3>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="hidden md:block p-2 hover:bg-gray-100 rounded-lg"
                >
                  <span className="sr-only">Tutup</span>
                  ×
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Column - Book Cover */}
                <div className="lg:w-1/3">
                  <div className="space-y-4">
                    {/* Cover Upload Section */}
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                      {imagePreview ? (
                        <div className="relative">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-40 h-56 sm:w-48 sm:h-64 object-cover rounded-lg mx-auto"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null)
                              setSelectedCoverFile(null)
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Upload cover buku</p>
                            <p className="text-xs text-gray-500">JPG, PNG, WebP maks 5MB</p>
                          </div>
                          <label className="inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors text-sm">
                            Pilih Cover
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleCoverUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2 text-sm">Status</h4>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                          <span className="text-sm">Buku baru</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Stok tersedia akan sama dengan jumlah total
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Form */}
                <div className="lg:w-2/3 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Kode Buku *</label>
                      <input
                        type="text"
                        required
                        value={formData.book_code}
                        onChange={(e) => setFormData({...formData, book_code: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="B001"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Judul Buku *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="Masukkan judul"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Penulis *</label>
                      <input
                        type="text"
                        required
                        value={formData.author}
                        onChange={(e) => setFormData({...formData, author: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="Nama penulis"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Penerbit</label>
                      <input
                        type="text"
                        value={formData.publisher}
                        onChange={(e) => setFormData({...formData, publisher: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="Nama penerbit"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Tahun Terbit</label>
                      <input
                        type="number"
                        value={formData.publication_year}
                        onChange={(e) => setFormData({...formData, publication_year: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="2024"
                        min="1900"
                        max="2100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Kategori</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="Pelajaran, Fiksi, dll."
                        list="categories"
                      />
                      <datalist id="categories">
                        {categories.filter(cat => cat !== 'all').map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Jumlah Total *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.total_copies}
                        onChange={(e) => setFormData({...formData, total_copies: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="10"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Lokasi Rak</label>
                      <input
                        type="text"
                        value={formData.shelf_location}
                        onChange={(e) => setFormData({...formData, shelf_location: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="Rak A1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      rows={3}
                      placeholder="Deskripsi buku..."
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg w-full sm:w-auto"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
                >
                  Simpan Buku
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Book Modal - Responsive */}
      {showEditModal && selectedBook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 sm:p-6 border-b z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      resetForm()
                      setSelectedBook(null)
                    }}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Edit Buku</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">{selectedBook.book_code} - {selectedBook.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    resetForm()
                    setSelectedBook(null)
                  }}
                  className="hidden md:block p-2 hover:bg-gray-100 rounded-lg"
                >
                  <span className="sr-only">Tutup</span>
                  ×
                </button>
              </div>
            </div>
            
            <form onSubmit={handleUpdate} className="p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Column - Book Info */}
                <div className="lg:w-1/3 space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-medium text-gray-900 mb-3 text-sm">Informasi Buku</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Kode</p>
                        <p className="font-medium text-sm">{selectedBook.book_code}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Dibuat</p>
                        <p className="text-sm">{new Date(selectedBook.created_at).toLocaleDateString('id-ID')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status Stok</p>
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${
                            selectedBook.available_copies === 0 ? 'bg-red-500' :
                            selectedBook.available_copies < 3 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}></div>
                          <span className="text-sm">
                            {selectedBook.available_copies === 0 ? 'Stok habis' : 
                             selectedBook.available_copies < 3 ? 'Stok menipis' : 'Stok tersedia'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cover Buku</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
                      {imagePreview ? (
                        <div className="relative">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-40 h-56 sm:w-48 sm:h-64 object-cover rounded-lg mx-auto"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null)
                              setSelectedCoverFile(null)
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Upload cover buku</p>
                            <p className="text-xs text-gray-500">JPG, PNG, WebP maks 5MB</p>
                          </div>
                          <label className="inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors text-sm">
                            Pilih Cover
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleCoverUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Form */}
                <div className="lg:w-2/3 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Kode Buku *</label>
                      <input
                        type="text"
                        required
                        value={formData.book_code}
                        onChange={(e) => setFormData({...formData, book_code: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Judul Buku *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Penulis *</label>
                      <input
                        type="text"
                        required
                        value={formData.author}
                        onChange={(e) => setFormData({...formData, author: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Penerbit</label>
                      <input
                        type="text"
                        value={formData.publisher}
                        onChange={(e) => setFormData({...formData, publisher: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Tahun Terbit</label>
                      <input
                        type="number"
                        value={formData.publication_year}
                        onChange={(e) => setFormData({...formData, publication_year: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        min="1900"
                        max="2100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Kategori</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        list="edit-categories"
                      />
                      <datalist id="edit-categories">
                        {categories.filter(cat => cat !== 'all').map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Jumlah Total *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.total_copies}
                        onChange={(e) => setFormData({...formData, total_copies: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Tersedia: {selectedBook.available_copies} eksemplar
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Lokasi Rak</label>
                      <input
                        type="text"
                        value={formData.shelf_location}
                        onChange={(e) => setFormData({...formData, shelf_location: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0">
                <button
                  type="button"
                  onClick={() => handleDelete(selectedBook)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg w-full sm:w-auto"
                  disabled={selectedBook.available_copies !== selectedBook.total_copies}
                >
                  Hapus Buku
                </button>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      resetForm()
                      setSelectedBook(null)
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg w-full sm:w-auto"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
                  >
                    Update Buku
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal - Responsive */}
      {showDetailModal && selectedBook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
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
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Detail Buku</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{selectedBook.book_code}</p>
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
            
            <div className="p-4 sm:p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Book Cover */}
                <div className="md:w-1/3">
                  <div className="bg-gray-50 rounded-xl p-6 flex items-center justify-center">
                    {selectedBook.cover_url ? (
                      <img 
                        src={selectedBook.cover_url} 
                        alt={selectedBook.title}
                        className="w-48 h-64 object-cover rounded-lg shadow-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.parentElement!.innerHTML = `
                            <div class="w-48 h-64 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
                              <div class="text-4xl">${getCoverUrl(selectedBook)}</div>
                            </div>
                          `
                        }}
                      />
                    ) : (
                      <div className="w-48 h-64 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
                        <div className="text-4xl">
                          {getCoverUrl(selectedBook)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Cover Actions */}
                  <div className="mt-4 space-y-2">
                    <label className="block">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleCoverUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </label>
                    {selectedBook.cover_url && (
                      <button
                        onClick={handleDeleteCover}
                        className="w-full px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm"
                      >
                        Hapus Cover
                      </button>
                    )}
                  </div>
                </div>

                {/* Book Details */}
                <div className="md:w-2/3 space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedBook.title}</h2>
                    <p className="text-base sm:text-lg text-gray-600 mt-1">oleh {selectedBook.author}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Kode Buku</p>
                      <p className="font-medium text-gray-900">{selectedBook.book_code}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Penerbit</p>
                      <p className="font-medium text-gray-900">{selectedBook.publisher || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Tahun Terbit</p>
                      <p className="font-medium text-gray-900">{selectedBook.publication_year || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Kategori</p>
                      <p className="font-medium text-gray-900">{selectedBook.category || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Lokasi Rak</p>
                      <p className="font-medium text-gray-900">{selectedBook.shelf_location || 'Belum ditentukan'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Dibuat</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedBook.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>

                  {/* Stock Information */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Informasi Stok</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Total Eksemplar</p>
                        <p className="text-xl sm:text-2xl font-bold">{selectedBook.total_copies}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Tersedia</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-600">
                          {selectedBook.available_copies}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Tersedia</span>
                        <span>{Math.round((selectedBook.available_copies / selectedBook.total_copies) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getAvailabilityColor(selectedBook.available_copies, selectedBook.total_copies)}`}
                          style={{ width: `${(selectedBook.available_copies / selectedBook.total_copies) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedBook.description && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Deskripsi</h4>
                      <p className="text-gray-600 whitespace-pre-line text-sm sm:text-base">{selectedBook.description}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-6 border-t flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={() => {
                        setShowDetailModal(false)
                        handleEdit(selectedBook)
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
                    >
                      Edit Buku
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}