import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Package,
  User,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { FileText } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/books', icon: BookOpen, label: 'Data Buku' },
    { path: '/borrowings', icon: ClipboardList, label: 'Peminjaman' },
    { path: '/inventory', icon: Package, label: 'Inventaris' },
    { path: '/reports', icon: FileText, label: 'Laporan' },
  ]

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-all duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } lg:translate-x-0`}
      >
        {/* Logo & Collapse Button */}
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center px-4' : 'justify-between px-6'} h-16 border-b relative`}>
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              {/* Logo dari folder public */}
              <div className="w-8 h-8 flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt="Logo Sekolah" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const parent = e.currentTarget.parentElement
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                          <div class="text-white text-xs font-bold">SP</div>
                        </div>
                      `
                    }
                  }}
                />
              </div>
              <span className="font-bold text-gray-800 font-serif">Sarana Prasarana</span>
            </div>
          )}

          {sidebarCollapsed && (
            <div className="w-10 h-10 flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Logo Sekolah" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const parent = e.currentTarget.parentElement
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <div class="text-white text-sm font-bold">SP</div>
                      </div>
                    `
                  }
                }}
              />
            </div>
          )}

          {/* Mobile Close Button */}
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="w-6 h-6" />
            </button>
          )}

          {/* Collapse Button - Responsive: Always visible except mobile */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`absolute -right-3 top-1/2 transform -translate-y-1/2 bg-white border border-gray-300 rounded-full p-1 shadow-md hover:bg-gray-50 transition-colors ${
              sidebarCollapsed ? 'lg:block' : 'hidden lg:block'
            }`}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`p-4 ${sidebarCollapsed ? 'px-2' : ''}`}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setSidebarOpen(false)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className={`absolute bottom-0 w-full border-t ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} mb-4`}>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">Administrator</p>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-center space-x-2'} w-full px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors`}
            title={sidebarCollapsed ? "Keluar" : undefined}
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-200 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b shadow-sm px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden mr-4"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Logo dan Nama di Top Bar untuk Mobile */}
            <div className="flex items-center space-x-3 lg:hidden">
              <div className="w-8 h-8 flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt="Logo Sekolah" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const parent = e.currentTarget.parentElement
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                          <div class="text-white text-xs font-bold">SP</div>
                        </div>
                      `
                    }
                  }}
                />
              </div>
              <span className="font-bold text-gray-800">Sarana Prasarana</span>
            </div>
          </div>

          {/* Page Title - Dinamis berdasarkan route */}
          <div className="flex-1 mx-4">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {(() => {
                switch (location.pathname) {
                  case '/dashboard': return 'Dashboard'
                  case '/books': return 'Data Buku'
                  case '/borrowings': return 'Peminjaman'
                  case '/inventory': return 'Inventaris'
                  case '/reports': return 'Laporan'
                  case '/categories': return 'Kategori'
                  default: return 'Dashboard'
                }
              })()}
            </h1>
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:block text-right">
              <p className="font-medium text-gray-800">Administrator</p>
              <p className="text-sm text-gray-500">SD Negeri 022 Pandan Wangi</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}