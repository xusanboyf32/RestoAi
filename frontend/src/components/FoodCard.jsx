import { useState, useEffect } from 'react'
import useCartStore from '../store/useCartStore'

const fmt = (n) => Number(n).toLocaleString('uz-UZ')
const getFavorites  = () => { try { return JSON.parse(localStorage.getItem('favorites') || '[]') } catch { return [] } }
const saveFavorites = (ids) => localStorage.setItem('favorites', JSON.stringify(ids))

export default function FoodCard({ food, onOpenDetail, avgRating }) {
  const [isFav, setIsFav] = useState(false)
  const add           = useCartStore((s) => s.add)
  const isUnavailable = food.availability === 'unavailable'
  const displayPrice  = food.discounted_price ?? food.price

  useEffect(() => { setIsFav(getFavorites().includes(food.id)) }, [food.id])

  const handleFav = (e) => {
    e.stopPropagation()
    const favs    = getFavorites()
    const newFavs = favs.includes(food.id) ? favs.filter((id) => id !== food.id) : [...favs, food.id]
    saveFavorites(newFavs)
    setIsFav(newFavs.includes(food.id))
    window.dispatchEvent(new Event('favoritesChanged'))
  }

  return (
    <div onClick={() => !isUnavailable && onOpenDetail?.(food)}
      className={`group relative rounded-2xl overflow-hidden bg-darkCard border border-darkBorder transition-all hover:border-primary/40 cursor-pointer ${isUnavailable ? 'opacity-50' : ''}`}>

      <div className="relative h-44 overflow-hidden">
        <img
          src={food.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'}
          alt={food.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {food.is_sale && food.discount_percent && (
          <span className="absolute top-2 left-2 bg-orange text-white text-xs font-black px-2.5 py-1 rounded-full">
            -{food.discount_percent}%
          </span>
        )}
        {isUnavailable && (
          <div className="absolute inset-0 bg-darkBg/70 flex items-center justify-center">
            <span className="text-white text-xs font-black bg-darkCard/80 px-3 py-1 rounded-full border border-darkBorder">Mavjud emas</span>
          </div>
        )}
        <button onClick={handleFav}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-darkBg/80 backdrop-blur-sm border border-darkBorder flex items-center justify-center transition-all hover:border-red-400/50">
          <svg className={`w-4 h-4 transition-colors ${isFav ? 'text-red-400' : 'text-textSecond'}`}
            fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      <div className="p-3">
        <h3 className="font-bold text-white text-sm mb-1 truncate">{food.name}</h3>

        {/* Reyting + info */}
        <div className="flex items-center gap-1.5 mb-2">
          {avgRating ? (
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-xs">★</span>
              <span className="text-white text-xs font-bold">{avgRating}</span>
            </div>
          ) : null}
          {food.weight_grams && <span className="text-xs px-1.5 py-0.5 rounded-full bg-darkBg text-textMuted border border-darkBorder">{food.weight_grams}g</span>}
          {food.calories     && <span className="text-xs px-1.5 py-0.5 rounded-full bg-darkBg text-textMuted border border-darkBorder">{food.calories} kcal</span>}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="font-black text-primary text-base">{fmt(displayPrice)} so'm</span>
          {food.is_sale && food.discounted_price && (
            <span className="text-xs text-textMuted line-through">{fmt(food.price)}</span>
          )}
        </div>

        <button onClick={(e) => { e.stopPropagation(); !isUnavailable && add(food) }} disabled={isUnavailable}
          className="w-full py-2 rounded-full text-sm font-bold bg-primary hover:bg-primaryHover text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all">
          + Buyurtma
        </button>
      </div>
    </div>
  )
}