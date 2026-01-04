import { useState} from 'react'
import { Plus, Search, Filter, Package, CheckCircle, XCircle, AlertTriangle, Eye, Edit, Trash2, Image as ImageIcon, ChevronLeft, ChevronRight, MapPin, Hash, MoreVertical, ArrowLeft, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useInventory } from '../hooks/useInventory'
import { Inventory as InventoryType, storageApi } from '../services/api'

export default function Inventory() {
  const { inventory, isLoading, createInventoryWithImage, updateInventoryWithImage, deleteInventory, refetch } = useInventory()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryType | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showMobileActions, setShowMobileActions] = useState<string | null>(null)
  const itemsPerPage = 10
  
  // Form state
  const [formData, setFormData] = useState({
    item_name: '',
    category: '',
    condition: 'baik' as 'baik' | 'rusak_ringan' | 'rusak_berat' | 'hilang',
    quantity: '1',
    location: '',
    notes: '',
    purchase_date: ''
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)

  // Reset form
  const resetForm = () => {
    setFormData({
      item_name: '',
      category: '',
      condition: 'baik',
      quantity: '1',
      location: '',
      notes: '',
      purchase_date: ''
    })
    setImagePreview(null)
    setSelectedImageFile(null)
  }

  // Handle edit
  const handleEdit = (item: InventoryType) => {
    setSelectedItem(item)
    setFormData({
      item_name: item.item_name,
      category: item.category,
      condition: item.condition,
      quantity: item.quantity.toString(),
      location: item.location || '',
      notes: item.notes || '',
      purchase_date: ''
    })
    setImagePreview(item.image_url)
    setShowEditModal(true)
    setShowMobileActions(null)
  }

  // Handle detail view
  const handleViewDetail = (item: InventoryType) => {
    setSelectedItem(item)
    setShowDetailModal(true)
    setShowMobileActions(null)
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus item ini?')) {
      try {
        await deleteInventory(id)
        toast.success('Item berhasil dihapus')
        setShowMobileActions(null)
      } catch (error) {
        toast.error('Gagal menghapus item')
      }
    }
  }

  // Handle form submit (create with image)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const itemData = {
        item_name: formData.item_name,
        category: formData.category,
        condition: formData.condition,
        quantity: parseInt(formData.quantity),
        location: formData.location || null,
        notes: formData.notes || null
      }
      
      await createInventoryWithImage({
        item: itemData,
        imageFile: selectedImageFile || undefined
      })
      
      setShowAddModal(false)
      resetForm()
      toast.success('Item berhasil ditambahkan')
    } catch (error: any) {
      console.error('Error adding item:', error)
      toast.error(error.message || 'Gagal menambahkan item')
    }
  }

  // Handle update with image
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return
    
    try {
      const updates = {
        item_name: formData.item_name,
        category: formData.category,
        condition: formData.condition,
        quantity: parseInt(formData.quantity),
        location: formData.location || null,
        notes: formData.notes || null,
        image_url: selectedItem.image_url // Keep existing image
      }
      
      await updateInventoryWithImage({
        id: selectedItem.id,
        updates,
        imageFile: selectedImageFile || undefined
      })
      
      setShowEditModal(false)
      resetForm()
      setSelectedItem(null)
      toast.success('Item berhasil diperbarui')
    } catch (error: any) {
      console.error('Error updating item:', error)
      toast.error(error.message || 'Gagal memperbarui item')
    }
  }

  // Filter inventory
  const categories = ['all', ...Array.from(new Set(inventory.map(item => item.category).filter(Boolean) as string[]))]
  
  const filteredItems = inventory.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(search.toLowerCase()) ||
                         (item.location && item.location.toLowerCase().includes(search.toLowerCase())) ||
                         (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()))
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage)

  // Handle image upload preview
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB')
        return
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Hanya file JPEG, PNG, atau WebP yang diperbolehkan')
        return
      }
      
      setSelectedImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Delete image
  const handleDeleteImage = async () => {
    if (selectedItem?.image_url) {
      try {
        await storageApi.deleteImage(selectedItem.image_url)
        // Update inventory item to remove image_url
        await updateInventoryWithImage({
          id: selectedItem.id,
          updates: { image_url: null }
        })
        setImagePreview(null)
        toast.success('Gambar berhasil dihapus')
      } catch (error) {
        toast.error('Gagal menghapus gambar')
      }
    }
  }

  // Get condition badge
  const getConditionBadge = (condition: string) => {
    const styles = {
      baik: 'bg-green-100 text-green-800',
      rusak_ringan: 'bg-yellow-100 text-yellow-800',
      rusak_berat: 'bg-orange-100 text-orange-800',
      hilang: 'bg-red-100 text-red-800'
    }
    const icons = {
      baik: <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />,
      rusak_ringan: <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />,
      rusak_berat: <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />,
      hilang: <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
    }
    
    return (
      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex items-center ${styles[condition as keyof typeof styles]}`}>
        {icons[condition as keyof typeof icons]}
        <span className="hidden sm:inline">
          {condition === 'baik' ? 'Baik' : 
           condition === 'rusak_ringan' ? 'Rusak Ringan' :
           condition === 'rusak_berat' ? 'Rusak Berat' : 'Hilang'}
        </span>
        <span className="sm:hidden">
          {condition === 'baik' ? 'Baik' : 
           condition === 'rusak_ringan' ? 'R. Ringan' :
           condition === 'rusak_berat' ? 'R. Berat' : 'Hilang'}
        </span>
      </span>
    )
  }

  // Get condition stats
  const conditionStats = {
    baik: inventory.filter(i => i.condition === 'baik').length,
    rusak_ringan: inventory.filter(i => i.condition === 'rusak_ringan').length,
    rusak_berat: inventory.filter(i => i.condition === 'rusak_berat').length,
    hilang: inventory.filter(i => i.condition === 'hilang').length
  }

  // Get total quantity
  const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0)

  // Get icon based on category
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Elektronik': '🖥️',
      'Furniture': '🪑',
      'Alat Tulis': '✏️',
      'Buku': '📚',
      'Lainnya': '📦'
    }
    return icons[category] || '📦'
  }

  // Get image URL for display
  // const getImageUrl = (item: InventoryType) => {
    //if (item.image_url) {
      //return item.image_url
    ///}
    
    // Default image based on category
    // return getCategoryIcon(item.category)
  // }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manajemen Inventaris</h1>
          <p className="text-sm sm:text-base text-gray-600">Kelola barang inventaris perpustakaan</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowAddModal(true)
          }}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors w-full md:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm sm:text-base">Tambah Item</span>
        </button>
      </div>

      {/* Stats - Mobile Scrollable */}
      <div className="overflow-x-auto pb-2">
        <div className="flex md:grid md:grid-cols-4 gap-4 min-w-max md:min-w-0">
          <div className="bg-white rounded-xl shadow p-4 min-w-[180px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Item</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{inventory.length}</p>
                <p className="text-xs text-gray-500 mt-1">{categories.length - 1} kategori</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4 min-w-[180px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Kondisi Baik</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{conditionStats.baik}</p>
                <p className="text-xs text-green-600 mt-1">
                  {inventory.length > 0 ? `${Math.round((conditionStats.baik / inventory.length) * 100)}%` : '0%'}
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
                <p className="text-xs sm:text-sm text-gray-500">Perlu Perbaikan</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{conditionStats.rusak_ringan + conditionStats.rusak_berat}</p>
                <p className="text-xs text-yellow-600 mt-1">
                  {inventory.length > 0 ? `${Math.round(((conditionStats.rusak_ringan + conditionStats.rusak_berat) / inventory.length) * 100)}%` : '0%'}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4 min-w-[180px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Kuantitas</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{totalQuantity}</p>
                <p className="text-xs text-gray-500 mt-1">Jumlah keseluruhan</p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                <Hash className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Condition Overview */}
      <div className="bg-white rounded-xl shadow p-4 sm:p-6">
        <h3 className="font-medium text-gray-900 mb-4 text-sm sm:text-base">Overview Kondisi</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {Object.entries(conditionStats).map(([condition, count]) => (
            <div key={condition} className="space-y-1 sm:space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">
                  {condition === 'baik' ? 'Baik' : 
                   condition === 'rusak_ringan' ? 'Rusak Ringan' :
                   condition === 'rusak_berat' ? 'Rusak Berat' : 'Hilang'}
                </span>
                <span className="text-xs sm:text-sm font-medium">{count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                <div 
                  className={`h-1.5 sm:h-2 rounded-full ${
                    condition === 'baik' ? 'bg-green-500' :
                    condition === 'rusak_ringan' ? 'bg-yellow-500' :
                    condition === 'rusak_berat' ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ 
                    width: inventory.length > 0 ? `${(count / inventory.length) * 100}%` : '0%' 
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters - Desktop */}
      <div className="hidden md:block bg-white rounded-xl shadow p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama item atau lokasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
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
              <span className="text-gray-600">Menampilkan: {filteredItems.length} item</span>
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
              placeholder="Cari nama item atau lokasi..."
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
            
            <span className="text-gray-600 text-sm">{filteredItems.length} item</span>
            
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
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
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

      {/* Inventory Table - Desktop */}
      <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preview</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Barang</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kondisi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kuantitas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lokasi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catatan</th>
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
              ) : paginatedItems.length > 0 ? (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.item_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.parentElement!.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center">
                                  <div class="text-2xl">${getCategoryIcon(item.category)}</div>
                                </div>
                              `
                            }}
                          />
                        ) : (
                          <div className="text-2xl">
                            {getCategoryIcon(item.category)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">{item.item_name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            ID: {item.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mr-2">
                          <span className="text-sm">{getCategoryIcon(item.category)}</span>
                        </div>
                        <span className="text-sm text-gray-800">{item.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getConditionBadge(item.condition)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Hash className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-lg font-semibold">{item.quantity}</div>
                          <div className="text-xs text-gray-500">
                            {item.quantity > 10 ? 'Stok banyak' : 
                             item.quantity > 3 ? 'Stok cukup' : 'Stok sedikit'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">{item.location || 'Belum ditentukan'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {item.notes || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleViewDetail(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Lihat detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Hapus"
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
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada item ditemukan</h3>
                    <p className="text-gray-500">Coba ubah pencarian atau filter Anda</p>
                    <button
                      onClick={() => {
                        setSearch('')
                        setCategoryFilter('all')
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
        {filteredItems.length > itemsPerPage && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredItems.length)} dari {filteredItems.length} item
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

      {/* Inventory List - Mobile */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : paginatedItems.length > 0 ? (
          paginatedItems.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4">
                {/* Header with image and actions */}
                <div className="flex items-start gap-3 mb-4">
                  {/* Item Image */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.item_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.parentElement!.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center">
                                <div class="text-xl">${getCategoryIcon(item.category)}</div>
                              </div>
                            `
                          }}
                        />
                      ) : (
                        <div className="text-xl">
                          {getCategoryIcon(item.category)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Item info and actions */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate text-sm">{item.item_name}</h3>
                        <div className="flex items-center mt-1 space-x-2">
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                          {getConditionBadge(item.condition)}
                        </div>
                      </div>
                      <button
                        onClick={() => setShowMobileActions(
                          showMobileActions === item.id ? null : item.id
                        )}
                        className="p-1.5 hover:bg-gray-100 rounded-lg ml-2 flex-shrink-0"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>

                    {/* Quantity and Location */}
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center">
                        <Hash className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                        <span className="text-sm font-semibold">Qty: {item.quantity}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {item.quantity > 10 ? 'Stok banyak' : 
                           item.quantity > 3 ? 'Stok cukup' : 'Stok sedikit'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                        <span className="text-xs text-gray-600 truncate">
                          {item.location || 'Lokasi belum ditentukan'}
                        </span>
                      </div>
                    </div>

                    {/* Notes (truncated) */}
                    {item.notes && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {item.notes}
                        </p>
                      </div>
                    )}

                    {/* Quick actions */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetail(item)}
                        className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs rounded-lg hover:bg-blue-100 flex items-center justify-center"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Detail
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex-1 px-3 py-1.5 bg-green-50 text-green-600 text-xs rounded-lg hover:bg-green-100 flex items-center justify-center"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Actions Dropdown */}
                {showMobileActions === item.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleViewDetail(item)}
                        className="flex-1 min-w-[120px] px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Lihat Detail</span>
                      </button>
                      
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex-1 min-w-[120px] px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit Item</span>
                      </button>
                      
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex-1 min-w-[120px] px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada item ditemukan</h3>
            <p className="text-gray-500 text-sm mb-4">Coba ubah pencarian atau filter Anda</p>
            <button
              onClick={() => {
                setSearch('')
                setCategoryFilter('all')
              }}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              Reset filter
            </button>
          </div>
        )}

        {/* Pagination - Mobile */}
        {filteredItems.length > itemsPerPage && (
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
                Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredItems.length)} dari {filteredItems.length} item
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Item Modal - Responsive */}
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
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Tambah Item Inventaris</h3>
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
                {/* Left Column - Image */}
                <div className="lg:w-1/3">
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 text-center">
                      {imagePreview ? (
                        <div className="relative">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-full h-48 sm:h-56 object-cover rounded-lg mx-auto"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null)
                              setSelectedImageFile(null)
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Upload foto barang</p>
                            <p className="text-xs text-gray-500">JPG, PNG, WebP maks 5MB</p>
                          </div>
                          <label className="inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors text-sm">
                            Pilih Gambar
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2 text-sm">Informasi Status</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Kode Item</span>
                          <span className="text-sm font-medium">Akan dibuat otomatis</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Tanggal Input</span>
                          <span className="text-sm font-medium">
                            {new Date().toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Form */}
                <div className="lg:w-2/3 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Nama Barang *</label>
                      <input
                        type="text"
                        required
                        value={formData.item_name}
                        onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="Nama barang"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Kategori *</label>
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      >
                        <option value="">Pilih kategori...</option>
                        <option value="Elektronik">Elektronik</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Alat Tulis">Alat Tulis</option>
                        <option value="Buku">Buku</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Kondisi *</label>
                      <select
                        required
                        value={formData.condition}
                        onChange={(e) => setFormData({...formData, condition: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      >
                        <option value="baik">Baik</option>
                        <option value="rusak_ringan">Rusak Ringan</option>
                        <option value="rusak_berat">Rusak Berat</option>
                        <option value="hilang">Hilang</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Kuantitas *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="10"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Lokasi</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="Ruang Baca, Lab Komputer, dll."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Tanggal Pembelian</label>
                      <input
                        type="date"
                        value={formData.purchase_date}
                        onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Keterangan</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      rows={3}
                      placeholder="Deskripsi barang, spesifikasi, atau catatan khusus..."
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
                  Simpan Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal - Responsive */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 sm:p-6 border-b z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      resetForm()
                      setSelectedItem(null)
                    }}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Edit Item Inventaris</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">{selectedItem.item_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    resetForm()
                    setSelectedItem(null)
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
                {/* Left Column - Item Info & Image */}
                <div className="lg:w-1/3 space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-medium text-gray-900 mb-3 text-sm">Informasi Item</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">ID Item</p>
                        <p className="font-medium text-sm truncate">{selectedItem.id.substring(0, 12)}...</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Dibuat</p>
                        <p className="text-sm">
                          {new Date(selectedItem.created_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Diupdate</p>
                        <p className="text-sm">
                          {new Date(selectedItem.updated_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Foto Barang</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
                      {imagePreview ? (
                        <div className="relative">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-full h-48 object-cover rounded-lg mx-auto"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(selectedItem.image_url)
                              setSelectedImageFile(null)
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedItem.image_url ? (
                            <div className="relative">
                              <img 
                                src={selectedItem.image_url} 
                                alt={selectedItem.item_name}
                                className="w-full h-48 object-cover rounded-lg mx-auto"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  const fallback = e.currentTarget.parentElement?.querySelector('.image-fallback')
                                  if (fallback) fallback.classList.remove('hidden')
                                }}
                              />
                              <div className="image-fallback hidden w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                                <div className="text-4xl">
                                  {getCategoryIcon(selectedItem.category)}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                              <div className="text-4xl">
                                {getCategoryIcon(selectedItem.category)}
                              </div>
                            </div>
                          )}
                          <label className="inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors text-sm">
                            <Upload className="w-4 h-4 inline mr-2" />
                            Ganti Foto
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                          {selectedItem.image_url && (
                            <button
                              type="button"
                              onClick={handleDeleteImage}
                              className="inline-block px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm"
                            >
                              Hapus Foto
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Form */}
                <div className="lg:w-2/3 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Nama Barang *</label>
                      <input
                        type="text"
                        required
                        value={formData.item_name}
                        onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Kategori *</label>
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      >
                        <option value="Elektronik">Elektronik</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Alat Tulis">Alat Tulis</option>
                        <option value="Buku">Buku</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Kondisi *</label>
                      <select
                        required
                        value={formData.condition}
                        onChange={(e) => setFormData({...formData, condition: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      >
                        <option value="baik">Baik</option>
                        <option value="rusak_ringan">Rusak Ringan</option>
                        <option value="rusak_berat">Rusak Berat</option>
                        <option value="hilang">Hilang</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Kuantitas *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Lokasi</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Tanggal Pembelian</label>
                      <input
                        type="date"
                        value={formData.purchase_date}
                        onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Keterangan</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0">
                <button
                  type="button"
                  onClick={() => handleDelete(selectedItem.id)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg w-full sm:w-auto"
                >
                  Hapus Item
                </button>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      resetForm()
                      setSelectedItem(null)
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg w-full sm:w-auto"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
                  >
                    Update Item
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Item Modal - Responsive */}
      {showDetailModal && selectedItem && (
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
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Detail Item Inventaris</h3>
                    <p className="text-xs sm:text-sm text-gray-600">ID: {selectedItem.id.substring(0, 12)}...</p>
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
                {/* Item Image */}
                <div className="md:w-1/3">
                  <div className="bg-gray-50 rounded-xl p-4 sm:p-6 flex items-center justify-center">
                    <div className="text-center w-full">
                      {selectedItem.image_url ? (
                        <div className="relative">
                          <img 
                            src={selectedItem.image_url} 
                            alt={selectedItem.item_name}
                            className="w-full h-64 object-cover rounded-lg mx-auto"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const fallback = e.currentTarget.parentElement?.querySelector('.detail-image-fallback')
                              if (fallback) fallback.classList.remove('hidden')
                            }}
                          />
                          <div className="detail-image-fallback hidden w-full h-64 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <div className="text-4xl">
                              {getCategoryIcon(selectedItem.category)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-64 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <div className="text-4xl">
                            {getCategoryIcon(selectedItem.category)}
                          </div>
                        </div>
                      )}
                      <p className="text-sm text-gray-500 mt-2">Gambar barang</p>
                    </div>
                  </div>
                  
                  {/* Image Actions */}
                  <div className="mt-4 space-y-2">
                    <label className="block">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </label>
                    {selectedItem.image_url && (
                      <button
                        onClick={handleDeleteImage}
                        className="w-full px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm"
                      >
                        Hapus Gambar
                      </button>
                    )}
                  </div>
                </div>

                {/* Item Details */}
                <div className="md:w-2/3 space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedItem.item_name}</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {selectedItem.category}
                      </div>
                      {getConditionBadge(selectedItem.condition)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Kuantitas</p>
                        <div className="flex items-center">
                          <Hash className="w-5 h-5 text-gray-400 mr-2" />
                          <p className="text-xl sm:text-2xl font-bold">{selectedItem.quantity}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Lokasi</p>
                        <div className="flex items-center">
                          <MapPin className="w-5 h-5 text-gray-400 mr-2" />
                          <p className="text-lg font-medium">{selectedItem.location || 'Belum ditentukan'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-gray-500">Dibuat</span>
                      <span className="text-sm font-medium">
                        {new Date(selectedItem.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-gray-500">Diupdate Terakhir</span>
                      <span className="text-sm font-medium">
                        {new Date(selectedItem.updated_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedItem.notes && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Keterangan</h4>
                      <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-gray-600 whitespace-pre-line text-sm sm:text-base">{selectedItem.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-6 border-t flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={() => {
                        setShowDetailModal(false)
                        handleEdit(selectedItem)
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
                    >
                      Edit Item
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