import { useState, useEffect } from 'react'
import useCartStore from '../store/useCartStore'

const fmt = (n) => Number(n).toLocaleString('uz-UZ')
const getFavorites  = () => { try { return JSON.parse(localStorage.getItem('favorites') || '[]') } catch { return [] } }
const saveFavorites = (ids) => localStorage.setItem('favorites', JSON.stringify(ids))

export default function FoodCard({ food, onOpenDetail, avgRating, onAdd }) {  const [isFav, setIsFav]       = useState(false)
  const [adding, setAdding]     = useState(false)
  const add           = useCartStore((s) => s.add)
  const isUnavailable = food.availability === 'unavailable'
  const displayPrice  = food.discounted_price ?? food.price

  useEffect(() => { setIsFav(getFavorites().includes(food.id)) }, [food.id])

  const handleFav = (e) => {
    e.stopPropagation()
    const favs    = getFavorites()
    const newFavs = favs.includes(food.id)
      ? favs.filter((id) => id !== food.id)
      : [...favs, food.id]
    saveFavorites(newFavs)
    setIsFav(newFavs.includes(food.id))
    window.dispatchEvent(new Event('favoritesChanged'))
  }

  const handleAdd = (e) => {
    e.stopPropagation()
    if (isUnavailable) return
    setAdding(true)
    add(food)
    onAdd?.(food, e)
    setTimeout(() => setAdding(false), 600)
  }


  return (
    <div
      onClick={() => !isUnavailable && onOpenDetail?.(food)}
      className={`group relative rounded-2xl overflow-hidden bg-darkCard border border-darkBorder
        card-hover cursor-pointer flex flex-col ${isUnavailable ? 'opacity-50' : ''}`}>

      {/* ── Image ── */}
      <div className="relative overflow-hidden" style={{ height: '160px' }}>
        <img
          src={food.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=320&fit=crop'}
          alt={food.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-600"
          loading="lazy"
        />

        {/* Dark overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-darkCard/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {food.is_sale && food.discount_percent && (
            <span className="bg-orange text-white text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-orange">
              -{food.discount_percent}%
            </span>
          )}
          {isUnavailable && (
            <span className="bg-darkBg/90 text-textMuted text-[11px] font-bold px-2 py-0.5 rounded-lg border border-darkBorder">
              Mavjud emas
            </span>
          )}
        </div>

        {/* Fav button */}
        <button onClick={handleFav}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-xl flex items-center justify-center
            transition-all duration-200 backdrop-blur-sm border
            ${isFav
              ? 'bg-red-500/20 border-red-500/50 text-red-400'
              : 'bg-darkBg/70 border-darkBorder text-textSecond hover:border-red-400/50 hover:text-red-400'
            }`}>
          <svg className="w-4 h-4" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* ── Info ── */}
      <div className="flex flex-col flex-1 p-3">
        <h3 className="font-bold text-white text-sm mb-1.5 truncate leading-snug">{food.name}</h3>

        {/* Meta row */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          {avgRating && (
            <div className="flex items-center gap-1 bg-gold/10 border border-gold/20 rounded-lg px-1.5 py-0.5">
              <svg className="w-3 h-3 text-gold" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-gold text-[11px] font-bold">{avgRating}</span>
            </div>
          )}
          {food.weight_grams && (
            <span className="text-[11px] text-textMuted bg-darkMuted border border-darkBorder rounded-lg px-1.5 py-0.5">
              {food.weight_grams}g
            </span>
          )}
          {food.calories && (
            <span className="text-[11px] text-textMuted bg-darkMuted border border-darkBorder rounded-lg px-1.5 py-0.5">
              {food.calories} kcal
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-bold text-primary text-base">{fmt(displayPrice)} so'm</span>
          {food.is_sale && food.discounted_price && (
            <span className="text-xs text-textMuted line-through">{fmt(food.price)}</span>
          )}
        </div>

        {/* Add button */}
        <button
          onClick={handleAdd}
          disabled={isUnavailable}
          className={`mt-auto w-full py-2 rounded-xl text-sm font-bold transition-all duration-200
            ${adding
              ? 'bg-teal text-white scale-95'
              : 'bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-white hover:border-primary hover:shadow-glow-sm'
            }
            disabled:opacity-40 disabled:cursor-not-allowed`}>
          {adding
            ? <span className="flex items-center justify-center gap-1.5">✓ Qo'shildi</span>
            : <span className="flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Savatga
              </span>
          }
        </button>
      </div>
    </div>
  )
}