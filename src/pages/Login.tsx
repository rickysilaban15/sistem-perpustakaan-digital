import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Email dan password harus diisi')
      return
    }
    
    setLoading(true)
    
    try {
      await signIn(email, password)
      toast.success('Login berhasil!')
    } catch (error: any) {
      console.error('Login error:', error)
      
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email atau password salah')
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Email belum dikonfirmasi')
      } else if (error.message.includes('Network')) {
        toast.error('Koneksi jaringan bermasalah')
      } else {
        toast.error('Login gagal: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image from public folder */}
      <div className="absolute inset-0 z-0">
        <img 
          src="bg/bg-login.jpg" 
          alt="Background" 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback jika background tidak ditemukan
            e.currentTarget.style.display = 'none'
            const parent = e.currentTarget.parentElement
            if (parent) {
              parent.innerHTML = `
                <div class="w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-violet-900"></div>
              `
            }
          }}
        />
        {/* Overlay untuk meningkatkan readability */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-md relative z-10">
    
<div className="text-center mb-8">
  <div className="inline-flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/10 backdrop-blur-md mb-6 shadow-xl">
    <img 
      src="/logo.png" 
      alt="Logo Sekolah" 
      className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
      onError={(e) => {
        e.currentTarget.style.display = 'none'
        const parent = e.currentTarget.parentElement
        if (parent) {
          parent.innerHTML = `
            <div class="w-full h-full flex items-center justify-center">
              <div class="text-white font-bold text-2xl sm:text-3xl">SDN</div>
            </div>
          `
        }
      }}
    />
  </div>
  {/* TEKS HURUF KAPITAL SEMUA DENGAN FONT CLASSIC */}
  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-wide font-serif italic">SISTEM PERPUSTAKAAN</h1>
  <p className="text-white/90 text-lg sm:text-xl font-medium tracking-wide font-serif italic">SD NEGERI 022 PANDAN WANGI</p>
</div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8">
          

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-blue-300" />
                  <span>Email</span>
                </div>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                placeholder="admin@sekolah.edu"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                <div className="flex items-center">
                  <Lock className="w-4 h-4 mr-2 text-blue-300" />
                  <span>Password</span>
                </div>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                placeholder="Masukkan password"
                required
              />
            </div>

            

            <button
  type="submit"
  disabled={loading}
  className="w-full bg-gradient-to-r from-gray-800 to-black text-white py-3.5 px-4 rounded-xl font-semibold hover:from-gray-900 hover:to-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
>
  {loading ? (
    <span className="flex items-center justify-center">
      <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      </svg>
      Memproses...
    </span>
  ) : 'MASUK KE SISTEM'}
</button>
          </form>

        <div className="mt-6 pt-4 border-t border-white/10">
  <p className="text-center text-white/50 text-xs font-serif italic">
    &copy; {new Date().getFullYear()} SD NEGERI 022 PANDAN WANGI
    <span className="mx-2"></span>
  </p>
</div>
        </div>
      </div>
    </div>
  )
}