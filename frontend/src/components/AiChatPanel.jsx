import { useState, useRef, useEffect } from 'react'
import { sendAiMessage } from '../api/aiApi'
import useCartStore from '../store/useCartStore'

const fmt = (n) => Number(n).toLocaleString('uz-UZ')

const getSessionId = () => {
  let id = localStorage.getItem('ai_session_id')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('ai_session_id', id)
  }
  return id
}

const QUICK_PROMPTS = [
  '100 000 so\'mga nima yeyish mumkin?',
  'Diabetim bor, tavsiya ber',
  'Vegetarian taom bormi?',
  'Eng mashhur taomlar',
  'Shirin narsa istayapman',
]

export default function AiChatPanel() {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState([{
    role: 'ai',
    text: 'Salom! 👋 Men RestoAI yordamchisiman.\n\nSo\'rang:\n• "100 000 so\'mga nima yeyish mumkin?"\n• "Diabetim bor, tavsiya ber"\n• "Vegetarian taom bormi?"',
    items: [],
  }])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef             = useRef(null)
  const sessionId             = useRef(getSessionId())
  const add                   = useCartStore((s) => s.add)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: msg, items: [] }])
    setLoading(true)
    try {
      const res = await sendAiMessage(msg, sessionId.current)
      setMessages((m) => [...m, {
        role: 'ai',
        text: res.data.message,
        items: res.data.recommended_items || [],
      }])
    } catch {
      setMessages((m) => [...m, { role: 'ai', text: 'Xatolik yuz berdi. Qayta urinib ko\'ring.', items: [] }])
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (item) => {
    add({ id: item.menu_item_id, name: item.name, price: item.price, qty: 1, image_url: null })
  }

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl shadow-glow flex items-center justify-center
          bg-gradient-to-br from-primary to-teal transition-all duration-300 hover:scale-110 active:scale-95">
        {open ? (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        )}
      </button>

      {/* ── Panel ── */}
      <div className={`fixed bottom-24 right-6 z-50 w-[calc(100vw-48px)] sm:w-96 rounded-2xl overflow-hidden shadow-[0_8px_48px_rgba(0,0,0,0.8)] border border-darkBorder
        transition-all duration-300 origin-bottom-right bg-darkCard
        ${open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'}`}>

        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-darkBg to-darkMuted border-b border-darkBorder flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-teal flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">RestoAI</p>
              <p className="text-textMuted text-[11px] mt-0.5">Taom tanlashda yordam</p>
            </div>
          </div>
          <button
            onClick={() => {
              setMessages([{ role: 'ai', text: 'Suhbat tozalandi. Yangi savol bering! 👋', items: [] }])
              sessionId.current = Math.random().toString(36).slice(2)
              localStorage.setItem('ai_session_id', sessionId.current)
            }}
            className="w-7 h-7 rounded-lg bg-darkCard border border-darkBorder flex items-center justify-center
              hover:border-red-400/40 hover:text-red-400 text-textMuted transition-all text-xs">
            🗑️
          </button>
        </div>

        {/* Messages */}
        <div className="h-64 overflow-y-auto p-3 flex flex-col gap-3 bg-darkBg/50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[88%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap
                ${msg.role === 'user'
                  ? 'bg-primary text-white rounded-tr-sm'
                  : 'bg-darkCard border border-darkBorder text-white rounded-tl-sm'
                }`}>
                {msg.text}
              </div>

              {msg.role === 'ai' && msg.items?.length > 0 && (
                <div className="mt-2 w-full max-w-[88%] space-y-1.5">
                  <p className="text-textMuted text-[11px] px-1">🍽️ Tavsiya etilgan:</p>
                  {msg.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-darkCard border border-primary/20 rounded-xl px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold truncate">{item.name}</p>
                        <p className="text-primary text-xs font-bold">{fmt(item.price)} so'm</p>
                      </div>
                      <button onClick={() => handleAddToCart(item)}
                        className="ml-2 shrink-0 w-7 h-7 rounded-xl bg-primary flex items-center justify-center hover:bg-primaryHover transition-colors">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {msg.items.length > 1 && (
                    <button onClick={() => msg.items.forEach((item) => handleAddToCart(item))}
                      className="w-full py-1.5 rounded-xl text-xs font-bold border border-primary/25 text-primary hover:bg-primary/10 transition-colors">
                      + Hammasini savatga
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-darkCard border border-darkBorder px-3 py-2.5 rounded-2xl rounded-tl-sm flex gap-1.5">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 2 && !loading && (
          <div className="px-3 py-2 bg-darkBg border-t border-darkBorder flex gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => send(p)}
                className="shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-medium
                  bg-darkCard border border-darkBorder text-textSecond
                  hover:border-primary/50 hover:text-primary transition-all duration-200">
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-3 flex gap-2 bg-darkCard border-t border-darkBorder">
          <input
            type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Savol yozing..."
            className="flex-1 px-3 py-2 rounded-xl text-xs outline-none
              bg-darkBg border border-darkBorder text-white placeholder-textMuted
              focus:border-primary transition-colors"
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0
              bg-gradient-to-br from-primary to-teal disabled:opacity-40 transition-all
              hover:shadow-glow-sm active:scale-95">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}