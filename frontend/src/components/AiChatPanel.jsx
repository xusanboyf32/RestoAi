import { useState, useRef, useEffect } from 'react'
import { sendAiMessage } from '../api/aiApi'
import useCartStore from '../store/useCartStore'

const fmt = (n) => Number(n).toLocaleString('uz-UZ')

// Har klient uchun unique session_id
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
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: 'Salom! 👋 Men RestoAI yordamchisiman.\n\nMenga so\'rang:\n• "100 000 so\'mga nima yeyish mumkin?"\n• "Diabetim bor, tavsiya ber"\n• "Vegetarian taom bormi?"',
      items: [],
    }
  ])
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
        role:  'ai',
        text:  res.data.message,
        items: res.data.recommended_items || [],
      }])
    } catch {
      setMessages((m) => [...m, { role: 'ai', text: 'Xatolik yuz berdi. Qayta urinib ko\'ring.', items: [] }])
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (item) => {
    add({
      id:        item.menu_item_id,
      name:      item.name,
      price:     item.price,
      qty:       1,
      image_url: null,
    })
  }

  return (
    <>
      {/* Trigger */}
      <button onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 bg-gradient-to-br from-primary to-orange">
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      <div className={`fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 origin-bottom-right bg-darkCard border border-darkBorder
        ${open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-75 opacity-0 pointer-events-none'}`}>

        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-primary to-primaryHover flex items-center justify-between">
          <div>
            <p className="text-white font-black text-sm">🤖 RestoAI</p>
            <p className="text-white/70 text-xs">Taom tanlashda yordam beraman</p>
          </div>
          <button onClick={() => {
            setMessages([{ role: 'ai', text: 'Suhbat tozalandi. Yangi savol bering! 👋', items: [] }])
            sessionId.current = Math.random().toString(36).slice(2)
            localStorage.setItem('ai_session_id', sessionId.current)
          }} className="text-white/60 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
            🗑️
          </button>
        </div>

        {/* Messages */}
        <div className="h-72 overflow-y-auto p-3 flex flex-col gap-3 bg-darkMuted">
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {/* Xabar */}
              <div className={`max-w-[88%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap
                ${msg.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-darkCard text-white border border-darkBorder'}`}>
                {msg.text}
              </div>

              {/* Tavsiya qilingan taomlar */}
              {msg.role === 'ai' && msg.items?.length > 0 && (
                <div className="mt-2 w-full max-w-[88%] space-y-1.5">
                  <p className="text-textMuted text-xs px-1">🍽️ Tavsiya etilgan taomlar:</p>
                  {msg.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-darkCard border border-primary/20 rounded-xl px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold truncate">{item.name}</p>
                        <p className="text-primary text-xs font-black">{fmt(item.price)} so'm</p>
                      </div>
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="ml-2 shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center hover:bg-primaryHover transition-colors">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {/* Hammasini savatga */}
                  {msg.items.length > 1 && (
                    <button
                      onClick={() => msg.items.forEach((item) => handleAddToCart(item))}
                      className="w-full py-1.5 rounded-xl text-xs font-bold border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                      + Hammasini savatga qo'shish
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-darkCard px-3 py-2 rounded-2xl border border-darkBorder flex gap-1">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-2 h-2 bg-textMuted rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 2 && !loading && (
          <div className="px-3 py-2 bg-darkMuted border-t border-darkBorder flex gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => send(p)}
                className="shrink-0 px-2.5 py-1 rounded-full text-xs bg-darkCard border border-darkBorder text-textSecond hover:border-primary hover:text-primary transition-colors">
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-3 flex gap-2 bg-darkCard border-t border-darkBorder">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Savol yozing..."
            className="flex-1 px-3 py-2 rounded-full text-xs outline-none bg-darkBg border border-darkBorder text-white placeholder-textMuted focus:border-primary transition-colors"
          />
          <button onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-r from-primary to-orange disabled:opacity-50 transition-opacity">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
