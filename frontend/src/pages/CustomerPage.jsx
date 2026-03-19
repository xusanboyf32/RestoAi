import { useState, useEffect, useCallback } from 'react'
import Navbar        from '../components/Navbar'
import BannerSlider  from '../components/BannerSlider'
import CategoryPills from '../components/CategoryPills'
import FoodCard      from '../components/FoodCard'
import CartModal     from '../components/CartModal'
import AiChatPanel   from '../components/AiChatPanel'
import useCartStore  from '../store/useCartStore'
import axios         from '../api/axios'
import { getCategories, getBanners, getMenuItems } from '../api/menuApi'
import { scanQr } from '../api/tableApi'

const LIMIT = 12
const fmt   = (n) => Number(n).toLocaleString('uz-UZ')
const getFavorites  = () => { try { return JSON.parse(localStorage.getItem('favorites') || '[]') } catch { return [] } }
const saveFavorites = (ids) => localStorage.setItem('favorites', JSON.stringify(ids))

function StarRating({ value, onChange, size = 'md' }) {
  const [hover, setHover] = useState(0)
  const sz = size === 'lg' ? 'text-3xl' : 'text-xl'
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map((star) => (
        <button key={star} type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHover(star)}
          onMouseLeave={() => onChange && setHover(0)}
          className={`${sz} transition-transform ${onChange ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}>
          <span className={(star <= (hover || value)) ? 'text-yellow-400' : 'text-darkBorder'}>★</span>
        </button>
      ))}
    </div>
  )
}

export default function CustomerPage() {
  const [categories,       setCategories]       = useState([])
  const [banners,          setBanners]          = useState([])
  const [foods,            setFoods]            = useState([])
  const [saleItems,        setSaleItems]        = useState([])
  const [foodRatings,      setFoodRatings]      = useState({})
  const [activeCategoryId, setActiveCategoryId] = useState(null)
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
  const [favCount, setFavCount] = useState(0)

  const [sessionId,   setSessionId]   = useState(null)
  const [tableNumber, setTableNumber] = useState(null)
  const [showQrInput, setShowQrInput] = useState(false)
  const [qrInput,     setQrInput]     = useState('')
  const [qrLoading,   setQrLoading]   = useState(false)
  const [qrError,     setQrError]     = useState('')

  const { setSession, totalQty, totalPrice, add } = useCartStore((s) => ({
    setSession: s.setSession,
    totalQty:   s.totalQty(),
    totalPrice: s.totalPrice(),
    add:        s.add,
  }))

  useEffect(() => {
    const s = localStorage.getItem('table_session_id')
    const t = localStorage.getItem('table_number')
    if (s) { setSessionId(Number(s)); setTableNumber(t); setSession(Number(s)) }
    if (localStorage.getItem('pending_rating_order_id')) setPendingRating(true)
    setFavCount(getFavorites().length)
  }, [])

  useEffect(() => {
    const handler = () => {
      const ids = getFavorites()
      setFavCount(ids.length)
      if (showFavs) setFavFoods(foods.filter((f) => ids.includes(f.id)))
      if (detailFood) setDetailIsFav(ids.includes(detailFood.id))
    }
    window.addEventListener('favoritesChanged', handler)
    return () => window.removeEventListener('favoritesChanged', handler)
  }, [showFavs, foods, detailFood])

  useEffect(() => {
    getCategories().then((r) => setCategories(r.data))
    getBanners().then((r)    => setBanners(r.data))
    // Aksiyali taomlarni alohida yuklash
    getMenuItems({ page: 1, limit: 20, is_sale: true }).then((r) => {
      const items = r.data.items.filter((f) => f.is_sale && f.discounted_price)
      setSaleItems(items)
    }).catch(() => setSaleItems([]))
  }, [])

  const fetchFoods = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getMenuItems({
        page, limit: LIMIT,
        ...(activeCategoryId && { category_id: activeCategoryId }),
        ...(searchQuery       && { search:      searchQuery       }),
      })
      setFoods(res.data.items)
      setTotalPages(res.data.total_pages)
      const ratingsMap = {}
      res.data.items.forEach((item) => {
        if (item.avg_rating) ratingsMap[item.id] = String(item.avg_rating)
      })
      setFoodRatings((prev) => ({ ...prev, ...ratingsMap }))
    } catch { setFoods([]) }
    finally { setLoading(false) }
  }, [page, activeCategoryId, searchQuery])

  useEffect(() => { fetchFoods() }, [fetchFoods])

  const calcAvg = (revs) => {
    const rated = revs.filter((r) => r.rating > 0)
    if (!rated.length) return null
    return (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1)
  }

  const handleOpenDetail = async (food) => {
    setDetailFood(food)
    setNewComment('')
    setNewStars(0)
    setLikedReviews({})
    setDetailIsFav(getFavorites().includes(food.id))
    setReviewsLoading(true)
    try {
      const [revRes, relRes] = await Promise.all([
        axios.get(`/menu/items/${food.id}/reviews`),
        getMenuItems({ page: 1, limit: 7, category_id: food.category_id }),
      ])
      const revData = revRes.data
      const revList = revData.reviews || revData
      setReviews(revList)
      if (revData.avg_rating) {
        setFoodRatings((prev) => ({ ...prev, [food.id]: String(revData.avg_rating) }))
      } else {
        setFoodRatings((prev) => ({ ...prev, [food.id]: calcAvg(revList) }))
      }
      setRelatedFoods(relRes.data.items.filter((f) => f.id !== food.id).slice(0, 6))
    } catch { setReviews([]); setRelatedFoods([]) }
    finally { setReviewsLoading(false) }
  }

  const handleCloseDetail = () => { setDetailFood(null); setReviews([]); setRelatedFoods([]) }

  const handleToggleFavDetail = () => {
    if (!detailFood) return
    const favs    = getFavorites()
    const newFavs = favs.includes(detailFood.id) ? favs.filter((id) => id !== detailFood.id) : [...favs, detailFood.id]
    saveFavorites(newFavs)
    setDetailIsFav(newFavs.includes(detailFood.id))
    window.dispatchEvent(new Event('favoritesChanged'))
  }

  const handleSendComment = async () => {
    if (!newComment.trim() || !detailFood) return
    setSending(true)
    try {
      const res = await axios.post(`/menu/items/${detailFood.id}/reviews`, {
        comment: newComment.trim(),
        rating:  newStars || null,
      })
      setReviews((prev) => {
        const updated = [res.data, ...prev]
        setFoodRatings((r) => ({ ...r, [detailFood.id]: calcAvg(updated) }))
        return updated
      })
      setNewComment('')
      setNewStars(0)
    } catch {}
    finally { setSending(false) }
  }

  const handleLikeReview = async (reviewId) => {
    if (likedReviews[reviewId] || !detailFood) return
    try {
      const res = await axios.post(`/menu/items/${detailFood.id}/reviews/${reviewId}/like`)
      setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, likes: res.data.likes } : r))
      setLikedReviews((prev) => ({ ...prev, [reviewId]: true }))
    } catch {}
  }

  const handleOpenFavs = () => {
    const ids = getFavorites()
    setFavFoods(foods.filter((f) => ids.includes(f.id)))
    setShowFavs(true)
  }

  const handleQrScan = async () => {
    if (!qrInput.trim()) return
    setQrLoading(true); setQrError('')
    try {
      const res = await scanQr(qrInput.trim())
      const { id, table_number } = res.data
      localStorage.setItem('table_session_id', id)
      localStorage.setItem('table_number', table_number)
      setSessionId(id); setTableNumber(table_number); setSession(id)
      setShowQrInput(false); setQrInput('')
    } catch (err) { setQrError(err.response?.data?.detail || "QR kod noto'g'ri") }
    finally { setQrLoading(false) }
  }

  const handleLeaveTable  = () => { localStorage.removeItem('table_session_id'); localStorage.removeItem('table_number'); setSessionId(null); setTableNumber(null); setSession(null) }
  const handleDelivered   = () => setPendingRating(true)
  const handleCartClose   = () => { setCartOpen(false); setPendingRating(!!localStorage.getItem('pending_rating_order_id')) }
  const handleCategory    = (id) => { setActiveCategoryId(id); setPage(1) }
  const handleSearch      = (q)  => { setSearchQuery(q);       setPage(1) }

  const detailAvg      = reviews.length ? calcAvg(reviews) : null
  const detailRatedCnt = reviews.filter((r) => r.rating > 0).length

  return (
    <div className="min-h-screen bg-darkBg">
      <Navbar onSearch={handleSearch} onOpenFavs={handleOpenFavs} />

      {/* ── DETAIL MODAL ── */}
      {detailFood && (
        <div className="fixed inset-0 z-50 bg-darkBg overflow-y-auto">
          <div className="min-h-full">
            <div className="sticky top-0 z-10 bg-darkBg/95 backdrop-blur-sm border-b border-darkBorder px-4 h-14 flex items-center justify-between">
              <button onClick={handleCloseDetail} className="flex items-center gap-2 text-textSecond hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                <span className="text-sm font-bold">Orqaga</span>
              </button>
              <button onClick={handleToggleFavDetail}
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${detailIsFav ? 'bg-red-400/10 border-red-400/40' : 'bg-darkCard border-darkBorder hover:border-red-400/40'}`}>
                <svg className={`w-4 h-4 transition-colors ${detailIsFav ? 'text-red-400' : 'text-textSecond'}`} fill={detailIsFav ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-5">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* CHAP */}
                <div className="lg:w-2/5 lg:sticky lg:top-20 lg:self-start">
                  <div className="rounded-2xl overflow-hidden border border-darkBorder mb-4">
                    <img src={detailFood.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=500&fit=crop'} alt={detailFood.name} className="w-full aspect-square object-cover" />
                  </div>
                  <div className="mb-4">
                    {detailFood.is_sale && detailFood.discounted_price && (
                      <span className="inline-block bg-orange/10 text-orange text-xs font-black px-2.5 py-1 rounded-full border border-orange/30 mb-2">
                        -{detailFood.discount_percent}% aksiya
                        {detailFood.sale_end && (
                          <span className="ml-1 opacity-70">
                            · {new Date(detailFood.sale_end).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' })} gacha
                          </span>
                        )}
                      </span>
                    )}
                    <h1 className="text-white font-black text-2xl mb-1">{detailFood.name}</h1>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-primary font-black text-2xl">{fmt(detailFood.discounted_price ?? detailFood.price)} so'm</span>
                      {detailFood.is_sale && detailFood.discounted_price && (
                        <span className="text-textMuted text-base line-through">{fmt(detailFood.price)} so'm</span>
                      )}
                    </div>
                    {detailAvg && (
                      <div className="flex items-center gap-2 mb-3">
                        <StarRating value={Math.round(detailAvg)} />
                        <span className="text-white font-black text-base">{detailAvg}</span>
                        <span className="text-textMuted text-sm">({detailRatedCnt} baho)</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {detailFood.calories     && <div className="flex-1 bg-darkCard rounded-xl p-2.5 text-center border border-darkBorder"><p className="text-orange font-black text-lg">{detailFood.calories}</p><p className="text-textMuted text-xs">kcal</p></div>}
                      {detailFood.weight_grams && <div className="flex-1 bg-darkCard rounded-xl p-2.5 text-center border border-darkBorder"><p className="text-teal font-black text-lg">{detailFood.weight_grams}</p><p className="text-textMuted text-xs">gram</p></div>}
                    </div>
                  </div>
                  {detailFood.description && <p className="text-textSecond text-sm leading-relaxed mb-4">{detailFood.description}</p>}

                  {/* Aksiyali taomlar — detail ichida */}
                  {saleItems.filter((f) => f.id !== detailFood.id).length > 0 && (
                    <div className="mb-4">
                      <p className="text-orange font-black text-xs mb-2">🔥 Boshqa aksiyalar:</p>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {saleItems.filter((f) => f.id !== detailFood.id).slice(0, 5).map((sf) => (
                          <div key={sf.id} onClick={() => handleOpenDetail(sf)}
                            className="shrink-0 w-28 bg-darkBg border border-orange/20 rounded-xl overflow-hidden cursor-pointer hover:border-orange/50 transition-all">
                            <img src={sf.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=150&fit=crop'} alt={sf.name} className="w-full h-16 object-cover" />
                            <div className="p-1.5">
                              <p className="text-white text-xs font-bold truncate">{sf.name}</p>
                              <p className="text-primary text-xs font-black">{fmt(sf.discounted_price)} so'm</p>
                              <p className="text-textMuted text-xs line-through">{fmt(sf.price)} so'm</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={() => { add(detailFood); handleCloseDetail() }}
                    disabled={detailFood.availability === 'unavailable'}
                    className="w-full py-3.5 rounded-full font-black text-base bg-gradient-to-r from-primary to-primaryHover text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-lg">
                    + Savatga qo'shish
                  </button>
                </div>

                {/* O'NG — Fikrlar */}
                <div className="lg:flex-1">
                  <div className="bg-darkCard rounded-2xl p-4 border border-darkBorder mb-5">
                    <h3 className="text-white font-black mb-3">✍️ Fikr qoldiring</h3>
                    <div className="mb-3">
                      <p className="text-textSecond text-xs mb-1.5">Baholang:</p>
                      <StarRating value={newStars} onChange={setNewStars} size="lg" />
                      {newStars > 0 && (
                        <p className="text-xs mt-1 font-bold text-yellow-400">
                          {newStars === 1 && '😞 Yomon'}{newStars === 2 && '😐 Qoniqarsiz'}{newStars === 3 && '🙂 Yaxshi'}{newStars === 4 && '😊 Juda yaxshi'}{newStars === 5 && '🤩 Ajoyib!'}
                        </p>
                      )}
                    </div>
                    <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Bu taom haqida fikringiz..." rows={3}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary resize-none mb-3 transition-colors" />
                    <button onClick={handleSendComment} disabled={!newComment.trim() || sending}
                      className="w-full py-2.5 rounded-full text-sm font-bold bg-primary text-white hover:bg-primaryHover disabled:opacity-50 transition-all">
                      {sending ? 'Yuborilmoqda...' : 'Yuborish →'}
                    </button>
                  </div>

                  <div className="mb-5">
                    <h3 className="text-white font-black mb-3">💬 Fikrlar ({reviews.length})</h3>
                    {reviewsLoading ? (
                      <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 rounded-2xl shimmer border border-darkBorder" />)}</div>
                    ) : reviews.length === 0 ? (
                      <div className="text-center py-10 bg-darkCard rounded-2xl border border-darkBorder">
                        <p className="text-3xl mb-2">💬</p>
                        <p className="text-textSecond font-bold text-sm">Hali fikr yo'q</p>
                        <p className="text-textMuted text-xs mt-1">Birinchi bo'lib fikr qoldiring!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reviews.map((r) => (
                          <div key={r.id} className="bg-darkCard rounded-2xl p-4 border border-darkBorder">
                            {r.rating > 0 && <div className="mb-2"><StarRating value={r.rating} /></div>}
                            <p className="text-white text-sm leading-relaxed mb-3">{r.comment}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-textMuted text-xs">{new Date(r.created_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                              <button onClick={() => handleLikeReview(r.id)}
                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${likedReviews[r.id] ? 'bg-red-400/10 border-red-400/30 text-red-400' : 'bg-darkBg border-darkBorder text-textSecond hover:border-red-400/30 hover:text-red-400'}`}>
                                <svg className="w-3.5 h-3.5" fill={likedReviews[r.id] ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                <span>{r.likes}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {relatedFoods.length > 0 && (
                    <div>
                      <h3 className="text-white font-black mb-3">🍽️ Shunga o'xshash</h3>
                      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                        {relatedFoods.map((rf) => (
                          <div key={rf.id} onClick={() => handleOpenDetail(rf)}
                            className="shrink-0 w-36 bg-darkCard border border-darkBorder rounded-2xl overflow-hidden cursor-pointer hover:border-primary/40 transition-all">
                            <img src={rf.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=150&fit=crop'} alt={rf.name} className="w-full h-24 object-cover" />
                            <div className="p-2.5">
                              <p className="text-white text-xs font-bold truncate">{rf.name}</p>
                              <p className="text-primary text-xs font-black mt-0.5">{fmt(rf.discounted_price ?? rf.price)} so'm</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── YOQTIRGANLAR ── */}
      {showFavs && (
        <div className="fixed inset-0 z-50 bg-darkBg overflow-y-auto">
          <div className="sticky top-0 z-10 bg-darkBg/95 backdrop-blur-sm border-b border-darkBorder px-4 h-14 flex items-center justify-between">
            <button onClick={() => setShowFavs(false)} className="flex items-center gap-2 text-textSecond hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <span className="text-sm font-bold">Orqaga</span>
            </button>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              <span className="text-white font-black text-sm">Yoqtirganlarim</span>
              <span className="text-textMuted text-xs">({favFoods.length})</span>
            </div>
            <div className="w-16" />
          </div>
          <div className="max-w-5xl mx-auto px-4 py-5">
            {favFoods.length === 0 ? (
              <div className="text-center py-24"><p className="text-6xl mb-4">❤️</p><p className="text-white font-black text-xl mb-2">Yoqtirganlar yo'q</p><p className="text-textMuted text-sm">Taom kartasidagi ❤️ tugmasini bosing</p></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {favFoods.map((f) => (
                  <FoodCard key={f.id} food={f} avgRating={foodRatings[f.id]} onOpenDetail={(food) => { setShowFavs(false); handleOpenDetail(food) }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-5">

        {/* Stol */}
        {sessionId ? (
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-teal/10 border border-teal/30">
            <div className="flex items-center gap-2">
              <span className="text-teal text-lg">🪑</span>
              <div><p className="text-teal font-black text-sm">Stol #{tableNumber} — Ulandi</p><p className="text-teal/70 text-xs">Buyurtma bera olasiz</p></div>
            </div>
            <button onClick={handleLeaveTable} className="text-xs font-bold px-3 py-1.5 rounded-full border border-teal/30 text-teal/70 hover:text-teal transition-colors">Chiqish</button>
          </div>
        ) : (
          <div className="rounded-2xl bg-darkCard border border-darkBorder overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📱</span>
                <div><p className="text-white font-black text-sm">Stolga ulanish</p><p className="text-textSecond text-xs">QR kodni skanerlang yoki kiriting</p></div>
              </div>
              <button onClick={() => setShowQrInput(!showQrInput)}
                className="px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-primary to-primaryHover text-white hover:opacity-90 transition-all">
                QR kiriting
              </button>
            </div>
            {showQrInput && (
              <div className="px-4 pb-4 border-t border-darkBorder pt-3">
                <div className="flex gap-2">
                  <input type="text" value={qrInput} onChange={(e) => setQrInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleQrScan()}
                    placeholder="QR kod qiymatini kiriting..."
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none bg-darkBg border border-darkBorder text-white placeholder-textMuted focus:border-primary transition-colors" />
                  <button onClick={handleQrScan} disabled={qrLoading}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primaryHover disabled:opacity-50 transition-colors">
                    {qrLoading ? '...' : 'Ulanish'}
                  </button>
                </div>
                {qrError && <p className="text-red-400 text-xs mt-2">⚠️ {qrError}</p>}
                <p className="text-textMuted text-xs mt-2">* QR kodni admin panelidan olishingiz mumkin</p>
              </div>
            )}
          </div>
        )}

        {/* Bannerlar — reklama uchun */}
        <BannerSlider banners={banners} />

        {/* ── AKSIYALI TAOMLAR — banner tagidan ── */}
        {saleItems.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🔥</span>
              <h2 className="text-white font-black text-lg">Aksiyalar</h2>
              <span className="text-xs px-2.5 py-1 rounded-full bg-orange/10 text-orange border border-orange/30 font-bold">{saleItems.length} ta</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {saleItems.map((food) => (
                <div key={food.id} onClick={() => handleOpenDetail(food)}
                  className="shrink-0 w-44 bg-darkCard border border-orange/30 rounded-2xl overflow-hidden cursor-pointer hover:border-orange/60 transition-all group">
                  <div className="relative h-32 overflow-hidden">
                    <img src={food.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'}
                      alt={food.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <span className="absolute top-2 left-2 bg-orange text-white text-xs font-black px-2 py-0.5 rounded-full">
                      -{food.discount_percent}%
                    </span>
                    {food.sale_end && (
                      <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                        ⏰ {new Date(food.sale_end).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' })} gacha
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-white text-xs font-bold truncate mb-1">{food.name}</p>
                    <p className="text-primary font-black text-sm">{fmt(food.discounted_price)} so'm</p>
                    <p className="text-textMuted text-xs line-through">{fmt(food.price)} so'm</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Menyu */}
        <div>
          <h2 className="text-lg font-black text-white mb-3">Menyu</h2>
          <CategoryPills categories={categories} activeCategoryId={activeCategoryId} onSelect={handleCategory} />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: LIMIT }).map((_, i) => <div key={i} className="rounded-2xl h-72 shimmer border border-darkBorder" />)}
          </div>
        ) : foods.length === 0 ? (
          <div className="text-center py-20"><p className="text-4xl mb-3">🍽️</p><p className="text-textSecond font-bold">Taom topilmadi</p></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {foods.map((food) => (
              <FoodCard key={food.id} food={food} avgRating={foodRatings[food.id]} onOpenDetail={handleOpenDetail} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 rounded-full text-sm font-bold bg-darkCard border border-darkBorder text-textSecond hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all">←</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${p === page ? 'bg-primary text-white' : 'bg-darkCard border border-darkBorder text-textSecond hover:border-primary'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 rounded-full text-sm font-bold bg-darkCard border border-darkBorder text-textSecond hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all">→</button>
          </div>
        )}
      </main>

      {pendingRating && (
        <button onClick={() => setCartOpen(true)}
          className="fixed bottom-24 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl bg-gradient-to-r from-yellow-500 to-orange text-white font-bold text-sm animate-pulse">
          ⭐ Xizmatni baholang
        </button>
      )}

      {totalQty > 0 && (
        <button onClick={() => setCartOpen(true)}
          className="fixed bottom-24 left-4 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-bold text-sm bg-gradient-to-r from-primary to-primaryHover text-white">
          🛒 {totalQty} ta <span className="opacity-60">|</span> {Number(totalPrice).toLocaleString()} so'm
        </button>
      )}

      <CartModal open={cartOpen} onClose={handleCartClose} onDelivered={handleDelivered} />
      <AiChatPanel />
    </div>
  )
}