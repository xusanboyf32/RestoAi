import { useState, useRef, useEffect } from 'react'
import useCartStore  from '../store/useCartStore'
import { createOrder, createRating, getOrderById } from '../api/orderApi'
import { scanQr } from '../api/tableApi'
import jsQR from 'jsqr'

const fmt = (n) => Number(n).toLocaleString('uz-UZ')

const STATUS_STEPS = [
  { key: 'pending',    label: 'Kutilmoqda',     icon: '⏳', color: 'text-yellow-400' },
  { key: 'accepted',   label: 'Qabul qilindi',  icon: '✅', color: 'text-blue-400'   },
  { key: 'preparing',  label: 'Tayyorlanmoqda', icon: '👨‍🍳', color: 'text-orange'     },
  { key: 'ready',      label: 'Tayyor!',        icon: '🍽️', color: 'text-teal'       },
  { key: 'delivering', label: 'Yetkazilmoqda',  icon: '🚀', color: 'text-primary'    },
  { key: 'delivered',  label: 'Yetkazildi',     icon: '🎉', color: 'text-green-400'  },
]

export default function CartModal({ open, onClose, onDelivered }) {
  const { items, increment, decrement, clear, totalPrice, setSession } = useCartStore()
  const [step,          setStep]          = useState('cart')
  const [loading,       setLoading]       = useState(false)
  const [orderId,       setOrderId]       = useState(null)
  const [orderData,     setOrderData]     = useState(null)
  const [orderStatus,   setOrderStatus]   = useState('pending')
  const [rating,        setRating]        = useState(0)
  const [hover,         setHover]         = useState(0)
  const [comment,       setComment]       = useState('')
  const [ratingLoading, setRatingLoading] = useState(false)

  const [showScanner, setShowScanner] = useState(false)
  const [qrError,     setQrError]     = useState('')
  const [scanning,    setScanning]    = useState(false)
  const videoRef     = useRef(null)
  const canvasRef    = useRef(null)
  const streamRef    = useRef(null)
  const animFrameRef = useRef(null)
  const pollRef      = useRef(null)

  const total = totalPrice()

  useEffect(() => {
    if (open) {
      // Agar baholash kutilayotgan bo'lsa
      const pendingRating = localStorage.getItem('pending_rating_order_id')
      if (pendingRating) {
        setOrderId(Number(pendingRating))
        setStep('rating')
        return
      }
      const savedSession = localStorage.getItem('table_session_id')
      if (!savedSession) setShowScanner(true)
      else setShowScanner(false)
      setStep('cart')
    }
  }, [open])

  useEffect(() => {
    if (showScanner && open) startCamera()
    else stopCamera()
    return () => stopCamera()
  }, [showScanner, open])

  useEffect(() => {
    if (step === 'tracking' && orderId) {
      pollRef.current = setInterval(async () => {
        try {
          const res   = await getOrderById(orderId)
          const order = res.data
          setOrderData(order)
          setOrderStatus(order.status)
          if (order.status === 'delivered') {
            clearInterval(pollRef.current)
            // Baholash kutilmoqda deb belgilaymiz
            localStorage.setItem('pending_rating_order_id', String(orderId))
            // Yuqoriga xabar beramiz — burchakda tugma chiqsin
            onDelivered?.()
          }
        } catch {}
      }, 3000)
    }
    return () => clearInterval(pollRef.current)
  }, [step, orderId])

  const startCamera = async () => {
    setQrError('')
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        requestAnimationFrame(scanFrame)
      }
    } catch {
      setQrError('Kameraga ruxsat berilmadi')
      setScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setScanning(false)
  }

  const scanFrame = () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame)
      return
    }
    const ctx = canvas.getContext('2d')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    if (code) handleQrFound(code.data)
    else animFrameRef.current = requestAnimationFrame(scanFrame)
  }

  const handleQrFound = async (qrValue) => {
    stopCamera()
    setQrError('')
    try {
      const res = await scanQr(qrValue)
      const { id, table_number } = res.data
      localStorage.setItem('table_session_id', id)
      localStorage.setItem('table_number', table_number)
      setSession(id)
      setShowScanner(false)
    } catch {
      setQrError('QR kod noto\'g\'ri yoki stol topilmadi')
      setScanning(false)
      setTimeout(() => startCamera(), 1500)
    }
  }

  const handleOrder = async () => {
    const sessionId = localStorage.getItem('table_session_id')
    if (!sessionId) { setShowScanner(true); return }
    if (!items.length) return
    setLoading(true)
    try {
      const res = await createOrder({
        table_session_id: Number(sessionId),
        items: items.map((i) => ({ menu_item_id: i.id, quantity: i.qty })),
      })
      setOrderId(res.data.id)
      setOrderData(res.data)
      setOrderStatus(res.data.status)
      clear()
      setStep('tracking')
    } catch {
      alert("Xatolik yuz berdi. Qayta urinib ko'ring.")
    } finally {
      setLoading(false)
    }
  }

  const handleRating = async () => {
    if (!rating) return
    setRatingLoading(true)
    try {
      const oid = orderId || Number(localStorage.getItem('pending_rating_order_id'))
      await createRating({ order_id: oid, rating, comment: comment || null })
      localStorage.removeItem('pending_rating_order_id')
      setStep('done')
    } catch {
      setStep('done')
    } finally {
      setRatingLoading(false)
    }
  }

  const handleSkipRating = () => {
    localStorage.removeItem('pending_rating_order_id')
    setStep('done')
  }

  const handleClose = () => {
    setStep('cart')
    setRating(0)
    setComment('')
    setOrderId(null)
    setOrderData(null)
    setOrderStatus('pending')
    setShowScanner(false)
    setQrError('')
    stopCamera()
    clearInterval(pollRef.current)
    onClose()
  }

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === orderStatus)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-darkCard border border-darkBorder overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-darkBorder sticky top-0 bg-darkCard z-10">
          <h3 className="text-base font-black text-white">
            {showScanner                         && '📷 QR Skaner'}
            {!showScanner && step === 'cart'     && '🛒 Savat'}
            {!showScanner && step === 'tracking' && '📦 Buyurtma holati'}
            {!showScanner && step === 'rating'   && '⭐ Xizmatni baholang'}
            {!showScanner && step === 'done'     && '🎉 Rahmat!'}
          </h3>
          <button onClick={handleClose}>
            <svg className="w-5 h-5 text-textSecond hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── QR SKANER ── */}
        {showScanner && (
          <div className="p-4">
            <p className="text-textSecond text-xs text-center mb-3">Stol ustidagi QR kodni kameraga tutib turing</p>
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square mb-3">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-primary rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-xl" />
                  {scanning && <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary animate-bounce" />}
                </div>
              </div>
            </div>
            {qrError && <p className="text-red-400 text-xs text-center mb-3">⚠️ {qrError}</p>}
            {!scanning && !qrError && (
              <button onClick={startCamera} className="w-full py-2.5 rounded-full text-sm font-bold bg-primary text-white hover:bg-primaryHover">
                Kamerani yoqish
              </button>
            )}
          </div>
        )}

        {/* ── CART ── */}
        {!showScanner && step === 'cart' && (
          items.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-4xl mb-3">🛒</p>
              <p className="text-textSecond font-bold">Savat bo'sh</p>
            </div>
          ) : (
            <>
              {localStorage.getItem('table_number') && (
                <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-teal/10 border border-teal/30 flex items-center gap-2">
                  <span className="text-teal text-sm">🪑</span>
                  <span className="text-teal text-xs font-bold">Stol #{localStorage.getItem('table_number')}</span>
                </div>
              )}
              <div className="max-h-64 overflow-y-auto p-4 space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60&h=60&fit=crop'} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-darkBorder" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{item.name}</p>
                      <p className="text-xs text-textSecond">{fmt(item.discounted_price ?? item.price)} so'm</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => decrement(item.id)} className="w-7 h-7 rounded-full bg-darkMuted text-white font-black text-sm flex items-center justify-center hover:bg-darkBorder transition-colors">−</button>
                      <span className="w-6 text-center text-sm font-black text-white">{item.qty}</span>
                      <button onClick={() => increment(item.id)} className="w-7 h-7 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center hover:bg-primaryHover transition-colors">+</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-darkBorder">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-textSecond text-sm">Jami:</span>
                  <span className="font-black text-xl text-primary">{fmt(total)} so'm</span>
                </div>
                <button onClick={handleOrder} disabled={loading}
                  className="w-full py-3 rounded-full font-black text-sm transition-all bg-gradient-to-r from-primary to-primaryHover text-white hover:opacity-90 disabled:opacity-50">
                  {loading ? 'Yuborilmoqda...' : 'Buyurtma berish →'}
                </button>
              </div>
            </>
          )
        )}

        {/* ── TRACKING ── */}
        {!showScanner && step === 'tracking' && orderData && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white font-black">Buyurtma #{orderData.id}</p>
                <p className="text-textMuted text-xs">🪑 Stol #{localStorage.getItem('table_number')}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            </div>

            {/* Progress */}
            <div className="relative mb-6">
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-darkBorder" />
              <div className="absolute top-4 left-4 h-0.5 bg-primary transition-all duration-700"
                style={{ width: `${currentStepIndex > 0 ? (currentStepIndex / (STATUS_STEPS.length - 1)) * 100 : 0}%` }} />
              <div className="relative flex justify-between">
                {STATUS_STEPS.map((s, idx) => {
                  const isDone    = idx < currentStepIndex
                  const isCurrent = idx === currentStepIndex
                  return (
                    <div key={s.key} className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all
                        ${isDone ? 'bg-primary border-primary text-white' : isCurrent ? 'bg-darkCard border-primary text-white animate-pulse' : 'bg-darkBg border-darkBorder text-textMuted'}`}>
                        {isDone ? '✓' : s.icon}
                      </div>
                      <p className={`text-xs font-bold text-center leading-tight max-w-12 ${isCurrent ? s.color : isDone ? 'text-primary' : 'text-textMuted'}`}>
                        {s.label}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Buyurtma */}
            <div className="bg-darkBg rounded-2xl p-3 mb-3">
              <p className="text-textSecond text-xs font-bold mb-2">Buyurtma tarkibi:</p>
              <div className="space-y-1.5">
                {orderData.items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span className="text-textSecond">{item.name} × {item.quantity}</span>
                    <span className="text-white font-bold">{fmt(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-darkBorder space-y-1">
                <div className="flex justify-between text-xs"><span className="text-textSecond">Taomlar:</span><span className="text-white">{fmt(orderData.total_price)} so'm</span></div>
                <div className="flex justify-between text-xs"><span className="text-textSecond">Xizmat haqi (10%):</span><span className="text-teal font-bold">{fmt(orderData.service_fee)} so'm</span></div>
                <div className="flex justify-between text-xs pt-1 border-t border-darkBorder"><span className="text-white font-bold">Jami:</span><span className="text-primary font-black">{fmt(orderData.final_price)} so'm</span></div>
              </div>
            </div>

            {/* Holat */}
            <div className={`rounded-xl px-4 py-3 mb-4 text-center border
              ${orderStatus === 'pending'    ? 'bg-yellow-400/10 border-yellow-400/30' :
                orderStatus === 'accepted'   ? 'bg-blue-400/10   border-blue-400/30'   :
                orderStatus === 'preparing'  ? 'bg-orange/10     border-orange/30'     :
                orderStatus === 'ready'      ? 'bg-teal/10       border-teal/30'       :
                orderStatus === 'delivering' ? 'bg-primary/10    border-primary/30'    :
                                              'bg-green-400/10   border-green-400/30'  }`}>
              <p className="text-white font-black text-sm">
                {STATUS_STEPS.find((s) => s.key === orderStatus)?.icon}{' '}
                {STATUS_STEPS.find((s) => s.key === orderStatus)?.label}
              </p>
              <p className="text-textMuted text-xs mt-0.5">
                {orderStatus === 'pending'    && 'Oshpaz buyurtmangizni qabul qilmoqda...'}
                {orderStatus === 'accepted'   && 'Oshpaz tayyorlashni boshladi!'}
                {orderStatus === 'preparing'  && 'Taomingiz tayyorlanmoqda, kuting...'}
                {orderStatus === 'ready'      && 'Taomingiz tayyor! Ofitsiant olib kelmoqda...'}
                {orderStatus === 'delivering' && 'Ofitsiant taomingizni olib kelmoqda!'}
                {orderStatus === 'delivered'  && 'Taomingiz yetkazildi. Xayrli ishtaha! 🎉'}
              </p>
            </div>

            {orderStatus === 'delivered' ? (
              <div className="space-y-2">
                <button onClick={() => setStep('rating')}
                  className="w-full py-3 rounded-full font-black text-sm bg-gradient-to-r from-primary to-primaryHover text-white hover:opacity-90">
                  ⭐ Xizmatni baholash
                </button>
                <button onClick={handleClose}
                  className="w-full py-2.5 rounded-full text-sm font-bold border border-darkBorder text-textSecond hover:border-primary transition-colors">
                  Keyinroq baholayman
                </button>
              </div>
            ) : (
              <button onClick={handleClose}
                className="w-full py-2.5 rounded-full text-sm font-bold border border-darkBorder text-textSecond hover:border-primary transition-colors">
                Yopish (holat saqlanadi)
              </button>
            )}
          </div>
        )}

        {/* ── RATING ── */}
        {!showScanner && step === 'rating' && (
          <div className="p-6">
            <div className="text-center mb-5">
              <p className="text-4xl mb-2">⭐</p>
              <p className="text-white font-black text-lg">Xizmatni baholang</p>
              <p className="text-textMuted text-xs mt-1">Ofitsiantimiz xizmatini qanday baholaysiz?</p>
            </div>
            <div className="flex justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)}
                  className="text-3xl transition-transform hover:scale-110">
                  <span className={star <= (hover || rating) ? 'text-yellow-400' : 'text-darkBorder'}>★</span>
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm font-bold mb-4 text-white">
                {rating === 1 && '😞 Yomon'}
                {rating === 2 && '😐 Qoniqarsiz'}
                {rating === 3 && '🙂 Yaxshi'}
                {rating === 4 && '😊 Juda yaxshi'}
                {rating === 5 && '🤩 Ajoyib!'}
              </p>
            )}
            <textarea value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Izoh (ixtiyoriy)..." rows={2}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none bg-darkBg border border-darkBorder text-white placeholder-textMuted focus:border-primary transition-colors mb-4" />
            <div className="flex gap-2">
              <button onClick={handleRating} disabled={!rating || ratingLoading}
                className="flex-1 py-3 rounded-full font-black text-sm bg-gradient-to-r from-primary to-primaryHover text-white hover:opacity-90 disabled:opacity-50 transition-all">
                {ratingLoading ? 'Yuborilmoqda...' : 'Yuborish →'}
              </button>
              <button onClick={handleSkipRating}
                className="px-4 py-3 rounded-full font-bold text-sm border border-darkBorder text-textSecond hover:border-primary transition-colors">
                O'tkazib yuborish
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {!showScanner && step === 'done' && (
          <div className="p-8 text-center">
            <p className="text-5xl mb-3">🎉</p>
            <p className="text-white font-black text-lg mb-1">Rahmat!</p>
            <p className="text-textSecond text-sm mb-6">Bahoyingiz qabul qilindi</p>
            <button onClick={handleClose}
              className="w-full py-3 rounded-full font-black text-sm bg-gradient-to-r from-primary to-primaryHover text-white hover:opacity-90">
              Yopish
            </button>
          </div>
        )}
      </div>
    </div>
  )
}