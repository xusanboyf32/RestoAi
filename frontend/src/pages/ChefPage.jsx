import { useState, useEffect, useRef } from 'react'
import { useNavigate }    from 'react-router-dom'
import useAuthStore       from '../store/useAuthStore'
import ThemeToggle        from '../components/ThemeToggle'
import { getActiveOrders, updateOrderStatus } from '../api/orderApi'

const STATUS_FLOW = {
  pending:   { next: 'accepted',  label: 'Qabul qilish',       color: 'bg-primary'   },
  accepted:  { next: 'preparing', label: 'Tayyorlash',         color: 'bg-orange'    },
  preparing: { next: 'ready',     label: 'Tayyor!',            color: 'bg-teal'      },
  ready:     { next: null,        label: 'Ofitsiant kutmoqda', color: 'bg-darkMuted' },
}

const STATUS_LABELS = {
  pending:   { label: 'Yangi',          color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  accepted:  { label: 'Qabul qilindi',  color: 'text-blue-400',   bg: 'bg-blue-400/10   border-blue-400/30'   },
  preparing: { label: 'Tayyorlanmoqda', color: 'text-orange',     bg: 'bg-orange/10     border-orange/30'     },
  ready:     { label: 'Tayyor',         color: 'text-teal',       bg: 'bg-teal/10       border-teal/30'       },
}

const fmt     = (n)  => Number(n).toLocaleString('uz-UZ')
const fmtTime = (dt) => {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}
const fmtDate = (dt) => {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' })
}

export default function ChefPage() {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(false)
  const [filter,  setFilter]  = useState('all')
  const { logout, user, fetchMe } = useAuthStore()
  const navigate = useNavigate()
  const wsRef    = useRef(null)

  useEffect(() => {
    fetchMe()
    loadOrders()
    wsRef.current = new WebSocket('ws://localhost:8000/ws/chef')
    wsRef.current.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'new_order') loadOrders()
    }
    return () => wsRef.current?.close()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const res = await getActiveOrders()
      const sorted = [...res.data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setOrders(sorted)
    } catch {}
    finally { setLoading(false) }
  }

  const handleNext = async (orderId, nextStatus) => {
    if (!nextStatus) return
    try { await updateOrderStatus(orderId, { status: nextStatus }); loadOrders() } catch {}
  }

  const handleLogout = async () => { await logout(); navigate('/login') }

  const filteredOrders = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  return (
    <div className="min-h-screen bg-darkBg">
      <header className="sticky top-0 z-50 bg-darkBg border-b border-darkBorder">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange to-primary flex items-center justify-center">
              <span className="text-white text-xs font-black">C</span>
            </div>
            <div>
              <p className="text-white font-black text-sm">Oshpaz paneli</p>
              {user && <p className="text-textMuted text-xs">{user.full_name}</p>}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            {[
              { key: 'pending',   label: 'Yangi',         color: 'text-yellow-400' },
              { key: 'preparing', label: 'Tayyorlanmoqda', color: 'text-orange'    },
              { key: 'ready',     label: 'Tayyor',        color: 'text-teal'       },
            ].map((s) => (
              <div key={s.key} className="text-center">
                <p className={`text-lg font-black ${s.color}`}>
                  {orders.filter((o) => o.status === s.key).length}
                </p>
                <p className="text-textMuted text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={loadOrders}
              className="w-8 h-8 rounded-full bg-darkCard border border-darkBorder flex items-center justify-center hover:border-primary transition-colors">
              <svg className="w-4 h-4 text-textSecond" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <ThemeToggle />
            <button onClick={handleLogout}
              className="text-xs font-bold px-3 py-1.5 rounded-full border border-darkBorder text-textSecond hover:border-primary transition-colors">
              Chiqish
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5">
        <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
          {[
            { key: 'all',       label: `Hammasi (${orders.length})` },
            { key: 'pending',   label: `Yangi (${orders.filter(o=>o.status==='pending').length})` },
            { key: 'accepted',  label: `Qabul (${orders.filter(o=>o.status==='accepted').length})` },
            { key: 'preparing', label: `Tayyorlanmoqda (${orders.filter(o=>o.status==='preparing').length})` },
            { key: 'ready',     label: `Tayyor (${orders.filter(o=>o.status==='ready').length})` },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all
                ${filter === f.key
                  ? 'bg-primary text-white'
                  : 'bg-darkCard border border-darkBorder text-textSecond hover:border-primary'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map((i) => <div key={i} className="h-56 rounded-2xl shimmer border border-darkBorder" />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">👨‍🍳</p>
            <p className="text-textSecond font-bold">Buyurtma yo'q</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const st   = STATUS_LABELS[order.status] || STATUS_LABELS.pending
              const flow = STATUS_FLOW[order.status]
              return (
                <div key={order.id}
                  className={`bg-darkCard rounded-2xl p-4 border card-hover
                    ${order.status === 'pending' ? 'border-yellow-400/40' : 'border-darkBorder'}`}>

                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white font-black">Buyurtma #{order.id}</p>
                      <p className="text-textMuted text-xs">🪑 Stol #{order.table_number || order.table_session_id}</p>
                      <p className="text-textMuted text-xs">
                        🕐 Keldi: {fmtDate(order.created_at)} {fmtTime(order.created_at)}
                      </p>
                      {order.accepted_at && (
                        <p className="text-blue-400 text-xs">✅ Qabul: {fmtTime(order.accepted_at)}</p>
                      )}
                      {order.ready_at && (
                        <p className="text-teal text-xs font-bold">🍽️ Tayyor: {fmtTime(order.ready_at)}</p>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${st.bg} ${st.color}`}>
                      {st.label}
                    </span>
                  </div>

                  {/* Taomlar */}
                  <div className="space-y-1.5 mb-3">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="text-textSecond text-sm">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-textMuted text-xs">{fmt(item.price)} so'm</span>
                          <span className="text-white font-bold text-sm">×{item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Narx breakdown */}
                  <div className="bg-darkBg rounded-xl p-2.5 mb-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-textSecond">Taomlar:</span>
                      <span className="text-white">{fmt(order.total_price)} so'm</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-textSecond">Xizmat haqi (10%):</span>
                      <span className="text-teal font-bold">{fmt(order.service_fee)} so'm</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-darkBorder">
                      <span className="text-white font-bold">Jami:</span>
                      <span className="text-primary font-black">{fmt(order.final_price)} so'm</span>
                    </div>
                  </div>

                  {order.note && (
                    <p className="text-xs text-orange bg-orange/10 border border-orange/20 rounded-xl px-3 py-2 mb-3">
                      📝 {order.note}
                    </p>
                  )}

                  {flow && (
                    <button onClick={() => handleNext(order.id, flow.next)}
                      disabled={!flow.next}
                      className={`w-full py-2.5 rounded-full text-sm font-bold transition-all
                        text-white hover:opacity-80 disabled:opacity-50 disabled:cursor-default
                        ${flow.color}`}>
                      {flow.label}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}