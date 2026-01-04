import { BookOpen, ClipboardList, Package, Clock, TrendingUp, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useDashboard } from '../hooks/useDashboard'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { 
    stats, 
    recentBorrowings, 
    monthlyStats, 
    categoryStats, 
    popularBooks, 
    isLoading 
  } = useDashboard()

  const statsData = [
    { 
      title: 'Total Buku', 
      value: stats?.totalBooks || 0, 
      icon: BookOpen, 
      color: 'bg-blue-500',
      change: '+12%',
      link: '/books',
      trend: 'up'
    },
    { 
      title: 'Buku Tersedia', 
      value: stats?.availableBooks || 0, 
      icon: BookOpen, 
      color: 'bg-green-500',
      change: '+8%',
      link: '/books',
      trend: 'up'
    },
    { 
      title: 'Peminjaman Aktif', 
      value: stats?.activeBorrowings || 0, 
      icon: ClipboardList, 
      color: 'bg-orange-500',
      change: '-3%',
      link: '/borrowings',
      trend: 'down'
    },
    { 
      title: 'Terlambat', 
      value: stats?.overdueBorrowings || 0, 
      icon: Clock, 
      color: 'bg-red-500',
      change: '+2%',
      link: '/borrowings',
      trend: 'up'
    },
    { 
      title: 'Total Peminjaman', 
      value: stats?.totalBorrowings || 0, 
      icon: Users, 
      color: 'bg-purple-500',
      change: '+15%',
      link: '/borrowings',
      trend: 'up'
    },
    { 
      title: 'Inventaris', 
      value: stats?.totalInventory || 0, 
      icon: Package, 
      color: 'bg-indigo-500',
      change: '+5%',
      link: '/inventory',
      trend: 'up'
    },
  ]

  // Warna untuk kategori
  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 text-white flex-1">
          <h1 className="text-2xl font-bold">Selamat Datang, Admin!</h1>
          <p className="text-gray-300 mt-2">Kelola perpustakaan sekolah dengan mudah dan efisien</p>
          <p className="text-gray-400 text-sm mt-2">
            Sistem terupdate: {new Date().toLocaleDateString('id-ID')}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsData.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="bg-white rounded-xl shadow p-5 hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500">{stat.title}</p>
                <div className="flex items-end justify-between mt-2">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center space-x-1">
                    <span className={`text-xs ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                    {stat.trend === 'up' ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
              <div className={`${stat.color} p-3 rounded-lg ml-4`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts Grid - Sederhana */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Statistik Bulanan - Simple Bar Chart */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Statistik Bulanan</h2>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-72">
            {monthlyStats && monthlyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="peminjaman" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                    name="Peminjaman"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">Tidak ada data bulanan</p>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 text-center mt-2">
            Data peminjaman 6 bulan terakhir
          </div>
        </div>

        {/* Distribusi Kategori - Simple List */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Distribusi Kategori Buku</h2>
            <BookOpen className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {categoryStats && categoryStats.length > 0 ? (
              categoryStats.slice(0, 6).map((item, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-3" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-gray-600">{item.value}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="h-2 rounded-full"
                        style={{ 
                          width: `${item.value}%`,
                          backgroundColor: COLORS[index % COLORS.length]
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Tidak ada data kategori</p>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-4">
            Total {categoryStats?.length || 0} kategori buku
          </div>
        </div>
      </div>

      {/* Buku Terpopuler dan Peminjaman Terbaru dalam Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Buku Terpopuler */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Buku Terpopuler</h2>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {popularBooks && popularBooks.length > 0 ? (
              popularBooks.slice(0, 5).map((book, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{book.title}</p>
                      <p className="text-sm text-gray-500 truncate">{book.author}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{book.borrowed}</p>
                    <p className="text-xs text-gray-500">dipinjam</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Tidak ada data buku terpopuler</p>
              </div>
            )}
          </div>
        </div>

        {/* Peminjaman Terbaru */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Peminjaman Terbaru</h2>
            <ClipboardList className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : recentBorrowings && recentBorrowings.length > 0 ? (
              recentBorrowings.slice(0, 5).map((borrowing, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate mr-2">{borrowing.borrower_name}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        borrowing.status === 'borrowed' ? 'bg-blue-100 text-blue-800' :
                        borrowing.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {borrowing.status === 'borrowed' ? 'Dipinjam' : 
                         borrowing.status === 'overdue' ? 'Terlambat' : 'Dikembalikan'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {borrowing.book?.title || 'Tidak diketahui'}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <span>{borrowing.borrow_date}</span>
                      {borrowing.created_at && (
                        <>
                          <span className="mx-2">•</span>
                          <span>
                            {new Date(borrowing.created_at).toLocaleTimeString('id-ID', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Tidak ada data peminjaman</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}