import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

const getFavCount = () => {
  try { return JSON.parse(localStorage.getItem('favorites') || '[]').length }
  catch { return 0 }
}

export default function Navbar({ onSearch, onOpenFavs }) {
  const [query,    setQuery]    = useState('')
  const [favCount, setFavCount] = useState(getFavCount())
  const [scrolled, setScrolled] = useState(false)
  const { token, role, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const h = () => setFavCount(getFavCount())
    window.addEventListener('favoritesChanged', h)
    return () => window.removeEventListener('favoritesChanged', h)
  }, [])

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <nav className={`sticky top-0 z-50 h-20 transition-all duration-300 ${
      scrolled ? 'bg-[#0B0F1A]/90 backdrop-blur-2xl' : 'bg-transparent backdrop-blur-md'
    }`}
      style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
      <div className="absolute inset-x-0 bottom-0 h-px"
        style={{background: 'linear-gradient(90deg, transparent, rgba(124,92,255,0.3), rgba(0,212,255,0.3), transparent)'}} />

      <div className="max-w-[1440px] mx-auto px-6 h-full flex items-center gap-6">

        {/* Logo spacer — sidebar bilan mos */}
        <div className="w-[260px] shrink-0 flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl blur-md opacity-60"
              style={{background: 'linear-gradient(135deg, #7C5CFF, #00D4FF)'}} />
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center"
              style={{background: 'linear-gradient(135deg, #7C5CFF, #00D4FF)'}}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Resto<span style={{background: 'linear-gradient(90deg, #7C5CFF, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>AI</span>
          </span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-[500px]">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{color: '#8A8FB9'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={query}
              onChange={(e) => { setQuery(e.target.value); onSearch?.(e.target.value) }}
              placeholder="Taom qidiring..."
              className="w-full h-12 pl-11 pr-5 text-sm text-white outline-none transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '999px',
                color: '#fff',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(124,92,255,0.5)'; e.target.style.boxShadow = '0 0 20px rgba(124,92,255,0.15)' }}
              onBlur={(e)  => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }}
            />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-3 shrink-0">

          {/* Yoqtirganlar */}
          <button onClick={onOpenFavs}
            className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
            style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)'}}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,80,80,0.4)'; e.currentTarget.style.background = 'rgba(255,80,80,0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}>
            <svg className="w-4 h-4" style={{color: favCount > 0 ? '#FF6B6B' : '#8A8FB9'}}
              fill={favCount > 0 ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {favCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                {favCount}
              </span>
            )}
          </button>

          {/* Role links */}
          {token && role === 'admin'  && <Link to="/admin"  className="hidden sm:block text-xs font-semibold px-3 py-1.5 rounded-full transition-all" style={{background: 'rgba(124,92,255,0.12)', border: '1px solid rgba(124,92,255,0.25)', color: '#A78BFA'}}>Admin</Link>}
          {token && role === 'waiter' && <Link to="/waiter" className="hidden sm:block text-xs font-semibold px-3 py-1.5 rounded-full transition-all" style={{background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#67E8F9'}}>Ofitsiant</Link>}
          {token && role === 'chef'   && <Link to="/chef"   className="hidden sm:block text-xs font-semibold px-3 py-1.5 rounded-full transition-all" style={{background: 'rgba(255,138,0,0.1)', border: '1px solid rgba(255,138,0,0.25)', color: '#FDB27A'}}>Oshpaz</Link>}

          {/* Login / Logout */}
          {token ? (
            <button onClick={async () => { await logout(); navigate('/login') }}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
              style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)'}}>
              <svg className="w-4 h-4" style={{color: '#8A8FB9'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          ) : (
            <Link to="/login"
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #7C5CFF, #00D4FF)',
                boxShadow: '0 0 20px rgba(124,92,255,0.5)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 35px rgba(124,92,255,0.7)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 20px rgba(124,92,255,0.5)'; e.currentTarget.style.transform = 'translateY(0)' }}>
              Kirish
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}