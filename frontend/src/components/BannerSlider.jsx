import { useState, useEffect, useCallback } from 'react'

export default function BannerSlider({ banners, onOrderClick }) {
  const [current, setCurrent] = useState(0)
  const [transitioning, setTransitioning] = useState(false)

  const goTo = useCallback((idx) => {
    if (transitioning) return
    setTransitioning(true)
    setTimeout(() => { setCurrent(idx); setTransitioning(false) }, 300)
  }, [transitioning])

  useEffect(() => {
    if (!banners.length) return
    const t = setInterval(() => goTo((current + 1) % banners.length), 4500)
    return () => clearInterval(t)
  }, [banners.length, current, goTo])

  if (!banners.length) return (
    <div className="w-full h-56 sm:h-72 rounded-2xl shimmer border border-darkBorder" />
  )

  const b = banners[current]

  return (
    <div className="relative w-full rounded-2xl overflow-hidden h-52 sm:h-68 md:h-72 border border-darkBorder shadow-card">
      <div className="absolute inset-0">
        <img src={b.image_url} alt={b.title}
          className={`w-full h-full object-cover transition-opacity duration-500 ${transitioning ? 'opacity-0' : 'opacity-100'}`} />
        <div className="absolute inset-0 bg-gradient-to-r from-darkBg via-darkBg/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-darkBg/80 via-transparent to-transparent" />
      </div>
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(rgba(79,142,247,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(79,142,247,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className={`relative z-10 h-full flex flex-col justify-center px-7 sm:px-12 max-w-lg transition-all duration-500 ${transitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 w-fit bg-primary/15 text-primary border border-primary/25 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Aksiya
        </span>
        <h2 className="text-2xl sm:text-4xl font-display font-bold text-white leading-tight mb-4 drop-shadow-lg">
          {b.title}
        </h2>
        {/* ← faqat shu o'zgardi */}
        <button
          onClick={() => onOrderClick?.()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white w-fit bg-gradient-to-r from-orange to-orange/80 hover:from-orange/90 hover:to-orange/70 transition-all duration-200 shadow-orange hover:scale-105 active:scale-95">
          Buyurtma berish
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </div>
      <div className="absolute bottom-4 left-7 sm:left-12 flex gap-2 z-10">
        {banners.map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${i === current ? 'w-6 h-2 bg-primary shadow-glow-sm' : 'w-2 h-2 bg-darkBorder hover:bg-textMuted'}`} />
        ))}
      </div>
      {banners.length > 1 && (
        <>
          <button onClick={() => goTo((current - 1 + banners.length) % banners.length)}
            className="absolute right-14 bottom-3 z-10 w-8 h-8 rounded-lg glass flex items-center justify-center hover:border-primary/50 transition-all">
            <svg className="w-4 h-4 text-textSecond" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => goTo((current + 1) % banners.length)}
            className="absolute right-4 bottom-3 z-10 w-8 h-8 rounded-lg glass flex items-center justify-center hover:border-primary/50 transition-all">
            <svg className="w-4 h-4 text-textSecond" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}