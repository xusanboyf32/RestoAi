import { useState, useEffect, useRef } from 'react'
import { useNavigate }       from 'react-router-dom'
import useAuthStore          from '../store/useAuthStore'
import ThemeToggle           from '../components/ThemeToggle'
import axios                 from '../api/axios'
import {
  getActiveOrders, updateOrderStatus,
  confirmPayment, getOpenIssues, resolveIssue
} from '../api/orderApi'

const STATUS_LABELS = {
  pending:    { label: 'Kutilmoqda',     color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  accepted:   { label: 'Qabul qilindi',  color: 'text-blue-400',   bg: 'bg-blue-400/10   border-blue-400/30'   },
  preparing:  { label: 'Tayyorlanmoqda', color: 'text-orange',     bg: 'bg-orange/10      border-orange/30'     },
  ready:      { label: 'Tayyor! 🔔',     color: 'text-teal',       bg: 'bg-teal/10        border-teal/30'       },
  delivering: { label: 'Yetkazilmoqda',  color: 'text-primary',    bg: 'bg-primary/10     border-primary/30'    },
  delivered:  { label: 'Yetkazildi',     color: 'text-green-400',  bg: 'bg-green-400/10   border-green-400/30'  },
  cancelled:  { label: 'Bekor',          color: 'text-red-400',    bg: 'bg-red-400/10     border-red-400/30'    },
}

const STATUS_TABS = [
  { key: 'all',        label: 'Hammasi'       },
  { key: 'ready',      label: 'Tayyor'        },
  { key: 'delivering', label: 'Yetkazilmoqda' },
]

const fmt     = (n)  => Number(n).toLocaleString('uz-UZ')
const fmtTime = (dt) => { if (!dt) return ''; return new Date(dt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) }
const fmtDate = (dt) => { if (!dt) return ''; return new Date(dt).toLocaleDateString('uz-UZ', { year: '2-digit', month: '2-digit', day: '2-digit' }) }

function StarRow({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <span key={s} className={`text-sm ${s <= Math.round(value) ? 'text-yellow-400' : 'text-darkBorder'}`}>★</span>
      ))}
    </div>
  )
}

export default function WaiterPage() {
  const [orders,      setOrders]      = useState([])
  const [issues,      setIssues]      = useState([])
  const [stats,       setStats]       = useState(null)
  const [myRatings,   setMyRatings]   = useState(null)
  const [showStats,   setShowStats]   = useState(false)
  const [showRatings, setShowRatings] = useState(false)
  const [mainTab,     setMainTab]     = useState('orders')
  const [statusTab,   setStatusTab]   = useState('all')
  const [loading,     setLoading]     = useState(false)

  const { logout, user, fetchMe } = useAuthStore()
  const navigate  = useNavigate()
  const wsRef     = useRef(null)
  const meRef     = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    let ws
    let interval

    fetchMe().then((me) => {
      if (!me) return
      meRef.current = me
      loadData(me)
      loadStats()
      loadMyRatings()

      // WebSocket — to'g'ri port 8001
      const wsUrl = `ws://localhost:8001/ws/waiter/${me.id}`
      ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen    = () => console.log('✅ WS ulandi')
      ws.onerror   = () => console.log('⚠️ WS xato')
      ws.onclose   = () => console.log('🔴 WS yopildi')

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (['order_ready', 'payment_requested', 'new_issue', 'status_changed', 'order_delivered'].includes(msg.type)) {
            loadData(meRef.current)
            loadStats()
          }
        } catch {}
      }

      // Polling — har 8 sekundda avto yangilanish (WS ishlamasa ham)
      interval = setInterval(() => {
        loadData(meRef.current)
        loadStats()
        loadMyRatings()
      }, 8000)

      intervalRef.current = interval
    })

    // Cleanup
    return () => {
      ws?.close()
      clearInterval(interval)
    }
  }, [])

  const loadData = async (me) => {
    const currentUser = me || meRef.current || user
    setLoading(true)
    try {
      const [ordersRes, issuesRes] = await Promise.all([
        getActiveOrders(),
        getOpenIssues(),
      ])
      let allOrders        = ordersRes.data
      const assignedTables = currentUser?.assigned_tables || []
      if (assignedTables.length > 0) {
        allOrders = allOrders.filter((o) => assignedTables.includes(o.table_number))
      }
      allOrders = allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setOrders(allOrders)
      setIssues(issuesRes.data)
    } catch {}
    finally { setLoading(false) }
  }

  const loadStats = async () => {
    try { const r = await axios.get('/orders/waiter-stats'); setStats(r.data) } catch {}
  }

  const loadMyRatings = async () => {
    try { const r = await axios.get('/orders/waiter-ratings'); setMyRatings(r.data) } catch {}
  }

  const handleStatus = async (oid, status) => {
    try { await updateOrderStatus(oid, { status }); loadData(meRef.current); loadStats() } catch {}
  }
  const handleConfirmPayment = async (oid) => {
    try { await confirmPayment(oid); loadData(meRef.current); loadStats() } catch {}
  }
  const handleResolveIssue = async (iid) => {
    try { await resolveIssue(iid); loadData(meRef.current) } catch {}
  }
  const handleLogout = async () => { await logout(); navigate('/login') }

  const filteredOrders = statusTab === 'all' ? orders : orders.filter((o) => o.status === statusTab)
  const readyCount     = orders.filter((o) => o.status === 'ready').length

  return (
    <div className="min-h-screen bg-darkBg">

      {/* ── ISH HAQI MODAL ── */}
      {showStats && stats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-darkCard border border-teal/30 rounded-2xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-black">💰 Ish haqi hisobi</h3>
              <button onClick={() => setShowStats(false)} className="text-textMuted hover:text-white text-xl">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-darkBg rounded-xl p-3 text-center">
                <p className="text-teal font-black text-base">{fmt(stats.daily)}</p>
                <p className="text-textMuted text-xs mt-0.5">Bugun</p>
                <p className="text-textMuted text-xs">{stats.daily_count ?? 0} ta</p>
              </div>
              <div className="bg-darkBg rounded-xl p-3 text-center">
                <p className="text-primary font-black text-base">{fmt(stats.weekly)}</p>
                <p className="text-textMuted text-xs mt-0.5">Haftalik</p>
                <p className="text-textMuted text-xs">{stats.weekly_count ?? 0} ta</p>
              </div>
              <div className="bg-darkBg rounded-xl p-3 text-center">
                <p className="text-orange font-black text-base">{fmt(stats.monthly)}</p>
                <p className="text-textMuted text-xs mt-0.5">Oylik</p>
                <p className="text-textMuted text-xs">{stats.monthly_count ?? 0} ta</p>
              </div>
            </div>
            <div className="bg-darkBg rounded-2xl p-4 mb-4 border border-orange/20">
              <p className="text-white text-xs font-black mb-3">📊 Oylik hisob-kitob (30 kun)</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-textSecond text-xs">Jami topildi:</span>
                  <span className="text-white font-bold text-sm">{fmt(stats.monthly)} so'm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-textSecond text-xs">Berildi:</span>
                  <span className="text-teal font-bold text-sm">{fmt(stats.total_paid ?? 0)} so'm</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-darkBorder">
                  <span className="text-white font-bold text-xs">Qoldi:</span>
                  <span className={`font-black text-base ${(stats.remaining ?? 0) > 0 ? 'text-orange' : 'text-textMuted'}`}>
                    {fmt(stats.remaining ?? 0)} so'm
                  </span>
                </div>
              </div>
            </div>
            {user?.assigned_tables?.length > 0 && (
              <div className="mb-4 px-3 py-2 rounded-xl bg-darkBg">
                <p className="text-textMuted text-xs mb-1">Biriktirilgan stollar:</p>
                <div className="flex gap-1 flex-wrap">
                  {user.assigned_tables.map((n) => (
                    <span key={n} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">#{n}</span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-textSecond text-xs font-bold mb-2">Oxirgi 7 kun:</p>
            <div className="space-y-2">
              {stats.daily_history?.map((day) => (
                <div key={day.date} className="flex items-center justify-between bg-darkBg rounded-xl px-3 py-2">
                  <div>
                    <p className="text-white text-xs font-bold">{day.date}</p>
                    <p className="text-textMuted text-xs">{day.orders} ta zakaz</p>
                  </div>
                  <p className={`text-sm font-black ${day.amount > 0 ? 'text-teal' : 'text-textMuted'}`}>
                    {fmt(day.amount)} so'm
                  </p>
                </div>
              ))}
            </div>
            <p className="text-textMuted text-xs text-center mt-3">Har bir zakazdan 10% xizmat haqi</p>
          </div>
        </div>
      )}

      {/* ── REYTING MODAL ── */}
      {showRatings && myRatings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-darkCard border border-yellow-400/30 rounded-2xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-black">⭐ Mening reytinglarim</h3>
              <button onClick={() => setShowRatings(false)} className="text-textMuted hover:text-white text-xl">✕</button>
            </div>
            <div className="bg-darkBg rounded-2xl p-4 mb-4 text-center border border-darkBorder">
              <p className="text-5xl font-black text-yellow-400 mb-1">{myRatings.avg_rating || '—'}</p>
              <StarRow value={myRatings.avg_rating || 0} />
              <p className="text-textMuted text-xs mt-2">{myRatings.total_count} ta baholash</p>
            </div>
            {myRatings.ratings?.length === 0 ? (
              <div className="text-center py-8 bg-darkBg rounded-2xl border border-darkBorder">
                <p className="text-3xl mb-2">⭐</p>
                <p className="text-textSecond text-sm">Hali baholash yo'q</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myRatings.ratings?.map((r) => (
                  <div key={r.id} className="bg-darkBg rounded-2xl p-3 border border-darkBorder">
                    <div className="flex items-center justify-between mb-1.5">
                      <StarRow value={r.rating} />
                      <div className="flex items-center gap-2 text-xs text-textMuted">
                        <span>🪑 #{r.table_number}</span>
                        <span>{new Date(r.created_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                      </div>
                    </div>
                    {r.comment && <p className="text-textSecond text-sm">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-darkBg border-b border-darkBorder">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal to-primary flex items-center justify-center">
              <span className="text-white text-xs font-black">W</span>
            </div>
            <div>
              <p className="text-white font-black text-sm">Ofitsiant paneli</p>
              {user && (
                <p className="text-textMuted text-xs">
                  {user.full_name}
                  {user.assigned_tables?.length > 0 && (
                    <span className="ml-1 text-primary">· Stollar: {user.assigned_tables.join(', ')}</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {myRatings && (
              <button onClick={() => setShowRatings(true)}
                className="flex flex-col items-center px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 hover:bg-yellow-400/20 transition-colors">
                <span className="text-yellow-400 font-black text-xs">⭐ {myRatings.avg_rating || '—'}</span>
                <span className="text-yellow-400/60 text-xs">{myRatings.total_count} baho</span>
              </button>
            )}
            {stats && (
              <button onClick={() => setShowStats(true)}
                className="flex flex-col items-center px-3 py-1 rounded-full bg-teal/10 border border-teal/30 hover:bg-teal/20 transition-colors">
                <span className="text-teal font-black text-xs">💰 {fmt(stats.daily)} so'm</span>
                <span className="text-teal/60 text-xs">{stats.daily_count ?? 0} ta bugun</span>
              </button>
            )}
            <button onClick={() => { loadData(meRef.current); loadStats(); loadMyRatings() }}
              className="w-8 h-8 rounded-full bg-darkCard border border-darkBorder flex items-center justify-center hover:border-primary transition-colors">
              <svg className="w-4 h-4 text-textSecond" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <ThemeToggle />
            <button onClick={handleLogout} className="text-xs font-bold px-3 py-1.5 rounded-full border border-darkBorder text-textSecond hover:border-primary transition-colors">
              Chiqish
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex gap-2 mb-4">
          {[
            { key: 'orders', label: `Buyurtmalar (${orders.length})` },
            { key: 'issues', label: `Muammolar (${issues.length})`, alert: issues.length > 0 },
          ].map((t) => (
            <button key={t.key} onClick={() => setMainTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all relative ${mainTab === t.key ? 'bg-primary text-white' : 'bg-darkCard border border-darkBorder text-textSecond hover:border-primary'}`}>
              {t.label}
              {t.alert && mainTab !== t.key && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange" />
              )}
            </button>
          ))}
        </div>

        {mainTab === 'orders' && (
          <>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {STATUS_TABS.map((t) => {
                const count = t.key === 'all' ? orders.length : orders.filter((o) => o.status === t.key).length
                return (
                  <button key={t.key} onClick={() => setStatusTab(t.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all relative ${statusTab === t.key ? 'bg-primary text-white' : 'bg-darkCard border border-darkBorder text-textSecond hover:border-primary'}`}>
                    {t.label}
                    {count > 0 && (
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-black ${statusTab === t.key ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'}`}>
                        {count}
                      </span>
                    )}
                    {t.key === 'ready' && readyCount > 0 && statusTab !== 'ready' && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange animate-pulse" />
                    )}
                  </button>
                )
              })}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1,2,3,4].map((i) => <div key={i} className="h-48 rounded-2xl shimmer border border-darkBorder" />)}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-textSecond font-bold">Buyurtma yo'q</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredOrders.map((order) => {
                  const st = STATUS_LABELS[order.status] || STATUS_LABELS.pending
                  return (
                    <div key={order.id} className={`bg-darkCard border rounded-2xl p-4 transition-all ${order.status === 'ready' ? 'border-teal/50 shadow-teal/10 shadow-lg' : 'border-darkBorder'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-white font-black text-sm">Buyurtma #{order.id}</p>
                          <p className="text-textMuted text-xs mt-0.5">🪑 Stol #{order.table_number || order.table_session_id}</p>
                          <p className="text-textMuted text-xs">🕐 Keldi: {fmtDate(order.created_at)} {fmtTime(order.created_at)}</p>
                          {order.ready_at     && <p className="text-teal text-xs font-bold">🍽️ Tayyor: {fmtTime(order.ready_at)}</p>}
                          {order.delivered_at && <p className="text-green-400 text-xs">📦 Yetkazildi: {fmtTime(order.delivered_at)}</p>}
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${st.bg} ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="space-y-1 mb-2">
                        {order.items?.map((item) => (
                          <div key={item.id} className="flex justify-between text-xs">
                            <span className="text-textSecond">{item.name} × {item.quantity}</span>
                            <span className="text-white font-bold">{fmt(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="bg-darkBg rounded-xl p-2.5 mb-3 space-y-1">
                        <div className="flex justify-between text-xs"><span className="text-textSecond">Taomlar:</span><span className="text-white">{fmt(order.total_price)} so'm</span></div>
                        <div className="flex justify-between text-xs"><span className="text-textSecond">Xizmat haqi (10%):</span><span className="text-teal font-bold">{fmt(order.service_fee)} so'm</span></div>
                        <div className="flex justify-between text-xs pt-1 border-t border-darkBorder">
                          <span className="text-white font-bold">Jami:</span>
                          <span className="text-primary font-black">{fmt(order.final_price)} so'm</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {order.status === 'ready' && (
                          <button onClick={() => handleStatus(order.id, 'delivering')}
                            className="flex-1 py-2 rounded-full text-xs font-bold bg-teal text-white hover:opacity-80 transition-opacity">
                            🚀 Yetkazish
                          </button>
                        )}
                        {order.status === 'delivering' && (
                          <button onClick={() => handleStatus(order.id, 'delivered')}
                            className="flex-1 py-2 rounded-full text-xs font-bold bg-green-500 text-white hover:opacity-80 transition-opacity">
                            ✓ Yetkazildi
                          </button>
                        )}
                        {(order.payment_status === 'cash' || order.payment_status === 'card') && (
                          <button onClick={() => handleConfirmPayment(order.id)}
                            className="flex-1 py-2 rounded-full text-xs font-bold bg-primary text-white hover:opacity-80 transition-opacity">
                            💳 To'lov ({order.payment_status === 'cash' ? 'Naqd' : 'Karta'})
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {mainTab === 'issues' && (
          issues.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-textSecond font-bold">Ochiq muammo yo'q</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {issues.map((issue) => (
                <div key={issue.id} className="bg-darkCard border border-orange/30 rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white font-black text-sm">Muammo #{issue.id}</p>
                      <p className="text-textMuted text-xs">Buyurtma #{issue.order_id}</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange/10 text-orange border border-orange/30">Ochiq</span>
                  </div>
                  <p className="text-textSecond text-xs mb-1">Tur: <span className="text-white">{issue.issue_type}</span></p>
                  {issue.description && <p className="text-textSecond text-xs mb-3">{issue.description}</p>}
                  <button onClick={() => handleResolveIssue(issue.id)}
                    className="w-full py-2 rounded-full text-xs font-bold bg-teal text-white hover:opacity-80 transition-opacity">
                    ✓ Hal qilindi
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  )
}
