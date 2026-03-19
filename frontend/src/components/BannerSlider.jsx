import { useState, useEffect } from 'react'

export default function BannerSlider({ banners }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!banners.length) return
    const t = setInterval(() => setCurrent((c) => (c + 1) % banners.length), 4000)
    return () => clearInterval(t)
  }, [banners.length])

  if (!banners.length) return (
    <div className="w-full h-64 rounded-2xl shimmer" />
  )

  const b = banners[current]

  return (
    <div className="relative w-full rounded-2xl overflow-hidden h-52 sm:h-64 md:h-72
      bg-darkCard border border-darkBorder">

      {/* BG */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${b.image_url})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-darkBg/95 via-darkBg/70 to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-6 sm:px-10 max-w-md">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 w-fit
          bg-primary/20 text-primary border border-primary/30">
          Aksiya
        </span>
        <h2 className="text-xl sm:text-3xl font-black text-white leading-tight mb-3">
          {b.title}
        </h2>
        <span className="inline-block px-4 py-2 rounded-full text-sm font-black text-white w-fit
          bg-gradient-to-r from-orange to-orange/80">
          Buyurtma berish →
        </span>
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {banners.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width:           i === current ? 20 : 6,
              height:          6,
              backgroundColor: i === current ? '#7C6FFF' : '#2A2A3D',
            }}
          />
        ))}
      </div>
    </div>
  )
}