import { useState } from 'react'
import { Plus, Search, Filter, Tag, Edit, Trash2, BookOpen, Package } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Categories() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  const categories = [
    { id: 1, name: 'Pelajaran', type: 'buku', count: 45, description: 'Buku pelajaran sekolah' },
    { id: 2, name: 'Fiksi', type: 'buku', count: 120, description: 'Novel dan cerita fiksi' },
    { id: 3, name: 'Sains', type: 'buku', count: 78, description: 'Buku sains dan teknologi' },
    { id: 4, name: 'Sejarah', type: 'buku', count: 56, description: 'Buku sejarah dan budaya' },
    { id: 5, name: 'Elektronik', type: 'inventaris', count: 25, description: 'Alat elektronik' },
    { id: 6, name: 'Furniture', type: 'inventaris', count: 35, description: 'Perabotan dan furniture' },
    { id: 7, name: 'Alat Tulis', type: 'inventaris', count: 42, description: 'Alat tulis kantor' },
  ]

  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(search.toLowerCase()) ||
                         cat.description.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || cat.type === typeFilter
    return matchesSearch && matchesType
  })

  const handleDelete = (_id: number) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus kategori ini?')) {
      toast.success('Kategori berhasil dihapus')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Kategori</h1>
          <p className="text-gray-600">Kelola kategori buku dan inventaris</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah Kategori</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">Semua Tipe</option>
              <option value="buku">Kategori Buku</option>
              <option value="inventaris">Kategori Inventaris</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Total: {filteredCategories.length} kategori</span>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCategories.map((category) => (
          <div key={category.id} className="bg-white rounded-xl shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg ${
                category.type === 'buku' ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                {category.type === 'buku' ? (
                  <BookOpen className="w-6 h-6 text-blue-600" />
                ) : (
                  <Package className="w-6 h-6 text-green-600" />
                )}
              </div>
              <div className="flex space-x-2">
                <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(category.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
            <p className="text-gray-600 text-sm mb-4">{category.description}</p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Tag className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-500">
                  {category.type === 'buku' ? 'Buku' : 'Inventaris'}
                </span>
              </div>
              <div className="text-lg font-bold">
                {category.count}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada kategori ditemukan</h3>
          <p className="text-gray-500">Coba ubah pencarian atau filter Anda</p>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Tambah Kategori Baru</h3>
            </div>
            
            <form className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kategori</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Nama kategori" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="buku">Kategori Buku</option>
                  <option value="inventaris">Kategori Inventaris</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={3} placeholder="Deskripsi kategori..." />
              </div>
            </form>
            
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  toast.success('Kategori berhasil ditambahkan')
                  setShowAddModal(false)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Simpan Kategori
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}