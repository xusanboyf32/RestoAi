// src/pages/CustomerPage.jsx
import { useState, useEffect, useCallback } from 'react'
import Navbar       from '../components/Navbar'
import BannerSlider from '../components/BannerSlider'
import AiChatPanel  from '../components/AiChatPanel'
import CartModal    from '../components/CartModal'
import useCartStore from '../store/useCartStore'
import axios        from '../api/axios'
import { getCategories, getBanners, getMenuItems } from '../api/menuApi'
import { scanQr } from '../api/tableApi'

const LIMIT = 25
const fmt   = (n) => Number(n).toLocaleString('uz-UZ')

const getFavorites  = () => { try { return JSON.parse(localStorage.getItem('favorites') || '[]') } catch { return [] } }
const saveFavorites = (ids) => localStorage.setItem('favorites', JSON.stringify(ids))

const ANIM_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

@keyframes float1 { 0%,100%{transform:translateY(0) translateX(0)} 33%{transform:translateY(-28px) translateX(10px)} 66%{transform:translateY(-10px) translateX(-6px)} }
@keyframes float2 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-38px) translateX(-14px)} }
@keyframes float3 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-18px) translateX(16px)} }
@keyframes pulse-glow { 0%,100%{opacity:0.1;transform:scale(1)} 50%{opacity:0.3;transform:scale(1.18)} }
@keyframes ai-pulse { 0%,100%{box-shadow:0 0 20px rgba(124,92,255,0.5),0 0 40px rgba(0,212,255,0.25)} 50%{box-shadow:0 0 45px rgba(124,92,255,0.95),0 0 90px rgba(0,212,255,0.55)} }
@keyframes card-in { from{opacity:0;transform:translateY(22px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes cart-pulse { 0%,100%{box-shadow:0 0 25px rgba(124,92,255,0.55)} 50%{box-shadow:0 0 50px rgba(124,92,255,0.9),0 0 100px rgba(0,212,255,0.4)} }
@keyframes chip-hover { 0%{transform:translateY(0) scale(1)} 100%{transform:translateY(-3px) scale(1.04)} }

.no-scrollbar::-webkit-scrollbar{display:none}
.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}

/* ═══ FOOD CARD ═══ */
.food-card {
  transition: transform 0.32s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.32s ease, border-color 0.32s ease;
}
.food-card:hover {
  transform: scale(1.04) translateY(-6px) !important;
  box-shadow: 0 24px 70px rgba(124,92,255,0.28), 0 0 0 1.5px rgba(124,92,255,0.5) !important;
}
.food-card:hover .food-img {
  transform: scale(1.12) !important;
  filter: brightness(1.08) saturate(1.1);
}

/* ═══ SALE CARD ═══ */
.sale-card {
  transition: transform 0.28s ease, box-shadow 0.28s ease;
}
.sale-card:hover {
  transform: translateY(-6px) scale(1.04) !important;
  box-shadow: 0 20px 50px rgba(255,138,0,0.3), 0 0 0 1.5px rgba(255,138,0,0.6) !important;
}

/* ═══ SIDEBAR CAT BTN ═══ */
.cat-btn {
  transition: all 0.2s ease;
}
.cat-btn:hover {
  transform: translateX(3px);
  color: #fff !important;
  background: rgba(124,92,255,0.12) !important;
  box-shadow: inset 0 0 20px rgba(124,92,255,0.18), 4px 0 16px rgba(124,92,255,0.12) !important;
  border-color: rgba(124,92,255,0.22) !important;
}

/* ═══ HORIZONTAL CHIP ═══ */
.h-chip {
  transition: all 0.2s ease;
  white-space: nowrap;
}
.h-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(124,92,255,0.25), inset 0 0 18px rgba(124,92,255,0.15) !important;
}
.h-chip:active { transform: scale(0.98); }
/* ═══ ADD BTN ═══ */
.add-btn {
  background: linear-gradient(135deg, #7C5CFF, #00D4FF);
  background-size: 200% 200%;
  transition: all 0.3s ease;
}
.add-btn:hover {
  background-position: right center;
  box-shadow: 0 0 30px rgba(124,92,255,0.7) !important;
  transform: translateY(-1px);
}

/* ═══ FAV ═══ */
.fav-btn { transition: transform 0.18s ease; }
.fav-btn:hover { transform: scale(1.28) rotate(-5deg); }
.fav-btn:active { transform: scale(0.85); }

/* ═══ RELATED CARD ═══ */
.related-card {
  transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
}
.related-card:hover {
  transform: translateY(-8px) scale(1.03) !important;
  box-shadow: 0 20px 50px rgba(124,92,255,0.25), 0 0 0 1px rgba(124,92,255,0.4) !important;
}
.related-card:hover .related-img {
  transform: scale(1.1) !important;
}

/* ═══ DETAIL IMG ═══ */
.detail-main-img {
  transition: transform 0.6s ease;
}
.detail-main-img:hover {
  transform: scale(1.03);
}

/* ═══ FOOTER ═══ */
.footer-link {
  color: rgba(255,255,255,0.4);
  font-size: 12px;
  transition: color 0.2s;
  text-decoration: none;
  cursor: pointer;
}
.footer-link:hover { color: rgba(255,255,255,0.8); }
`

/* ══════════════ STAR RATING ══════════════ */
function StarRating({ value, onChange, size = 'sm' }) {
  const [hover, setHover] = useState(0)
  const sz = size === 'lg' ? 'text-2xl' : 'text-sm'
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <button key={s} type="button"
          onClick={() => onChange?.(s)}
          onMouseEnter={() => onChange && setHover(s)}
          onMouseLeave={() => onChange && setHover(0)}
          className={`${sz} transition-transform ${onChange ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}>
          <span style={{
            color: s <= (hover || value) ? '#FFC107' : 'rgba(255,255,255,0.12)',
            textShadow: s <= (hover || value) ? '0 0 10px rgba(255,193,7,0.6)' : 'none',
          }}>
            {s <= (hover || value) ? '★' : '☆'}
          </span>
        </button>
      ))}
    </div>
  )
}

/* ══════════════ FOOD CARD ══════════════ */
function FoodCard({ food, avgRating, onOpen, onAdd, index = 0 }) {
  const [isFav,  setIsFav]  = useState(false)
  const [adding, setAdding] = useState(false)
  const isUnavail = food.availability === 'unavailable'
  const price     = food.discounted_price ?? food.price

  useEffect(() => { setIsFav(getFavorites().includes(food.id)) }, [food.id])

  const toggleFav = (e) => {
    e.stopPropagation()
    const favs = getFavorites()
    const next = favs.includes(food.id) ? favs.filter((x) => x !== food.id) : [...favs, food.id]
    saveFavorites(next); setIsFav(next.includes(food.id))
    window.dispatchEvent(new Event('favoritesChanged'))
  }

  const handleAdd = (e) => {
    e.stopPropagation()
    if (isUnavail) return
    setAdding(true); onAdd(food)
    setTimeout(() => setAdding(false), 900)
  }

  return (
    <div
      onClick={() => !isUnavail && onOpen(food)}
      className={`food-card relative rounded-2xl overflow-hidden cursor-pointer flex flex-col ${isUnavail ? 'opacity-35' : ''}`}
      style={{
        background: 'linear-gradient(160deg, rgba(22,16,45,0.88) 0%, rgba(10,12,24,0.92) 100%)',
        border: '1px solid rgba(124,92,255,0.14)',
        backdropFilter: 'blur(22px)',
        boxShadow: '0 4px 28px rgba(0,0,0,0.55)',
        animation: `card-in 0.45s ease ${index * 0.05}s both`,
      }}>

      {/* Shimmer top line */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:'1px', zIndex:2,
        background:'linear-gradient(90deg, transparent, rgba(124,92,255,0.5), rgba(0,212,255,0.3), transparent)',
      }} />

      {/* Rasm */}
      <div className="relative overflow-hidden shrink-0" style={{height:'180px'}}>
        <img
          src={food.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop'}
          alt={food.name}
          className="food-img w-full h-full object-cover"
          style={{transition:'transform 0.7s ease, filter 0.4s ease', transform:'scale(1)'}}
          loading="lazy"
        />
        <div className="absolute inset-0" style={{background:'linear-gradient(to top, rgba(5,3,18,0.95) 0%, rgba(5,3,18,0.25) 55%, transparent 100%)'}} />

        {food.is_sale && food.discounted_price && (
          <span className="absolute top-3 left-3 text-xs font-black px-2.5 py-1 rounded-lg text-white"
            style={{
              background:'linear-gradient(135deg, #FF6D00, #FF9A3C)',
              boxShadow:'0 0 18px rgba(255,109,0,0.7), 0 0 35px rgba(255,109,0,0.3)',
              letterSpacing:'0.04em', fontFamily:"'Syne', sans-serif",
            }}>
            -{food.discount_percent}%
          </span>
        )}

        <button onClick={toggleFav} className="fav-btn absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background: isFav ? 'rgba(255,80,80,0.2)' : 'rgba(5,3,18,0.6)',
            border: `1px solid ${isFav ? 'rgba(255,80,80,0.55)' : 'rgba(255,255,255,0.09)'}`,
            backdropFilter: 'blur(12px)',
            boxShadow: isFav ? '0 0 18px rgba(255,80,80,0.45)' : 'none',
          }}>
          <svg className="w-4 h-4" fill={isFav ? '#FF6B6B' : 'none'} stroke={isFav ? '#FF6B6B' : 'rgba(255,255,255,0.7)'} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        {/* Rating overlay on image */}
        {avgRating && (
          <div className="absolute bottom-2 left-3 flex items-center gap-1 px-2 py-0.5 rounded-lg"
            style={{background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,193,7,0.2)'}}>
            <span style={{color:'#FFC107', fontSize:'11px', textShadow:'0 0 8px rgba(255,193,7,0.7)'}}>★</span>
            <span className="text-xs font-bold" style={{color:'#FFC107'}}>{avgRating}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-white font-bold text-sm mb-1 truncate"
          style={{fontFamily:"'Syne', sans-serif", letterSpacing:'0.01em', textShadow:'0 0 15px rgba(124,92,255,0.25)'}}>
          {food.name}
        </h3>

        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {food.calories && (
            <span className="text-xs px-2 py-0.5 rounded-lg"
              style={{background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.06)'}}>
              {food.calories} kal
            </span>
          )}
          {food.weight_grams && (
            <span className="text-xs px-2 py-0.5 rounded-lg"
              style={{background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.06)'}}>
              {food.weight_grams}g
            </span>
          )}
        </div>

        <div className="mb-3">
          <p className="font-black text-base leading-none"
            style={{
              color:'#fff', fontFamily:"'Syne', sans-serif",
              background:'linear-gradient(135deg, #fff, rgba(180,160,255,0.85))',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>
            {fmt(price)} so'm
          </p>
          {food.is_sale && food.discounted_price && (
            <p className="text-xs mt-0.5 line-through" style={{color:'rgba(255,255,255,0.2)'}}>
              {fmt(food.price)} so'm
            </p>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={isUnavail}
          className="add-btn mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
          style={{
            background: adding ? 'linear-gradient(135deg, #00C48C, #00D4AA)' : undefined,
            boxShadow: adding ? '0 0 22px rgba(0,196,140,0.55)' : '0 0 16px rgba(124,92,255,0.4)',
            animation: adding ? 'none' : undefined,
            fontFamily:"'Syne', sans-serif",
          }}>
          {adding ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Qo'shildi!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Savatga
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/* ══════════════ FOOTER ══════════════ */
function Footer() {
  return (
    <footer style={{
      marginTop: '60px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      background: 'linear-gradient(180deg, transparent 0%, rgba(10,6,24,0.8) 100%)',
      backdropFilter: 'blur(20px)',
    }}>
      {/* App download section */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '40px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '20px',
      }}>
        <div>
          <p style={{color:'#fff', fontWeight:700, fontSize:'18px', fontFamily:"'Syne', sans-serif", marginBottom:'6px'}}>
            Ilovada yanada qulayroq
          </p>
          <p style={{color:'rgba(255,255,255,0.35)', fontSize:'13px'}}>Buyurtma bering, kuzatib boring</p>
        </div>
        <div style={{display:'flex', gap:'10px'}}>
          {[
            {icon:'🍎', label:'App Store'},
            {icon:'▶️', label:'Play Store'},
          ].map((s) => (
            <button key={s.label} style={{
              display:'flex', alignItems:'center', gap:'8px',
              padding:'10px 18px', borderRadius:'12px', cursor:'pointer',
              background:'rgba(255,255,255,0.05)',
              border:'1px solid rgba(255,255,255,0.1)',
              color:'rgba(255,255,255,0.7)', fontSize:'13px', fontWeight:600,
              transition:'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background='rgba(124,92,255,0.15)'; e.currentTarget.style.borderColor='rgba(124,92,255,0.3)'; e.currentTarget.style.color='#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; e.currentTarget.style.color='rgba(255,255,255,0.7)' }}>
              <span style={{fontSize:'16px'}}>{s.icon}</span>
              <span style={{fontFamily:"'DM Sans', sans-serif"}}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Links */}
      <div style={{padding:'32px', textAlign:'center'}}>
        <p style={{
          color:'rgba(255,255,255,0.5)', fontSize:'13px', fontWeight:700,
          fontFamily:"'Syne', sans-serif", marginBottom:'16px', letterSpacing:'0.05em',
        }}>
          Kompaniya haqida
        </p>
        <div style={{display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'8px 20px', marginBottom:'16px'}}>
          {['Foydalanuvchi kelishuvi','Kontaktlar','Yetkazish','Savol-javoblar','Hamkorlik qilish','Kuryerlik qilish'].map((t) => (
            <span key={t} className="footer-link">{t}</span>
          ))}
        </div>
        <div style={{display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'8px 20px', marginBottom:'24px'}}>
          {['Biznes uchun taom','Plastikni qayta ishlash','Yandex Go ilovasi orqali taom buyurtma qilish','✉️ Aloqa'].map((t) => (
            <span key={t} className="footer-link">{t}</span>
          ))}
        </div>
        {/* Divider */}
        <div style={{height:'1px', background:'linear-gradient(90deg, transparent, rgba(124,92,255,0.2), transparent)', marginBottom:'20px'}} />
        <p style={{color:'rgba(255,255,255,0.2)', fontSize:'12px', fontFamily:"'DM Sans', sans-serif"}}>
          © 2023–2026 RestoAI · Barcha huquqlar himoyalangan
        </p>
      </div>
    </footer>
  )
}

/* ══════════════ MAIN PAGE ══════════════ */
export default function CustomerPage() {
  const [categories,       setCategories]       = useState([])
  const [banners,          setBanners]          = useState([])
  const [foods,            setFoods]            = useState([])
  const [saleItems,        setSaleItems]        = useState([])
  const [foodRatings,      setFoodRatings]      = useState({})
  const [activeCategoryId, setActiveCategoryId] = useState(null)
  const [activeCatName,    setActiveCatName]    = useState('Hammasi')
  const [searchQuery,      setSearchQuery]      = useState('')
  const [page,             setPage]             = useState(1)
  const [totalPages,       setTotalPages]       = useState(1)
  const [loading,          setLoading]          = useState(false)
  const [cartOpen,         setCartOpen]         = useState(false)
  const [pendingRating,    setPendingRating]    = useState(false)

  const [detailFood,     setDetailFood]     = useState(null)
  const [relatedFoods,   setRelatedFoods]   = useState([])
  const [reviews,        setReviews]        = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [newComment,     setNewComment]     = useState('')
  const [newStars,       setNewStars]       = useState(0)
  const [sending,        setSending]        = useState(false)
  const [likedReviews,   setLikedReviews]   = useState({})
  const [detailIsFav,    setDetailIsFav]    = useState(false)

  const [showFavs, setShowFavs] = useState(false)
  const [favFoods, setFavFoods] = useState([])

  const [showQrModal, setShowQrModal] = useState(false)
  const [qrInput,     setQrInput]     = useState('')
  const [qrLoading,   setQrLoading]   = useState(false)
  const [qrError,     setQrError]     = useState('')
  const [sessionId,   setSessionId]   = useState(null)
  const [tableNumber, setTableNumber] = useState(null)

  const { setSession, add, items, totalPrice, totalQty } = useCartStore((s) => ({
    setSession: s.setSession, add: s.add, items: s.items,
    totalPrice: s.totalPrice(), totalQty: s.totalQty(),
  }))

  const GLASS = {
    background: 'linear-gradient(160deg, rgba(18,12,38,0.75) 0%, rgba(10,12,28,0.82) 100%)',
    backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
    border: '1px solid rgba(124,92,255,0.12)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
  }

  const catIcons = { main:'🍽️', soup:'🍲', salad:'🥗', side:'🍚', snack:'🥨', dessert:'🍰', drink:'🥤', bread:'🍞', sauce:'🫙' }

  // ─── CATEGORY LIST (sidebar + chips uchun) ───
  const allCats = [{ id: null, name: 'Hammasi', emoji: '🍽️' }, ...categories]

  useEffect(() => {
    const s = localStorage.getItem('table_session_id')
    const t = localStorage.getItem('table_number')
    if (s) { setSessionId(Number(s)); setTableNumber(t); setSession(Number(s)) }
    if (localStorage.getItem('pending_rating_order_id')) setPendingRating(true)
  }, [])

  useEffect(() => {
    const h = () => { if (showFavs) setFavFoods(foods.filter((f) => getFavorites().includes(f.id))) }
    window.addEventListener('favoritesChanged', h)
    return () => window.removeEventListener('favoritesChanged', h)
  }, [showFavs, foods])

  useEffect(() => {
    getCategories().then((r) => setCategories(r.data))
    getBanners().then((r)    => setBanners(r.data))
    getMenuItems({ page: 1, limit: 20, is_sale: true })
      .then((r) => setSaleItems(r.data.items.filter((f) => f.is_sale && f.discounted_price)))
      .catch(() => {})
  }, [])

  const fetchFoods = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getMenuItems({
        page, limit: LIMIT,
        ...(activeCategoryId && { category_id: activeCategoryId }),
        ...(searchQuery       && { search: searchQuery }),
      })
      setFoods(res.data.items)
      setTotalPages(res.data.total_pages)
      const map = {}
      res.data.items.forEach((i) => { if (i.avg_rating) map[i.id] = String(i.avg_rating) })
      setFoodRatings((prev) => ({ ...prev, ...map }))
    } catch { setFoods([]) }
    finally { setLoading(false) }
  }, [page, activeCategoryId, searchQuery])

  useEffect(() => { fetchFoods() }, [fetchFoods])

  const calcAvg = (revs) => {
    const r = revs.filter((x) => x.rating > 0)
    return r.length ? (r.reduce((s, x) => s + x.rating, 0) / r.length).toFixed(1) : null
  }

  const handleOpenDetail = async (food) => {
    setDetailFood(food); setNewComment(''); setNewStars(0); setLikedReviews({})
    setDetailIsFav(getFavorites().includes(food.id)); setReviewsLoading(true)
    try {
      const [rr, rel] = await Promise.all([
        axios.get(`/menu/items/${food.id}/reviews`),
        getMenuItems({ page: 1, limit: 8, category_id: food.category_id }),
      ])
      const rd = rr.data; const rl = rd.reviews || rd
      setReviews(rl)
      setFoodRatings((p) => ({ ...p, [food.id]: rd.avg_rating ? String(rd.avg_rating) : calcAvg(rl) }))
      setRelatedFoods(rel.data.items.filter((f) => f.id !== food.id).slice(0, 6))
    } catch { setReviews([]); setRelatedFoods([]) }
    finally { setReviewsLoading(false) }
  }

  const handleToggleFavDetail = () => {
    if (!detailFood) return
    const favs = getFavorites()
    const next = favs.includes(detailFood.id) ? favs.filter((x) => x !== detailFood.id) : [...favs, detailFood.id]
    saveFavorites(next); setDetailIsFav(next.includes(detailFood.id))
    window.dispatchEvent(new Event('favoritesChanged'))
  }

  const handleSendComment = async () => {
    if (!newComment.trim() || !detailFood) return
    setSending(true)
    try {
      const res = await axios.post(`/menu/items/${detailFood.id}/reviews`, { comment: newComment.trim(), rating: newStars || null })
      setReviews((p) => { const u = [res.data, ...p]; setFoodRatings((r) => ({ ...r, [detailFood.id]: calcAvg(u) })); return u })
      setNewComment(''); setNewStars(0)
    } catch {}
    finally { setSending(false) }
  }

  const handleLikeReview = async (id) => {
    if (likedReviews[id] || !detailFood) return
    try {
      const res = await axios.post(`/menu/items/${detailFood.id}/reviews/${id}/like`)
      setReviews((p) => p.map((r) => r.id === id ? { ...r, likes: res.data.likes } : r))
      setLikedReviews((p) => ({ ...p, [id]: true }))
    } catch {}
  }

  const handleQrScan = async () => {
    if (!qrInput.trim()) return
    setQrLoading(true); setQrError('')
    try {
      const res = await scanQr(qrInput.trim())
      const { id, table_number } = res.data
      localStorage.setItem('table_session_id', id); localStorage.setItem('table_number', table_number)
      setSessionId(id); setTableNumber(table_number); setSession(id)
      setShowQrModal(false); setQrInput('')
    } catch (e) { setQrError(e.response?.data?.detail || "QR kod noto'g'ri") }
    finally { setQrLoading(false) }
  }

  const handleCategory = (id, name) => { setActiveCategoryId(id); setActiveCatName(name || 'Hammasi'); setPage(1) }
  const handleSearch   = (q) => { setSearchQuery(q); setPage(1) }
  const handleOpenFavs = () => { setFavFoods(foods.filter((f) => getFavorites().includes(f.id))); setShowFavs(true) }

  // Banner bosilganda aksiya mahsulotga o'tish
  const handleBannerOrder = () => {
    const first = saleItems[0] || foods.find((f) => f.is_sale && f.discounted_price)
    if (first) handleOpenDetail(first)
  }

  const detailAvg = reviews.length ? calcAvg(reviews) : null
  const detailCnt = reviews.filter((r) => r.rating > 0).length

  return (
    <div className="min-h-screen" style={{background:'#07050F', fontFamily:"'DM Sans', sans-serif"}}>
      <style>{ANIM_CSS}</style>

      {/* ═══ KOSMIK FON ═══ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{zIndex:0}}>
        <div className="absolute inset-0" style={{
          background:`
            radial-gradient(ellipse 80% 60% at 18% 28%, rgba(100,60,255,0.2) 0%, transparent 58%),
            radial-gradient(ellipse 60% 50% at 82% 12%, rgba(0,180,255,0.13) 0%, transparent 55%),
            radial-gradient(ellipse 70% 60% at 55% 88%, rgba(160,40,255,0.11) 0%, transparent 55%),
            radial-gradient(ellipse 40% 40% at 92% 68%, rgba(0,212,180,0.07) 0%, transparent 50%)
          `
        }} />
        {[
          {top:'3%',left:'10%',w:500,h:400,c:'rgba(100,60,255,0.2)',a:'pulse-glow 9s ease infinite'},
          {top:'38%',left:'65%',w:380,h:380,c:'rgba(0,180,255,0.15)',a:'pulse-glow 13s ease infinite 2.5s'},
          {top:'68%',left:'25%',w:270,h:270,c:'rgba(160,40,255,0.13)',a:'pulse-glow 11s ease infinite 5s'},
          {top:'15%',left:'50%',w:210,h:210,c:'rgba(0,212,180,0.08)',a:'pulse-glow 15s ease infinite 1s'},
          {top:'80%',left:'78%',w:190,h:190,c:'rgba(255,100,50,0.07)',a:'pulse-glow 10s ease infinite 3s'},
        ].map((g,i) => (
          <div key={i} className="absolute rounded-full" style={{top:g.top,left:g.left,width:g.w,height:g.h,background:g.c,filter:'blur(90px)',animation:g.a}} />
        ))}
        {Array.from({length:110}, (_,i) => ({
          x:Math.random()*100, y:Math.random()*100,
          s:Math.random()*2.8+0.4, o:Math.random()*0.55+0.1,
          c:['#fff','#C8D8FF','#D8C8FF','#C8FFEE','#FFE8C8'][Math.floor(Math.random()*5)],
          a:`float${(i%3)+1} ${16+Math.random()*22}s ease infinite ${Math.random()*12}s`,
        })).map((star,i) => (
          <div key={i} className="absolute rounded-full" style={{left:`${star.x}%`,top:`${star.y}%`,width:star.s,height:star.s,background:star.c,opacity:star.o,animation:star.a}} />
        ))}
        <div className="absolute inset-0" style={{opacity:0.03,backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,backgroundSize:'180px'}} />
        <div className="absolute inset-0" style={{opacity:0.016,backgroundImage:'linear-gradient(rgba(124,92,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,255,1) 1px, transparent 1px)',backgroundSize:'62px 62px'}} />
      </div>

      {/* NAVBAR */}
      <div className="relative z-50">
        <Navbar onSearch={handleSearch} onOpenFavs={handleOpenFavs} />
      </div>

      {/* ═══ QR MODAL ═══ */}
      {showQrModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{background:'rgba(0,0,0,0.78)', backdropFilter:'blur(12px)'}}>
          <div className="w-full max-w-sm p-6 rounded-2xl" style={{
            ...GLASS,
            border:'1px solid rgba(124,92,255,0.38)',
            boxShadow:'0 0 90px rgba(124,92,255,0.38), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                style={{background:'rgba(124,92,255,0.18)', border:'1px solid rgba(124,92,255,0.3)', boxShadow:'0 0 22px rgba(124,92,255,0.28)'}}>
                📱
              </div>
              <div>
                <h3 className="text-white font-bold" style={{fontFamily:"'Syne', sans-serif"}}>Stolga ulanish</h3>
                <p className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>QR kod qiymatini kiriting</p>
              </div>
            </div>
            <input value={qrInput} onChange={(e) => setQrInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQrScan()}
              placeholder="QR kod..." className="w-full h-12 px-4 rounded-xl text-sm text-white outline-none mb-3"
              style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(124,92,255,0.22)', transition:'all 0.2s', boxSizing:'border-box'}}
              onFocus={(e) => { e.target.style.borderColor='rgba(124,92,255,0.65)'; e.target.style.boxShadow='0 0 22px rgba(124,92,255,0.18)' }}
              onBlur={(e)  => { e.target.style.borderColor='rgba(124,92,255,0.22)'; e.target.style.boxShadow='none' }} />
            {qrError && <p className="text-red-400 text-xs mb-3">⚠️ {qrError}</p>}
            <div className="flex gap-2">
              <button onClick={handleQrScan} disabled={qrLoading}
                className="add-btn flex-1 h-11 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{fontFamily:"'Syne', sans-serif"}}>
                {qrLoading ? '...' : 'Ulanish →'}
              </button>
              <button onClick={() => { setShowQrModal(false); setQrInput('') }}
                className="flex-1 h-11 rounded-xl text-sm font-semibold"
                style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.5)'}}>
                Bekor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          DETAIL MODAL — TO'LIQ QAYTA YOZILGAN
      ═══════════════════════════════════════════════════ */}
      {detailFood && (
        <div className="fixed inset-0 z-[90] overflow-y-auto" style={{background:'#07050F'}}>
          {/* Fon */}
          <div className="fixed inset-0 pointer-events-none" style={{
            background:`
              radial-gradient(ellipse 60% 50% at 20% 30%, rgba(100,60,255,0.14) 0%, transparent 58%),
              radial-gradient(ellipse 50% 40% at 80% 20%, rgba(0,180,255,0.1) 0%, transparent 55%)
            `
          }}>
            {Array.from({length:25}, (_,i) => ({x:Math.random()*100,y:Math.random()*100,s:Math.random()*2+0.4,o:Math.random()*0.28+0.07})).map((s,i) => (
              <div key={i} className="absolute rounded-full bg-white" style={{left:`${s.x}%`,top:`${s.y}%`,width:s.s,height:s.s,opacity:s.o}} />
            ))}
          </div>

          <div className="relative z-10">
            {/* Sticky header */}
            <div className="sticky top-0 z-20 h-16 flex items-center justify-between px-6"
              style={{background:'rgba(7,5,15,0.9)', backdropFilter:'blur(26px)', borderBottom:'1px solid rgba(124,92,255,0.1)'}}>
              <button onClick={() => { setDetailFood(null); setReviews([]); setRelatedFoods([]) }}
                className="flex items-center gap-2" style={{color:'rgba(255,255,255,0.5)', background:'none', border:'none', cursor:'pointer', transition:'color 0.2s'}}
                onMouseEnter={(e) => e.currentTarget.style.color='#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color='rgba(255,255,255,0.5)'}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Orqaga</span>
              </button>
              <p className="text-white font-bold text-sm truncate max-w-xs"
                style={{fontFamily:"'Syne', sans-serif", textShadow:'0 0 12px rgba(124,92,255,0.4)'}}>
                {detailFood.name}
              </p>
              <button onClick={handleToggleFavDetail}
                className="fav-btn w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: detailIsFav ? 'rgba(255,80,80,0.18)' : 'rgba(255,255,255,0.05)',
                  border:`1px solid ${detailIsFav ? 'rgba(255,80,80,0.45)' : 'rgba(255,255,255,0.09)'}`,
                  boxShadow: detailIsFav ? '0 0 18px rgba(255,80,80,0.4)' : 'none',
                  cursor:'pointer',
                }}>
                <svg className="w-4 h-4" fill={detailIsFav ? '#FF6B6B' : 'none'} stroke={detailIsFav ? '#FF6B6B' : 'rgba(255,255,255,0.6)'} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>

            {/* ─── CONTENT: flex row ─── */}
            <div style={{display:'flex', minHeight:'calc(100vh - 64px)'}}>

              {/* ── CHAP: Kategoriyalar sidebar (detail ichida ham) ── */}
              <aside style={{
                width:'220px', flexShrink:0,
                position:'sticky', top:'64px', alignSelf:'flex-start', height:'calc(100vh - 64px)',
                overflowY:'auto',
                ...GLASS,
                borderRight:'1px solid rgba(124,92,255,0.1)',
                borderTop:'none', borderBottom:'none', borderLeft:'none',
              }} className="hidden lg:block no-scrollbar">
                <div style={{padding:'16px 12px'}}>
                  <p style={{fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em',
                    color:'rgba(124,92,255,0.5)', marginBottom:'10px', padding:'0 8px'}}>
                    Kategoriyalar
                  </p>
                  {allCats.map((cat) => {
                    const isA = activeCategoryId === cat.id
                    return (
                      <button key={cat.id ?? 'all'}
                        onClick={() => { handleCategory(cat.id, cat.name); setDetailFood(null); setReviews([]); setRelatedFoods([]) }}
                        className="cat-btn"
                        style={{
                          width:'100%', display:'flex', alignItems:'center', gap:'10px',
                          padding:'10px 12px', borderRadius:'12px', marginBottom:'2px',
                          background: isA ? 'linear-gradient(135deg, rgba(124,92,255,0.22), rgba(0,212,255,0.08))' : 'transparent',
                          border:`1px solid ${isA ? 'rgba(124,92,255,0.32)' : 'transparent'}`,
                          color: isA ? '#fff' : 'rgba(255,255,255,0.45)',
                          fontSize:'14px', fontWeight: isA ? 600 : 400,
                          cursor:'pointer', textAlign:'left',
                          fontFamily: isA ? "'Syne', sans-serif" : "'DM Sans', sans-serif",
                        }}>
                        <span style={{fontSize:'16px'}}>{cat.emoji || catIcons[cat.name?.toLowerCase()] || '🍴'}</span>
                        <span style={{overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', flex:1}}>{cat.name}</span>
                        {isA && <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#7C5CFF',boxShadow:'0 0 10px #7C5CFF',flexShrink:0}} />}
                      </button>
                    )
                  })}
                </div>
              </aside>

              {/* ── O'RTA + O'NG ── */}
              <div style={{flex:1, padding:'32px 24px', maxWidth:'1100px', margin:'0 auto'}}>

                {/* TOP SECTION: rasm katta + info */}
                <div style={{display:'flex', gap:'32px', flexWrap:'wrap', marginBottom:'48px', flexDirection: window.innerWidth < 768 ? 'column' : 'row'}}>

                  {/* Katta rasm */}
                  <div style={{
                    width:'100%', maxWidth:'480px', flexShrink:0,
                    borderRadius:'24px', overflow:'hidden',
                    border:'1px solid rgba(124,92,255,0.22)',
                    boxShadow:'0 0 80px rgba(124,92,255,0.2), 0 0 120px rgba(0,212,255,0.08)',
                  }}>
                    <img
                      src={detailFood.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700&h=600&fit=crop'}
                      alt={detailFood.name}
                      className="detail-main-img"
                      style={{width:'100%', aspectRatio:'1', objectFit:'cover', display:'block'}}
                    />
                  </div>

                  {/* Info */}
                  <div style={{flex:1, minWidth:'260px'}}>
                    {detailFood.is_sale && detailFood.discounted_price && (
                      <div style={{
                        display:'inline-flex', alignItems:'center', gap:'8px',
                        padding:'7px 14px', borderRadius:'12px', marginBottom:'14px',
                        background:'rgba(255,109,0,0.13)', border:'1px solid rgba(255,109,0,0.3)',
                        boxShadow:'0 0 22px rgba(255,109,0,0.18)',
                      }}>
                        <span style={{fontSize:'12px', fontWeight:900, color:'#FF9A3C'}}>🔥 -{detailFood.discount_percent}%</span>
                        {detailFood.sale_end && <span style={{fontSize:'11px', color:'rgba(255,154,60,0.55)'}}>· {new Date(detailFood.sale_end).toLocaleDateString('uz-UZ',{day:'2-digit',month:'2-digit'})} gacha</span>}
                      </div>
                    )}

                    <h1 style={{
                      color:'#fff', fontWeight:900, fontSize:'28px', margin:'0 0 12px',
                      fontFamily:"'Syne', sans-serif",
                      background:'linear-gradient(135deg, #fff 0%, rgba(200,180,255,0.85) 100%)',
                      WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                    }}>{detailFood.name}</h1>

                    <div style={{display:'flex', alignItems:'baseline', gap:'12px', marginBottom:'16px'}}>
                      <span style={{
                        fontWeight:900, fontSize:'28px', fontFamily:"'Syne', sans-serif",
                        background:'linear-gradient(135deg, #fff, rgba(160,140,255,0.8))',
                        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                      }}>
                        {fmt(detailFood.discounted_price ?? detailFood.price)} so'm
                      </span>
                      {detailFood.is_sale && detailFood.discounted_price && (
                        <span style={{fontSize:'15px', textDecoration:'line-through', color:'rgba(255,255,255,0.2)'}}>
                          {fmt(detailFood.price)} so'm
                        </span>
                      )}
                    </div>

                    {detailAvg && (
                      <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px'}}>
                        <StarRating value={Math.round(detailAvg)} />
                        <span style={{fontWeight:700, fontSize:'14px', color:'#FFC107', textShadow:'0 0 10px rgba(255,193,7,0.5)'}}>{detailAvg}</span>
                        <span style={{fontSize:'13px', color:'rgba(255,255,255,0.35)'}}>({detailCnt} baho)</span>
                      </div>
                    )}

                    <div style={{display:'flex', gap:'12px', marginBottom:'20px'}}>
                      {detailFood.calories && (
                        <div style={{flex:1, borderRadius:'14px', padding:'14px', textAlign:'center',
                          background:'rgba(255,138,0,0.08)', border:'1px solid rgba(255,138,0,0.2)', boxShadow:'0 0 18px rgba(255,138,0,0.08)'}}>
                          <p style={{fontWeight:900, fontSize:'22px', color:'#FF9A3C', fontFamily:"'Syne', sans-serif", margin:0}}>{detailFood.calories}</p>
                          <p style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', margin:'3px 0 0'}}>kaloriya</p>
                        </div>
                      )}
                      {detailFood.weight_grams && (
                        <div style={{flex:1, borderRadius:'14px', padding:'14px', textAlign:'center',
                          background:'rgba(0,180,255,0.08)', border:'1px solid rgba(0,180,255,0.2)', boxShadow:'0 0 18px rgba(0,180,255,0.08)'}}>
                          <p style={{fontWeight:900, fontSize:'22px', color:'#00D4FF', fontFamily:"'Syne', sans-serif", margin:0}}>{detailFood.weight_grams}</p>
                          <p style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', margin:'3px 0 0'}}>gram</p>
                        </div>
                      )}
                    </div>

                    {detailFood.description && (
                      <p style={{fontSize:'14px', lineHeight:'1.7', color:'rgba(255,255,255,0.45)', marginBottom:'24px'}}>
                        {detailFood.description}
                      </p>
                    )}

                    <button onClick={() => { add(detailFood); setDetailFood(null); setReviews([]); setRelatedFoods([]) }}
                      disabled={detailFood.availability === 'unavailable'}
                      className="add-btn"
                      style={{
                        width:'100%', height:'56px', borderRadius:'16px',
                        fontWeight:900, fontSize:'16px', color:'#fff', border:'none', cursor:'pointer',
                        fontFamily:"'Syne', sans-serif", letterSpacing:'0.02em',
                        opacity: detailFood.availability === 'unavailable' ? 0.4 : 1,
                      }}>
                      🛒 Savatga qo'shish
                    </button>
                  </div>
                </div>

                {/* ─── O'XSHASH TAOMLAR — katta katta ─── */}
                {relatedFoods.length > 0 && (
                  <div style={{marginBottom:'48px'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px'}}>
                      <h2 style={{color:'#fff', fontWeight:800, fontSize:'20px', fontFamily:"'Syne', sans-serif", margin:0}}>
                        O'xshash taomlar
                      </h2>
                      <div style={{flex:1, height:'1px', background:'linear-gradient(90deg, rgba(124,92,255,0.3), transparent)'}} />
                    </div>
                    <div style={{
                      display:'grid',
                      gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',
                      gap:'20px',
                    }}>
                      {relatedFoods.map((rf, i) => (
                        <div key={rf.id} onClick={() => handleOpenDetail(rf)}
                          className="related-card"
                          style={{
                            borderRadius:'18px', overflow:'hidden', cursor:'pointer',
                            background:'linear-gradient(160deg, rgba(22,16,45,0.88), rgba(10,12,24,0.92))',
                            border:'1px solid rgba(124,92,255,0.14)',
                            boxShadow:'0 4px 24px rgba(0,0,0,0.5)',
                            animation:`card-in 0.4s ease ${i*0.06}s both`,
                          }}>
                          {/* Top shimmer */}
                          <div style={{height:'1px', background:'linear-gradient(90deg, transparent, rgba(124,92,255,0.5), transparent)'}} />
                          <div style={{position:'relative', height:'160px', overflow:'hidden'}}>
                            <img src={rf.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop'}
                              alt={rf.name}
                              className="related-img"
                              style={{width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'transform 0.6s ease'}} />
                            <div style={{position:'absolute', inset:0, background:'linear-gradient(to top, rgba(5,3,18,0.92) 0%, transparent 65%)'}} />
                            {rf.is_sale && rf.discounted_price && (
                              <span style={{
                                position:'absolute', top:'8px', left:'8px',
                                background:'linear-gradient(135deg, #FF6D00, #FF9A3C)',
                                boxShadow:'0 0 14px rgba(255,109,0,0.6)',
                                color:'#fff', fontSize:'11px', fontWeight:900,
                                padding:'3px 8px', borderRadius:'8px',
                                fontFamily:"'Syne', sans-serif",
                              }}>
                                -{rf.discount_percent}%
                              </span>
                            )}
                          </div>
                          <div style={{padding:'14px'}}>
                            <p style={{
                              color:'#fff', fontSize:'14px', fontWeight:700,
                              fontFamily:"'Syne', sans-serif",
                              overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis',
                              margin:'0 0 6px',
                            }}>{rf.name}</p>
                            <p style={{
                              fontSize:'15px', fontWeight:900,
                              fontFamily:"'Syne', sans-serif",
                              background:'linear-gradient(135deg, #fff, rgba(180,160,255,0.85))',
                              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                              margin:0,
                            }}>{fmt(rf.discounted_price ?? rf.price)} so'm</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── FIKRLAR ─── */}
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap:'24px', flexWrap:'wrap'}}>
                  {/* Fikr qoldirish */}
                  <div style={{...GLASS, borderRadius:'20px', padding:'24px'}}>
                    <h3 style={{color:'#fff', fontWeight:800, fontFamily:"'Syne', sans-serif", margin:'0 0 18px', fontSize:'16px'}}>
                      ✍️ Fikr qoldiring
                    </h3>
                    <div style={{marginBottom:'16px'}}>
                      <p style={{fontSize:'12px', color:'rgba(255,255,255,0.35)', margin:'0 0 8px'}}>Baholang:</p>
                      <StarRating value={newStars} onChange={setNewStars} size="lg" />
                      {newStars > 0 && (
                        <p style={{fontSize:'12px', fontWeight:700, color:'#FFC107', margin:'6px 0 0', textShadow:'0 0 8px rgba(255,193,7,0.4)'}}>
                          {['','😞 Yomon','😐 Qoniqarsiz','🙂 Yaxshi','😊 Juda yaxshi','🤩 Ajoyib!'][newStars]}
                        </p>
                      )}
                    </div>
                    <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Fikringiz..." rows={4}
                      className="w-full text-white outline-none resize-none"
                      style={{
                        padding:'12px 16px', borderRadius:'14px',
                        background:'rgba(255,255,255,0.04)', border:'1px solid rgba(124,92,255,0.18)',
                        fontSize:'13px', transition:'all 0.2s', marginBottom:'12px',
                        fontFamily:"'DM Sans', sans-serif", boxSizing:'border-box', width:'100%',
                      }}
                      onFocus={(e) => { e.target.style.borderColor='rgba(124,92,255,0.58)'; e.target.style.boxShadow='0 0 18px rgba(124,92,255,0.13)' }}
                      onBlur={(e)  => { e.target.style.borderColor='rgba(124,92,255,0.18)'; e.target.style.boxShadow='none' }} />
                    <button onClick={handleSendComment} disabled={!newComment.trim() || sending}
                      className="add-btn w-full text-white"
                      style={{
                        height:'44px', borderRadius:'12px', fontSize:'13px', fontWeight:700,
                        border:'none', cursor:'pointer', fontFamily:"'Syne', sans-serif",
                        opacity:(!newComment.trim() || sending) ? 0.4 : 1,
                      }}>
                      {sending ? 'Yuborilmoqda...' : 'Yuborish →'}
                    </button>
                  </div>

                  {/* Fikrlar ro'yxati */}
                  <div>
                    <h3 style={{color:'#fff', fontWeight:800, fontFamily:"'Syne', sans-serif", margin:'0 0 16px', fontSize:'16px'}}>
                      💬 Fikrlar ({reviews.length})
                    </h3>
                    {reviewsLoading ? (
                      <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                        {[1,2,3].map((i) => <div key={i} style={{height:'76px', borderRadius:'16px', background:'rgba(124,92,255,0.06)', border:'1px solid rgba(124,92,255,0.09)'}} />)}
                      </div>
                    ) : reviews.length === 0 ? (
                      <div style={{...GLASS, borderRadius:'18px', padding:'40px 24px', textAlign:'center'}}>
                        <p style={{fontSize:'28px', margin:'0 0 8px'}}>💬</p>
                        <p style={{color:'#fff', fontWeight:600, margin:'0 0 4px'}}>Hali fikr yo'q</p>
                        <p style={{color:'rgba(255,255,255,0.3)', fontSize:'13px', margin:0}}>Birinchi bo'lib fikr qoldiring!</p>
                      </div>
                    ) : (
                      <div style={{display:'flex', flexDirection:'column', gap:'10px', maxHeight:'420px', overflowY:'auto', paddingRight:'4px'}} className="no-scrollbar">
                        {reviews.map((r) => (
                          <div key={r.id} style={{...GLASS, borderRadius:'16px', padding:'14px'}}>
                            {r.rating > 0 && <div style={{marginBottom:'6px'}}><StarRating value={r.rating} /></div>}
                            <p style={{fontSize:'13px', lineHeight:'1.6', color:'rgba(255,255,255,0.75)', margin:'0 0 10px'}}>{r.comment}</p>
                            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                              <span style={{fontSize:'11px', color:'rgba(255,255,255,0.28)'}}>
                                {new Date(r.created_at).toLocaleDateString('uz-UZ',{day:'2-digit',month:'2-digit',year:'2-digit'})}
                              </span>
                              <button onClick={() => handleLikeReview(r.id)}
                                style={{
                                  display:'flex', alignItems:'center', gap:'5px', fontSize:'12px',
                                  padding:'4px 12px', borderRadius:'10px', cursor:'pointer', transition:'all 0.2s',
                                  background: likedReviews[r.id] ? 'rgba(255,80,80,0.12)' : 'rgba(255,255,255,0.04)',
                                  border:`1px solid ${likedReviews[r.id] ? 'rgba(255,80,80,0.38)' : 'rgba(255,255,255,0.08)'}`,
                                  color: likedReviews[r.id] ? '#FF6B6B' : 'rgba(255,255,255,0.4)',
                                  boxShadow: likedReviews[r.id] ? '0 0 12px rgba(255,80,80,0.22)' : 'none',
                                }}>
                                <svg width="12" height="12" fill={likedReviews[r.id] ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                {r.likes}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ YOQTIRGANLAR ═══ */}
      {showFavs && (
        <div className="fixed inset-0 z-[90] overflow-y-auto" style={{background:'#07050F'}}>
          <div className="sticky top-0 z-10 h-16 flex items-center justify-between px-6"
            style={{background:'rgba(7,5,15,0.92)', backdropFilter:'blur(26px)', borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
            <button onClick={() => setShowFavs(false)} className="flex items-center gap-2"
              style={{color:'rgba(255,255,255,0.5)', background:'none', border:'none', cursor:'pointer', transition:'color 0.2s'}}
              onMouseEnter={(e) => e.currentTarget.style.color='#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color='rgba(255,255,255,0.5)'}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Orqaga</span>
            </button>
            <div className="flex items-center gap-2">
              <span style={{filter:'drop-shadow(0 0 10px rgba(255,107,107,0.7))'}}>❤️</span>
              <span className="text-white font-bold text-sm" style={{fontFamily:"'Syne', sans-serif"}}>Yoqtirganlarim ({favFoods.length})</span>
            </div>
            <div className="w-20" />
          </div>
          <div className="max-w-[1200px] mx-auto px-6 py-6">
            {favFoods.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-6xl mb-4" style={{filter:'drop-shadow(0 0 24px rgba(255,107,107,0.5))'}}>❤️</p>
                <p className="text-white font-bold text-xl mb-2" style={{fontFamily:"'Syne', sans-serif"}}>Yoqtirganlar yo'q</p>
                <p className="text-sm" style={{color:'rgba(255,255,255,0.35)'}}>Taom kartasidagi ❤️ ni bosing</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {favFoods.map((f, i) => (
                  <FoodCard key={f.id} food={f} index={i} avgRating={foodRatings[f.id]}
                    onOpen={(food) => { setShowFavs(false); handleOpenDetail(food) }}
                    onAdd={(food) => add(food)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          ASOSIY LAYOUT
      ═══════════════════════════════════════════════════ */}
      <div className="relative z-10 flex min-h-screen">

        {/* ── SIDEBAR — tepadan pastgacha ── */}
        <aside className="hidden lg:flex flex-col" style={{
          position:'fixed', left:0, top:'80px', bottom:0, width:'268px',
          ...GLASS,
          borderRight:'1px solid rgba(124,92,255,0.12)',
          borderTop:'none', borderBottom:'none', borderLeft:'none',
          boxShadow:'4px 0 50px rgba(0,0,0,0.45)',
        }}>
          {/* Top glow */}
          <div style={{position:'absolute', top:0, left:0, right:0, height:'150px', pointerEvents:'none',
            background:'radial-gradient(ellipse at 50% 0%, rgba(124,92,255,0.14) 0%, transparent 70%)'}} />

          <div className="flex-1 overflow-y-auto p-4 relative no-scrollbar">
            {/* Stol holati */}
            <div style={{marginBottom:'20px', padding:'12px', borderRadius:'14px',
              background: tableNumber ? 'rgba(0,212,255,0.06)' : 'rgba(255,255,255,0.03)',
              border:`1px solid ${tableNumber ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
            }}>
              {tableNumber ? (
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <div style={{width:'8px', height:'8px', borderRadius:'50%', background:'#00D4FF',
                    boxShadow:'0 0 12px #00D4FF, 0 0 24px rgba(0,212,255,0.6)', animation:'ai-pulse 2s ease infinite'}} />
                  <span style={{fontSize:'12px', fontWeight:700, color:'#00D4FF'}}>Stol #{tableNumber} ulandi</span>
                </div>
              ) : (
                <button onClick={() => setShowQrModal(true)} style={{
                  width:'100%', display:'flex', alignItems:'center', gap:'8px',
                  fontSize:'12px', fontWeight:700, color:'#7C5CFF',
                  background:'none', border:'none', cursor:'pointer',
                  fontFamily:"'DM Sans', sans-serif",
                }}>
                  <span>📱</span><span>QR kod bilan ulaning</span><span style={{marginLeft:'auto', opacity:0.55}}>→</span>
                </button>
              )}
            </div>

            {/* Section label */}
            <p style={{fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.16em',
              color:'rgba(124,92,255,0.5)', marginBottom:'10px', padding:'0 8px'}}>
              Menyu
            </p>

            {/* Categories */}
            {allCats.map((cat) => {
              const isActive = activeCategoryId === cat.id
              return (
                <button key={cat.id ?? 'all'}
                  onClick={() => handleCategory(cat.id, cat.name)}
                  className="cat-btn"
                  style={{
                    width:'100%', display:'flex', alignItems:'center', gap:'10px',
                    padding:'11px 14px', borderRadius:'14px', marginBottom:'3px',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(124,92,255,0.22), rgba(0,212,255,0.09))'
                      : 'transparent',
                    border:`1px solid ${isActive ? 'rgba(124,92,255,0.32)' : 'rgba(255,255,255,0.0)'}`,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.48)',
                    fontSize:'15px', fontWeight: isActive ? 700 : 400,
                    cursor:'pointer', textAlign:'left',
                    fontFamily: isActive ? "'Syne', sans-serif" : "'DM Sans', sans-serif",
                    boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.07), 0 0 18px rgba(124,92,255,0.1)' : 'none',
                  }}>
                  <span style={{fontSize:'18px'}}>{cat.emoji || catIcons[cat.name?.toLowerCase()] || '🍴'}</span>
                  <span style={{flex:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis'}}>
                    {cat.name}
                  </span>
                  {isActive && (
                    <div style={{width:'7px', height:'7px', borderRadius:'50%', background:'#7C5CFF',
                      boxShadow:'0 0 12px #7C5CFF, 0 0 22px rgba(124,92,255,0.6)', flexShrink:0}} />
                  )}
                </button>
              )
            })}
          </div>
        </aside>

        {/* ── MARKAZ ── */}
        <main className="flex-1 lg:ml-[268px]" style={{padding:'24px'}}>

          {/* Banner — handleBannerOrder orqali aksiya mahsulotga o'tadi */}
          <BannerSlider banners={banners} onOrderClick={handleBannerOrder} />

          {/* QR banner */}
          <div style={{marginTop:'16px'}}>
            {!sessionId ? (
              <div style={{
                padding:'12px 16px', borderRadius:'16px',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                background:'rgba(124,92,255,0.06)', border:'1px solid rgba(124,92,255,0.14)',
              }}>
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                  <span style={{fontSize:'20px'}}>📱</span>
                  <div>
                    <p style={{color:'#fff', fontSize:'13px', fontWeight:700, fontFamily:"'Syne', sans-serif", margin:0}}>Stolga ulanish</p>
                    <p style={{color:'rgba(255,255,255,0.35)', fontSize:'11px', margin:0, marginTop:'1px'}}>QR kodni skanerlang yoki kiriting</p>
                  </div>
                </div>
                <button onClick={() => setShowQrModal(true)}
                  className="add-btn"
                  style={{padding:'8px 18px', borderRadius:'12px', fontSize:'13px', fontWeight:700, color:'#fff', border:'none', cursor:'pointer', fontFamily:"'Syne', sans-serif"}}>
                  QR kiriting
                </button>
              </div>
            ) : (
              <div style={{
                padding:'12px 16px', borderRadius:'16px',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                background:'rgba(0,212,255,0.05)', border:'1px solid rgba(0,212,255,0.17)',
              }}>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <div style={{width:'8px', height:'8px', borderRadius:'50%', background:'#00D4FF', boxShadow:'0 0 10px #00D4FF', animation:'ai-pulse 2s ease infinite'}} />
                  <span style={{fontSize:'13px', fontWeight:700, color:'#00D4FF', fontFamily:"'Syne', sans-serif"}}>Stol #{tableNumber} — Ulandi</span>
                </div>
                <button onClick={() => { localStorage.removeItem('table_session_id'); localStorage.removeItem('table_number'); setSessionId(null); setTableNumber(null) }}
                  style={{
                    fontSize:'12px', padding:'6px 14px', borderRadius:'10px', cursor:'pointer',
                    color:'rgba(0,212,255,0.55)', border:'1px solid rgba(0,212,255,0.18)', background:'transparent',
                    transition:'color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color='#00D4FF'}
                  onMouseLeave={(e) => e.currentTarget.style.color='rgba(0,212,255,0.55)'}>
                  Chiqish
                </button>
              </div>
            )}
          </div>

          {/* AKSIYALAR */}
          {saleItems.length > 0 && (
            <div style={{marginTop:'28px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px'}}>
                <span style={{fontSize:'20px', filter:'drop-shadow(0 0 10px rgba(255,109,0,0.8))'}}>🔥</span>
                <h2 style={{color:'#fff', fontWeight:800, fontSize:'18px', fontFamily:"'Syne', sans-serif", margin:0}}>Aksiyalar</h2>
                <span style={{
                  fontSize:'11px', fontWeight:700, padding:'4px 10px', borderRadius:'20px',
                  background:'rgba(255,109,0,0.13)', border:'1px solid rgba(255,109,0,0.28)',
                  color:'#FF9A3C', boxShadow:'0 0 12px rgba(255,109,0,0.2)',
                }}>
                  {saleItems.length} ta
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {saleItems.map((food) => (
                  <div key={food.id} onClick={() => handleOpenDetail(food)}
                    className="sale-card shrink-0 w-44 rounded-2xl overflow-hidden cursor-pointer"
                    style={{
                      background:'linear-gradient(160deg, rgba(22,12,5,0.88), rgba(10,12,24,0.92))',
                      border:'1px solid rgba(255,109,0,0.24)',
                      boxShadow:'0 6px 24px rgba(0,0,0,0.5)',
                      position:'relative',
                    }}>
                    <div style={{height:'1px', background:'linear-gradient(90deg, transparent, rgba(255,150,0,0.5), transparent)'}} />
                    <div className="relative h-28 overflow-hidden">
                      <img src={food.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop'} alt={food.name} className="w-full h-full object-cover" style={{transition:'transform 0.5s ease'}}
                        onMouseEnter={(e) => e.target.style.transform='scale(1.1)'}
                        onMouseLeave={(e) => e.target.style.transform='scale(1)'} />
                      <div className="absolute inset-0" style={{background:'linear-gradient(to top, rgba(5,3,10,0.88) 0%, transparent 60%)'}} />
                      <span className="absolute top-2 left-2 text-xs font-black px-2 py-0.5 rounded-lg text-white"
                        style={{background:'linear-gradient(135deg, #FF6D00, #FF9A3C)', boxShadow:'0 0 14px rgba(255,109,0,0.6)', fontFamily:"'Syne', sans-serif"}}>
                        -{food.discount_percent}%
                      </span>
                      {food.sale_end && (
                        <span className="absolute bottom-2 right-2 text-xs px-1.5 py-0.5 rounded-lg"
                          style={{background:'rgba(0,0,0,0.68)', color:'rgba(255,255,255,0.65)', backdropFilter:'blur(6px)'}}>
                          ⏰ {new Date(food.sale_end).toLocaleDateString('uz-UZ',{day:'2-digit',month:'2-digit'})}
                        </span>
                      )}
                    </div>
                    <div style={{padding:'10px'}}>
                      <p style={{color:'#fff', fontSize:'12px', fontWeight:700, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', margin:'0 0 3px', fontFamily:"'Syne', sans-serif"}}>{food.name}</p>
                      <p style={{fontSize:'13px', fontWeight:900, color:'#9B7FFF', margin:'0 0 1px'}}>{fmt(food.discounted_price)} so'm</p>
                      <p style={{fontSize:'10px', textDecoration:'line-through', color:'rgba(255,255,255,0.2)', margin:0}}>{fmt(food.price)} so'm</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── HORIZONTAL KATEGORIYA CHIPS (desktop + mobile) ─── */}
          <div style={{marginTop:'28px'}}>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {allCats.map((cat) => {
                const isActive = activeCategoryId === cat.id
                return (
                  <button key={cat.id ?? 'all'}
                    onClick={() => handleCategory(cat.id, cat.name)}
                    className="h-chip shrink-0 flex items-center gap-2 font-bold"
                    style={{
                      padding:'9px 18px', borderRadius:'999px',
                      fontSize:'13px', fontFamily:"'Syne', sans-serif", cursor:'pointer',
                      border:`1px solid ${isActive ? 'transparent' : 'rgba(255,255,255,0.09)'}`,
                      background: isActive
                        ? 'linear-gradient(135deg, #7C5CFF 0%, #00B4FF 50%, #00D4AA 100%)'
                        : 'rgba(255,255,255,0.04)',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                      boxShadow: isActive
                        ? '0 0 22px rgba(124,92,255,0.55), 0 0 45px rgba(0,180,255,0.2), inset 0 1px 0 rgba(255,255,255,0.18)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                      fontWeight: isActive ? 700 : 400,
                    }}>
                    <span style={{fontSize:'15px'}}>{cat.emoji || catIcons[cat.name?.toLowerCase()] || '🍴'}</span>
                    <span>{cat.name}</span>
                    {isActive && (
                      <span style={{
                        width:'5px', height:'5px', borderRadius:'50%',
                        background:'rgba(255,255,255,0.85)',
                        boxShadow:'0 0 6px rgba(255,255,255,0.6)',
                        display:'inline-block',
                      }} />
                    )}
                  </button>
                )
              })}
            </div>
            {/* Divider */}
            <div style={{height:'1px', background:'linear-gradient(90deg, transparent, rgba(124,92,255,0.22), rgba(0,212,255,0.12), transparent)', marginTop:'14px'}} />
          </div>

          {/* ─── MAHSULOTLAR GRID ─── */}
          <div style={{marginTop:'24px'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px'}}>
              <h2 style={{
                color:'#fff', fontWeight:800, fontSize:'22px', fontFamily:"'Syne', sans-serif", margin:0,
                background:'linear-gradient(135deg, #fff, rgba(180,160,255,0.75))',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              }}>
                {activeCatName}
              </h2>
              {searchQuery && <p style={{color:'rgba(255,255,255,0.3)', fontSize:'13px', margin:0}}>"{searchQuery}" natijalari</p>}
            </div>

            {loading ? (
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap:'16px'}}>
                {Array.from({length: LIMIT}).map((_, i) => (
                  <div key={i} className="rounded-2xl animate-pulse"
                    style={{height:'280px', background:'rgba(124,92,255,0.06)', border:'1px solid rgba(124,92,255,0.09)'}} />
                ))}
              </div>
            ) : foods.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-5xl mb-4">🍽️</p>
                <p className="text-white font-bold text-lg" style={{fontFamily:"'Syne', sans-serif"}}>Taom topilmadi</p>
                <p className="text-sm mt-2" style={{color:'rgba(255,255,255,0.35)'}}>Boshqa kategoriyani tanlang</p>
              </div>
            ) : (
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap:'16px'}}>
                {foods.map((food, i) => (
                  <FoodCard key={food.id} food={food} index={i}
                    avgRating={foodRatings[food.id]}
                    onOpen={handleOpenDetail}
                    onAdd={(f) => add(f)} />
                ))}
              </div>
            )}
          </div>

          {/* ─── PAGINATION — 25 talik ─── */}
          {totalPages > 1 && (
            <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:'8px', marginTop:'36px', paddingBottom:'12px'}}>
              <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1}
                style={{
                  padding:'8px 16px', borderRadius:'12px', fontSize:'13px', fontWeight:500,
                  background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)',
                  color:'rgba(255,255,255,0.4)', cursor:'pointer', transition:'all 0.2s',
                  opacity: page===1 ? 0.3 : 1,
                }}>←</button>

              {/* Smart pagination: ... bilan */}
              {Array.from({length: totalPages}, (_, i) => i + 1).map((p) => {
                if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={p === page ? 'add-btn' : ''}
                      style={{
                        width:'36px', height:'36px', borderRadius:'10px', fontSize:'13px', fontWeight:700,
                        background: p === page ? undefined : 'rgba(255,255,255,0.04)',
                        border:`1px solid ${p === page ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                        color: p === page ? '#fff' : 'rgba(255,255,255,0.4)',
                        boxShadow: p === page ? '0 0 18px rgba(124,92,255,0.5)' : 'none',
                        cursor:'pointer', transition:'all 0.2s',
                        fontFamily: p === page ? "'Syne', sans-serif" : "'DM Sans', sans-serif",
                        animation: p === page ? 'none' : undefined,
                      }}>
                      {p}
                    </button>
                  )
                } else if (p === page - 3 || p === page + 3) {
                  return <span key={p} style={{color:'rgba(255,255,255,0.25)', fontSize:'16px'}}>···</span>
                }
                return null
              })}

              <button onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page===totalPages}
                style={{
                  padding:'8px 16px', borderRadius:'12px', fontSize:'13px', fontWeight:500,
                  background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)',
                  color:'rgba(255,255,255,0.4)', cursor:'pointer', transition:'all 0.2s',
                  opacity: page===totalPages ? 0.3 : 1,
                }}>→</button>
            </div>
          )}

          {/* ═══ FOOTER ═══ */}
          <Footer />
        </main>
      </div>

      {/* SAVAT */}
{items.length > 0 && (
  <button onClick={() => setCartOpen(true)}
    className="add-btn fixed bottom-6 left-6 z-50 flex items-center gap-3 px-5 h-14 rounded-2xl font-bold text-sm text-white"
    style={{animation:'cart-pulse 2.5s ease infinite', fontFamily:"'Syne', sans-serif"}}>
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
    <div className="flex flex-col items-start">
      <span className="text-xs opacity-70">{totalQty} ta taom</span>
      <span>{fmt(Math.round(totalPrice * 1.1))} so'm</span>
    </div>
  </button>
)}

{pendingRating && (
  <button onClick={() => setCartOpen(true)}
    className="fixed left-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-white font-bold text-sm"
    style={{
      bottom: items.length > 0 ? '90px' : '24px',
      background:'linear-gradient(135deg, #FF6D00, #FF9A3C)',
      boxShadow:'0 0 32px rgba(255,109,0,0.58)',
      animation:'ai-pulse 2s ease infinite',
      fontFamily:"'Syne', sans-serif",
    }}>
    ⭐ Xizmatni baholang
  </button>
)}

      <CartModal
        open={cartOpen}
        onClose={() => { setCartOpen(false); setPendingRating(!!localStorage.getItem('pending_rating_order_id')) }}
        onDelivered={() => setPendingRating(true)}
      />
      <AiChatPanel />
    </div>
  )
}
