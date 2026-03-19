import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ThemeToggle  from './ThemeToggle'
import useAuthStore from '../store/useAuthStore'
import useCartStore from '../store/useCartStore'

const getFavCount = () => { try { return JSON.parse(localStorage.getItem('favorites') || '[]').length } catch { return 0 } }

export default function Navbar({ onSearch, onOpenFavs }) {
  const [query,    setQuery]    = useState('')
  const [favCount, setFavCount] = useState(getFavCount())
  const { token, role, logout } = useAuthStore()
  const totalQty = useCartStore((s) => s.totalQty())
  const navigate = useNavigate()

  useEffect(() => {
    const handler = () => setFavCount(getFavCount())
    window.addEventListener('favoritesChanged', handler)
    return () => window.removeEventListener('favoritesChanged', handler)
  }, [])

  const handleSearch = (e) => { setQuery(e.target.value); onSearch?.(e.target.value) }
  const handleLogout = async () => { await logout(); navigate('/login') }

  return (
    <nav className="sticky top-0 z-50 w-full bg-darkBg border-b border-darkBorder">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange flex items-center justify-center">
            <span className="text-white text-sm font-black">R</span>
          </div>
          <span className="text-lg font-black text-white tracking-tight hidden sm:block">RestoAI</span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-lg mx-auto">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={query} onChange={handleSearch} placeholder="Qidiring..."
              className="w-full pl-9 pr-4 py-2 rounded-full text-sm outline-none bg-darkCard border border-darkBorder text-white placeholder-textMuted focus:border-primary transition-colors" />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />

          {/* Yoqtirganlarim */}
          <button onClick={onOpenFavs}
            className="relative w-9 h-9 rounded-full bg-darkCard border border-darkBorder flex items-center justify-center hover:border-red-400/50 transition-all">
            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {favCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-400 text-white text-xs font-black flex items-center justify-center leading-none">{favCount}</span>
            )}
          </button>

          {token ? (
            <div className="flex items-center gap-2">
              {role === 'admin'  && <Link to="/admin"  className="text-xs font-bold px-3 py-1.5 rounded-full bg-primary text-white">Admin</Link>}
              {role === 'waiter' && <Link to="/waiter" className="text-xs font-bold px-3 py-1.5 rounded-full bg-teal text-white">Ofitsiant</Link>}
              {role === 'chef'   && <Link to="/chef"   className="text-xs font-bold px-3 py-1.5 rounded-full bg-orange text-white">Oshpaz</Link>}
              <button onClick={handleLogout}
                className="text-xs font-bold px-3 py-1.5 rounded-full border border-darkBorder text-textSecond hover:border-primary transition-colors">
                Chiqish
              </button>
            </div>
          ) : (
            <Link to="/login"
              className="px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-primary to-primaryHover text-white hover:opacity-90 transition-opacity">
              Kirish
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}