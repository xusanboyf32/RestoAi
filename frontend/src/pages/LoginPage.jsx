import { useState }    from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore    from '../store/useAuthStore'
import ThemeToggle     from '../components/ThemeToggle'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const { login }  = useAuthStore()
  const navigate   = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const role = await login(username, password)
      if      (role === 'admin')  navigate('/admin')
      else if (role === 'waiter') navigate('/waiter')
      else if (role === 'chef')   navigate('/chef')
    } catch (err) {
 if (err.response?.status === 429) {
    setError("Juda ko'p urinish! 1 daqiqa kuting ⏳")
  } else {
    setError(err.response?.data?.detail || "Username yoki parol noto'g'ri")
  }    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-darkBg px-4">
      <div className="fixed top-4 right-4"><ThemeToggle /></div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-orange
            flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-black">R</span>
          </div>
          <h1 className="text-2xl font-black text-white">RestoAI</h1>
          <p className="text-textSecond text-sm mt-1">Tizimga kiring</p>
        </div>

        <div className="bg-darkCard border border-darkBorder rounded-2xl p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-textSecond mb-1.5 block">
                Foydalanuvchi nomi
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors
                  bg-darkBg border border-darkBorder text-white placeholder-textMuted
                  focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-textSecond mb-1.5 block">
                Parol
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors
                  bg-darkBg border border-darkBorder text-white placeholder-textMuted
                  focus:border-primary"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30
                px-3 py-2 rounded-xl">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-black transition-all
                bg-gradient-to-r from-primary to-primaryHover text-white
                hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Kirilmoqda...' : 'Kirish →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-textMuted mt-4">Faqat xodimlar uchun</p>
      </div>
    </div>
  )
}