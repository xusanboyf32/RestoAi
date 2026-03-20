import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import useAuthStore            from '../store/useAuthStore'
import ThemeToggle             from '../components/ThemeToggle'
import axios                   from '../api/axios'
import {
  getCategories, getMenuItems, createCategory,
  deleteCategory, createMenuItem, deleteMenuItem,
  createBanner, deleteBanner, getBanners
} from '../api/menuApi'
import { getTables, createTable, closeSession } from '../api/tableApi'

const fmt     = (n)  => Number(n).toLocaleString('uz-UZ')
const fmtTime = (dt) => { if (!dt) return '—'; return new Date(dt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) }
const fmtDate = (dt) => { if (!dt) return '—'; return new Date(dt).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: '2-digit' }) }

const FOOD_TYPES = [
  { value: 'main',    label: '🍽️ Asosiy taom' },
  { value: 'soup',    label: '🍲 Sho\'rva'     },
  { value: 'salad',   label: '🥗 Salat'        },
  { value: 'side',    label: '🍚 Garnitür'     },
  { value: 'snack',   label: '🥨 Gazak'        },
  { value: 'dessert', label: '🍰 Shirinlik'    },
  { value: 'drink',   label: '🥤 Ichimlik'     },
  { value: 'bread',   label: '🍞 Non'          },
  { value: 'sauce',   label: '🫙 Sous'         },
]

const FOOD_TYPE_MAP = Object.fromEntries(FOOD_TYPES.map((t) => [t.value, t.label]))

const EMPTY_ITEM = {
  name: '', price: '', category_id: '', description: '', image_url: '',
  calories: '', weight_grams: '', sort_order: 0,
  food_type: '',
  is_fatty: false, is_salty: false, is_sweet: false,
  is_spicy: false, is_vegetarian: false, has_sugar: false,
  is_diabetes_safe: false, is_heart_safe: false,
  is_stomach_safe: false, is_pressure_safe: false, is_gluten_free: false,
  is_sale: false, discount_percent: '', discount_label: '', sale_start: '', sale_end: '',
}

const uploadFile = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const res  = await fetch('/api/upload/image', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Xatolik')
  return data.url
}

function StarRow({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <span key={i} className={`text-sm ${i <= Math.round(value) ? 'text-yellow-400' : 'text-darkBorder'}`}>★</span>
      ))}
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${checked ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-darkBg border-darkBorder text-textSecond hover:border-primary/30'}`}>
      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${checked ? 'border-primary bg-primary' : 'border-textMuted'}`}>
        {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
      {label}
    </button>
  )
}

function ItemForm({ form, setForm, categories, imgLoading, setImgLoading, onSave, onCancel, saveLabel = 'Saqlash' }) {
  return (
    <div className="space-y-4">

      {/* Asosiy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Taom nomi *" className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary" />
        <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
          type="number" placeholder="Narx (so'm) *" className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary" />
        <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white outline-none focus:border-primary">
          <option value="">Kategoriya tanlang *</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
        <select value={form.food_type} onChange={(e) => setForm({ ...form, food_type: e.target.value })}
          className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white outline-none focus:border-primary">
          <option value="">Taom turi tanlang</option>
          {FOOD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })}
          type="number" placeholder="Kaloriya" className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary" />
        <input value={form.weight_grams} onChange={(e) => setForm({ ...form, weight_grams: e.target.value })}
          type="number" placeholder="Og'irlik (g)" className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary" />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Tavsif" rows={2} className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary sm:col-span-2 resize-none" />
        <div className="sm:col-span-2">
          {form.image_url && <img src={form.image_url} alt="preview" className="w-full h-28 object-cover rounded-xl mb-2 border border-darkBorder" />}
          <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl cursor-pointer border border-dashed transition-colors bg-darkBg text-sm font-bold ${imgLoading ? 'border-primary text-primary' : 'border-darkBorder text-textSecond hover:border-primary'}`}>
            {imgLoading
              ? <><div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />Yuklanmoqda...</>
              : <>📷 {form.image_url ? 'Rasmni almashtirish' : 'Rasm tanlang'}</>}
            <input type="file" accept="image/*" className="hidden" disabled={imgLoading}
              onChange={async (e) => {
                const file = e.target.files[0]
                if (!file) return
                setImgLoading(true)
                try { const url = await uploadFile(file); setForm((prev) => ({ ...prev, image_url: url })) }
                catch { alert('Rasm yuklashda xatolik') }
                finally { setImgLoading(false) }
              }} />
          </label>
        </div>
      </div>

      {/* Aksiya */}
      <div className="bg-darkBg rounded-2xl p-3 border border-orange/30">
        <div className="flex items-center justify-between mb-3">
          <p className="text-orange text-xs font-bold">🔥 Aksiya sozlamalari</p>
          <Toggle label="Aksiya yoqish" checked={form.is_sale} onChange={(v) => setForm({ ...form, is_sale: v })} />
        </div>
        {form.is_sale && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-textMuted text-xs mb-1">Chegirma foizi *</p>
              <div className="flex items-center gap-2">
                <input value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                  type="number" min="1" max="100" placeholder="Masalan: 25"
                  className="flex-1 px-3 py-2 rounded-xl text-sm bg-darkCard border border-darkBorder text-white placeholder-textMuted outline-none focus:border-orange" />
                <span className="text-orange font-black text-sm">%</span>
              </div>
              {form.discount_percent && form.price && (
                <p className="text-xs text-teal mt-1">
                  Aksiyali narx: {fmt(Math.round(Number(form.price) - Number(form.price) * Number(form.discount_percent) / 100))} so'm
                </p>
              )}
            </div>
            <div>
              <p className="text-textMuted text-xs mb-1">Aksiya yorlig'i (ixtiyoriy)</p>
              <input value={form.discount_label} onChange={(e) => setForm({ ...form, discount_label: e.target.value })}
                placeholder="Masalan: Haftalik aksiya"
                className="w-full px-3 py-2 rounded-xl text-sm bg-darkCard border border-darkBorder text-white placeholder-textMuted outline-none focus:border-orange" />
            </div>
            <div>
              <p className="text-textMuted text-xs mb-1">Aksiya boshlanish sanasi *</p>
              <input value={form.sale_start} onChange={(e) => setForm({ ...form, sale_start: e.target.value })}
                type="datetime-local"
                className="w-full px-3 py-2 rounded-xl text-sm bg-darkCard border border-darkBorder text-white outline-none focus:border-orange" />
            </div>
            <div>
              <p className="text-textMuted text-xs mb-1">Aksiya tugash sanasi *</p>
              <input value={form.sale_end} onChange={(e) => setForm({ ...form, sale_end: e.target.value })}
                type="datetime-local"
                className="w-full px-3 py-2 rounded-xl text-sm bg-darkCard border border-darkBorder text-white outline-none focus:border-orange" />
            </div>
          </div>
        )}
      </div>

      {/* Xususiyatlar */}
      <div className="bg-darkBg rounded-2xl p-3 border border-darkBorder">
        <p className="text-textSecond text-xs font-bold mb-2">🏷️ Taom xususiyatlari</p>
        <div className="flex flex-wrap gap-2">
          <Toggle label="🥩 Yog'li"      checked={form.is_fatty}      onChange={(v) => setForm({ ...form, is_fatty: v })} />
          <Toggle label="🧂 Sho'r"       checked={form.is_salty}      onChange={(v) => setForm({ ...form, is_salty: v })} />
          <Toggle label="🍬 Shirin"      checked={form.is_sweet}      onChange={(v) => setForm({ ...form, is_sweet: v })} />
          <Toggle label="🌶️ Achchiq"    checked={form.is_spicy}      onChange={(v) => setForm({ ...form, is_spicy: v })} />
          <Toggle label="🥦 Vegetarian" checked={form.is_vegetarian} onChange={(v) => setForm({ ...form, is_vegetarian: v })} />
          <Toggle label="🍭 Shakar bor" checked={form.has_sugar}     onChange={(v) => setForm({ ...form, has_sugar: v })} />
        </div>
      </div>

      {/* Kasalliklar */}
      <div className="bg-darkBg rounded-2xl p-3 border border-darkBorder">
        <p className="text-textSecond text-xs font-bold mb-2">🏥 Kasalliklar uchun xavfsizligi</p>
        <div className="flex flex-wrap gap-2">
          <Toggle label="💉 Diabet"    checked={!!form.is_diabetes_safe} onChange={(v) => setForm({ ...form, is_diabetes_safe: v })} />
          <Toggle label="❤️ Yurak"     checked={!!form.is_heart_safe}    onChange={(v) => setForm({ ...form, is_heart_safe: v })} />
          <Toggle label="🫃 Me'da"     checked={!!form.is_stomach_safe}  onChange={(v) => setForm({ ...form, is_stomach_safe: v })} />
          <Toggle label="🩺 Bosim"     checked={!!form.is_pressure_safe} onChange={(v) => setForm({ ...form, is_pressure_safe: v })} />
          <Toggle label="🌾 Glutensiz" checked={!!form.is_gluten_free}   onChange={(v) => setForm({ ...form, is_gluten_free: v })} />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onSave} className="px-4 py-2 rounded-full text-sm font-bold bg-teal text-white hover:opacity-80">{saveLabel}</button>
        <button onClick={onCancel} className="px-4 py-2 rounded-full text-sm font-bold border border-darkBorder text-textSecond hover:border-primary">Bekor</button>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [tab,        setTab]        = useState('dashboard')
  const [categories, setCategories] = useState([])
  const [items,      setItems]      = useState([])
  const [banners,    setBanners]    = useState([])
  const [tables,     setTables]     = useState([])
  const [staff,      setStaff]      = useState([])
  const [stats,      setStats]      = useState(null)
  const [loading,    setLoading]    = useState(false)

  const [dashboard,    setDashboard]    = useState(null)
  const [dashPeriod,   setDashPeriod]   = useState('today')
  const [dashWaiterId, setDashWaiterId] = useState(0)
  const [dashLoading,  setDashLoading]  = useState(false)

  const [showAddCat,    setShowAddCat]    = useState(false)
  const [showAddItem,   setShowAddItem]   = useState(false)
  const [showAddTable,  setShowAddTable]  = useState(false)
  const [showAddBanner, setShowAddBanner] = useState(false)
  const [showAddStaff,  setShowAddStaff]  = useState(false)

  const [editingItem,  setEditingItem]  = useState(null)
  const [editItemForm, setEditItemForm] = useState(EMPTY_ITEM)
  const [editItemImg,  setEditItemImg]  = useState(false)

  const [assigningStaff, setAssigningStaff] = useState(null)
  const [selectedTables, setSelectedTables] = useState([])
  const [qrModal,        setQrModal]        = useState(null)
  const [orderDetail,    setOrderDetail]    = useState(null)

  const [salaryModal, setSalaryModal] = useState(null)
  const [salaryData,  setSalaryData]  = useState(null)
  const [payAmount,   setPayAmount]   = useState('')
  const [payNote,     setPayNote]     = useState('')
  const [payLoading,  setPayLoading]  = useState(false)

  const [ratingModal,   setRatingModal]   = useState(null)
  const [ratingData,    setRatingData]    = useState(null)
  const [ratingLoading, setRatingLoading] = useState(false)

  const [editingTable,  setEditingTable]  = useState(null)
  const [editTableNum,  setEditTableNum]  = useState('')
  const [editingStaff,  setEditingStaff]  = useState(null)
  const [editStaffForm, setEditStaffForm] = useState({ full_name: '', username: '', password: '', role: '' })

  const [catForm,    setCatForm]    = useState({ name: '', emoji: '', sort_order: 0 })
  const [itemForm,   setItemForm]   = useState(EMPTY_ITEM)
  const [tableNum,   setTableNum]   = useState('')
  const [bannerForm, setBannerForm] = useState({ title: '', image_url: '' })
  const [staffForm,  setStaffForm]  = useState({ full_name: '', username: '', password: '', role: '' })

  const [itemImgLoading,   setItemImgLoading]   = useState(false)
  const [bannerImgLoading, setBannerImgLoading] = useState(false)
  const [aiReindexing,     setAiReindexing]     = useState(false)

  const { logout, user, fetchMe } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => { fetchMe(); loadAll() }, [])
  useEffect(() => { if (tab === 'dashboard') loadDashboard(dashPeriod, dashWaiterId) }, [tab])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [catsRes, itemsRes, bannersRes, tablesRes, staffRes] = await Promise.all([
        getCategories(), getMenuItems({ page: 1, limit: 100 }), getBanners(), getTables(), axios.get('/auth/admin/users'),
      ])
      setCategories(catsRes.data)
      setItems(itemsRes.data.items)
      setBanners(bannersRes.data)
      setTables(tablesRes.data)
      setStaff(staffRes.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
    try { const r = await axios.get('/orders/admin/stats'); setStats(r.data) } catch {}
  }

  const loadDashboard = async (period, waiterId) => {
    setDashLoading(true)
    try { const r = await axios.get(`/orders/admin/dashboard?period=${period}&waiter_id=${waiterId}`); setDashboard(r.data) }
    catch {} finally { setDashLoading(false) }
  }

  const handleDashPeriod = (p)  => { setDashPeriod(p);   loadDashboard(p, dashWaiterId) }
  const handleDashWaiter = (id) => { setDashWaiterId(id); loadDashboard(dashPeriod, id) }

  const loadSalary      = async (wid) => { try { const r = await axios.get(`/orders/admin/waiter-salary/${wid}`); setSalaryData(r.data) } catch {} }
  const openSalaryModal = async (w)   => { setSalaryModal(w); setSalaryData(null); setPayAmount(''); setPayNote(''); await loadSalary(w.id) }

  const handlePayWaiter = async () => {
    if (!payAmount || !salaryModal) return
    setPayLoading(true)
    try { await axios.post(`/orders/admin/waiter-salary/${salaryModal.id}/pay`, { amount: Number(payAmount), note: payNote || null }); setPayAmount(''); setPayNote(''); await loadSalary(salaryModal.id) }
    catch (e) { alert(e.response?.data?.detail || 'Xatolik') }
    finally { setPayLoading(false) }
  }

  const handleDeletePayment = async (pid) => {
    if (!confirm("Bu to'lovni o'chirish?")) return
    try { await axios.delete(`/orders/admin/waiter-salary/payment/${pid}`); await loadSalary(salaryModal.id) }
    catch (e) { alert(e.response?.data?.detail || 'Xatolik') }
  }

  const loadRatings      = async (wid) => { setRatingLoading(true); try { const r = await axios.get(`/orders/admin/waiter-ratings/${wid}`); setRatingData(r.data) } catch {} finally { setRatingLoading(false) } }
  const openRatingModal  = async (w)   => { setRatingModal(w); setRatingData(null); await loadRatings(w.id) }

  const handleAddCategory   = async () => { if (!catForm.name.trim()) return; try { await createCategory({ ...catForm, sort_order: Number(catForm.sort_order) }); setCatForm({ name: '', emoji: '', sort_order: 0 }); setShowAddCat(false); loadAll() } catch {} }
  const handleDeleteCategory = async (id) => { if (!confirm("Kategoriyani o'chirish?")) return; try { await deleteCategory(id); loadAll() } catch {} }

  const buildItemPayload = (form) => ({
    ...form,
    price:            Number(form.price),
    category_id:      Number(form.category_id),
    calories:         form.calories     ? Number(form.calories)     : null,
    weight_grams:     form.weight_grams ? Number(form.weight_grams) : null,
    sort_order:       Number(form.sort_order),
    food_type:        form.food_type        || null,
    discount_percent: form.discount_percent ? Number(form.discount_percent) : null,
    discount_label:   form.discount_label   || null,
    sale_start:       form.sale_start       || null,
    sale_end:         form.sale_end         || null,
    tags: [],
  })

  const handleAddItem = async () => {
    if (!itemForm.name || !itemForm.price || !itemForm.category_id) return
    try { await createMenuItem(buildItemPayload(itemForm)); setItemForm(EMPTY_ITEM); setShowAddItem(false); loadAll() } catch {}
  }

  const handleEditItemOpen = (item) => {
    setEditingItem(item)
    setEditItemForm({
      name:             item.name          || '',
      price:            item.price         || '',
      category_id:      item.category_id   || '',
      description:      item.description   || '',
      image_url:        item.image_url     || '',
      calories:         item.calories      || '',
      weight_grams:     item.weight_grams  || '',
      sort_order:       item.sort_order    || 0,
      food_type:        item.food_type     || '',
      is_fatty:         item.is_fatty        || false,
      is_salty:         item.is_salty        || false,
      is_sweet:         item.is_sweet        || false,
      is_spicy:         item.is_spicy        || false,
      is_vegetarian:    item.is_vegetarian   || false,
      has_sugar:        item.has_sugar       || false,
      is_diabetes_safe: item.is_diabetes_safe || false,
      is_heart_safe:    item.is_heart_safe    || false,
      is_stomach_safe:  item.is_stomach_safe  || false,
      is_pressure_safe: item.is_pressure_safe || false,
      is_gluten_free:   item.is_gluten_free   || false,
      is_sale:          item.is_sale          || false,
      discount_percent: item.discount_percent || '',
      discount_label:   item.discount_label   || '',
      sale_start:       item.sale_start ? item.sale_start.slice(0, 16) : '',
      sale_end:         item.sale_end   ? item.sale_end.slice(0, 16)   : '',
    })
  }

  const handleUpdateItem = async () => {
    if (!editingItem) return
    try {
      await axios.patch(`/menu/items/${editingItem.id}`, buildItemPayload(editItemForm))
      setEditingItem(null); loadAll()
    } catch (e) { alert(e.response?.data?.detail || 'Xatolik') }
  }

  const handleDeleteItem   = async (id)  => { if (!confirm("Taomni o'chirish?")) return; try { await deleteMenuItem(id); loadAll() } catch {} }
  const handleAddTable     = async ()    => { if (!tableNum) return; try { await createTable(Number(tableNum)); setTableNum(''); setShowAddTable(false); loadAll() } catch {} }
  const handleEditTable    = (t)         => { setEditingTable(t); setEditTableNum(String(t.number)) }
  const handleUpdateTable  = async ()    => { if (!editTableNum || !editingTable) return; try { await axios.patch(`/tables/${editingTable.id}`, { number: Number(editTableNum) }); setEditingTable(null); setEditTableNum(''); loadAll() } catch (e) { alert(e.response?.data?.detail || 'Xatolik') } }
  const handleDeleteTable  = async (id) => { if (!confirm("Stolni o'chirish?")) return; try { await axios.delete(`/tables/${id}`); loadAll() } catch (e) { alert(e.response?.data?.detail || 'Xatolik') } }
  const handleCloseSession = async (id) => { try { await closeSession(id); loadAll() } catch {} }
  const handleAddBanner    = async ()    => { if (!bannerForm.title || !bannerForm.image_url) return; try { await createBanner(bannerForm); setBannerForm({ title: '', image_url: '' }); setShowAddBanner(false); loadAll() } catch {} }
  const handleDeleteBanner = async (id) => { if (!confirm("Bannerni o'chirish?")) return; try { await deleteBanner(id); loadAll() } catch {} }
  const handleAddStaff     = async ()    => { if (!staffForm.full_name || !staffForm.username || !staffForm.password || !staffForm.role) return; try { await axios.post('/auth/admin/create-user', staffForm); setStaffForm({ full_name: '', username: '', password: '', role: '' }); setShowAddStaff(false); loadAll() } catch (e) { alert(e.response?.data?.detail || 'Xatolik') } }
  const handleEditStaff    = (s)         => { setEditingStaff(s); setEditStaffForm({ full_name: s.full_name, username: s.username, password: '', role: s.role }) }
  const handleUpdateStaff  = async ()    => { if (!editingStaff || !editStaffForm.full_name || !editStaffForm.username || !editStaffForm.role) return; try { await axios.patch(`/auth/admin/users/${editingStaff.id}`, editStaffForm); setEditingStaff(null); loadAll() } catch (e) { alert(e.response?.data?.detail || 'Xatolik') } }
  const handleDeleteStaff  = async (id) => { if (!confirm("Xodimni o'chirish?")) return; try { await axios.delete(`/auth/admin/users/${id}`); loadAll() } catch (e) { alert(e.response?.data?.detail || 'Xatolik') } }
  const openAssignModal    = (s)         => { setAssigningStaff(s); setSelectedTables(s.assigned_tables || []) }
  const toggleTable        = (n)         => { setSelectedTables((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]) }
  const handleAssignTables = async ()    => { if (!assigningStaff) return; try { await axios.patch(`/auth/admin/users/${assigningStaff.id}/assign-tables`, { table_ids: selectedTables }); setAssigningStaff(null); setSelectedTables([]); loadAll() } catch (e) { alert(e.response?.data?.detail || 'Xatolik') } }

  const handleShowQr = async (tableId) => {
    const token = localStorage.getItem('access_token')
    try {
      const res  = await fetch(`/api/tables/${tableId}/qr`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      const blob  = await res.blob()
      const url   = URL.createObjectURL(blob)
      const table = tables.find((t) => t.id === tableId)
      setQrModal({ tableNumber: table.number, url })
    } catch { alert("QR yuklab bo'lmadi") }
  }

  const handleAiReindex = async () => {
    setAiReindexing(true)
    try { await axios.post('/menu/admin/reindex-ai'); alert('AI menyusi yangilandi!') }
    catch { alert('Xatolik') }
    finally { setAiReindexing(false) }
  }

  const handleLogout = async () => { await logout(); navigate('/login') }

  const waiters = staff.filter((s) => s.role === 'waiter')
  const saleItemsCount = items.filter((i) => i.is_sale && i.discounted_price).length

  const TABS = [
    { key: 'dashboard', label: '📈 Dashboard'  },
    { key: 'stats',     label: '📊 Statistika' },
    { key: 'salary',    label: '💰 Ish haqi'   },
    { key: 'menu',      label: 'Menyu'          },
    { key: 'banners',   label: 'Bannerlar'      },
    { key: 'tables',    label: 'Stollar'        },
    { key: 'staff',     label: 'Xodimlar'       },
  ]

  return (
    <div className="min-h-screen bg-darkBg">

      {/* ── TAOM EDIT MODAL ── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-darkCard border border-teal/30 rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-black">✏️ Taomni tahrirlash</h3>
              <button onClick={() => setEditingItem(null)} className="text-textMuted hover:text-white text-xl">✕</button>
            </div>
            <ItemForm
              form={editItemForm} setForm={setEditItemForm}
              categories={categories}
              imgLoading={editItemImg} setImgLoading={setEditItemImg}
              onSave={handleUpdateItem}
              onCancel={() => setEditingItem(null)}
              saveLabel="Saqlash"
            />
          </div>
        </div>
      )}

      {/* ── ISH HAQI MODAL ── */}
      {salaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-darkCard border border-teal/30 rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="text-white font-black">💰 {salaryModal.full_name}</h3><p className="text-textMuted text-xs">Oxirgi 30 kun</p></div>
              <button onClick={() => { setSalaryModal(null); setSalaryData(null) }} className="text-textMuted hover:text-white text-xl">✕</button>
            </div>
            {!salaryData ? (
              <div className="text-center py-10"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" /></div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-darkBg rounded-xl p-3 text-center"><p className="text-white font-black text-sm">{fmt(salaryData.total_earned)}</p><p className="text-textMuted text-xs mt-0.5">Jami topdi</p></div>
                  <div className="bg-darkBg rounded-xl p-3 text-center"><p className="text-teal font-black text-sm">{fmt(salaryData.total_paid)}</p><p className="text-textMuted text-xs mt-0.5">Berildi</p></div>
                  <div className="bg-darkBg rounded-xl p-3 text-center"><p className={`font-black text-sm ${salaryData.remaining > 0 ? 'text-orange' : 'text-textMuted'}`}>{fmt(salaryData.remaining)}</p><p className="text-textMuted text-xs mt-0.5">Qoldi</p></div>
                </div>
                <div className="bg-darkBg rounded-xl p-3 mb-4">
                  <p className="text-white text-xs font-bold mb-2">💸 Pul berish</p>
                  <div className="flex gap-2 mb-2">
                    <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} type="number" placeholder="Summa *" className="flex-1 px-3 py-2 rounded-xl text-sm bg-darkCard border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary" />
                    <button onClick={handlePayWaiter} disabled={!payAmount || payLoading} className="px-4 py-2 rounded-full text-sm font-bold bg-teal text-white hover:opacity-80 disabled:opacity-50">{payLoading ? '...' : 'Berdi'}</button>
                  </div>
                  <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Izoh (ixtiyoriy)" className="w-full px-3 py-2 rounded-xl text-sm bg-darkCard border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary" />
                </div>
                {salaryData.payments?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-textSecond text-xs font-bold mb-2">To'lovlar tarixi:</p>
                    <div className="space-y-1.5">
                      {salaryData.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between bg-darkBg rounded-xl px-3 py-2">
                          <div><p className="text-teal font-bold text-xs">{fmt(p.amount)} so'm</p><p className="text-textMuted text-xs">{p.paid_date}{p.note && ` · ${p.note}`}</p></div>
                          <button onClick={() => handleDeletePayment(p.id)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded-lg hover:bg-red-400/10">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-textSecond text-xs font-bold mb-2">Kunlik tarix:</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {salaryData.daily_history?.filter((d) => d.earned > 0).map((day) => (
                      <div key={day.date} className="flex justify-between items-center bg-darkBg rounded-xl px-3 py-1.5">
                        <span className="text-textSecond text-xs">{day.date}</span>
                        <div className="flex items-center gap-3"><span className="text-textMuted text-xs">{day.orders} ta</span><span className="text-teal text-xs font-bold">{fmt(day.earned)} so'm</span></div>
                      </div>
                    ))}
                    {salaryData.daily_history?.filter((d) => d.earned > 0).length === 0 && <p className="text-textMuted text-xs text-center py-3">Bu oyda zakaz yo'q</p>}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── REYTING MODAL ── */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-darkCard border border-yellow-400/30 rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="text-white font-black">⭐ {ratingModal.full_name}</h3><p className="text-textMuted text-xs">Barcha baholashlar</p></div>
              <button onClick={() => { setRatingModal(null); setRatingData(null) }} className="text-textMuted hover:text-white text-xl">✕</button>
            </div>
            {!ratingData || ratingLoading ? (
              <div className="text-center py-10"><div className="w-8 h-8 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin mx-auto" /></div>
            ) : (
              <>
                <div className="bg-darkBg rounded-2xl p-4 mb-4 text-center border border-darkBorder">
                  <p className="text-5xl font-black text-yellow-400 mb-1">{ratingData.avg_rating || '—'}</p>
                  <StarRow value={ratingData.avg_rating || 0} />
                  <p className="text-textMuted text-xs mt-2">{ratingData.total_count} ta baholash</p>
                </div>
                {ratingData.total_count > 0 && (
                  <div className="bg-darkBg rounded-2xl p-3 mb-4 border border-darkBorder space-y-2">
                    {[5,4,3,2,1].map((s) => {
                      const count = ratingData.star_dist?.[s] || 0
                      const pct   = ratingData.total_count > 0 ? Math.round((count / ratingData.total_count) * 100) : 0
                      return (
                        <div key={s} className="flex items-center gap-2">
                          <span className="text-yellow-400 text-xs w-5">{s}★</span>
                          <div className="flex-1 h-2 bg-darkCard rounded-full overflow-hidden"><div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} /></div>
                          <span className="text-textMuted text-xs w-5 text-right">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
                {ratingData.ratings?.length === 0 ? (
                  <div className="text-center py-8 bg-darkBg rounded-2xl border border-darkBorder"><p className="text-3xl mb-2">⭐</p><p className="text-textSecond text-sm">Hali baholash yo'q</p></div>
                ) : (
                  <div className="space-y-2">
                    {ratingData.ratings?.map((r) => (
                      <div key={r.id} className="bg-darkBg rounded-2xl p-3 border border-darkBorder">
                        <div className="flex items-center justify-between mb-1.5">
                          <StarRow value={r.rating} />
                          <div className="flex items-center gap-2 text-xs text-textMuted"><span>🪑 #{r.table_number}</span><span>#{r.order_id}</span><span>{fmtDate(r.created_at)}</span></div>
                        </div>
                        {r.comment && <p className="text-textSecond text-sm">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── STOL BIRIKTIRISH ── */}
      {assigningStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-darkCard border border-primary/30 rounded-2xl p-5 w-full max-w-sm">
            <h3 className="text-white font-black mb-1">Stollar biriktirish</h3>
            <p className="text-textMuted text-xs mb-4">{assigningStaff.full_name}</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {tables.map((table) => {
                const ownerWaiter = waiters.find((w) => w.id !== assigningStaff?.id && (w.assigned_tables || []).includes(table.number))
                const isSelected  = selectedTables.includes(table.number)
                const isBusy      = !!ownerWaiter
                return (
                  <div key={table.id}>
                    <button onClick={() => !isBusy && toggleTable(table.number)} disabled={isBusy}
                      className={`w-full py-2 rounded-xl text-xs font-black transition-all ${isSelected ? 'bg-primary text-white' : isBusy ? 'bg-darkBg border border-red-400/30 text-red-400 cursor-not-allowed opacity-60' : 'bg-darkBg border border-darkBorder text-textSecond hover:border-primary'}`}>
                      #{table.number}
                      {isBusy && <p className="leading-tight truncate px-1" style={{fontSize:'9px'}}>{ownerWaiter.full_name.split(' ')[0]}</p>}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={handleAssignTables} className="flex-1 py-2 rounded-full text-sm font-bold bg-primary text-white hover:bg-primaryHover">Saqlash</button>
              <button onClick={() => { setAssigningStaff(null); setSelectedTables([]) }} className="flex-1 py-2 rounded-full text-sm font-bold border border-darkBorder text-textSecond hover:border-primary">Bekor</button>
            </div>
          </div>
        </div>
      )}

      {/* ── STOL EDIT ── */}
      {editingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-darkCard border border-primary/30 rounded-2xl p-5 w-full max-w-xs">
            <h3 className="text-white font-black mb-4">Stolni tahrirlash</h3>
            <input value={editTableNum} onChange={(e) => setEditTableNum(e.target.value)} type="number" min="1" placeholder="Yangi stol raqami *" className="w-full px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary mb-3" />
            <div className="flex gap-2">
              <button onClick={handleUpdateTable} className="flex-1 py-2 rounded-full text-sm font-bold bg-primary text-white hover:bg-primaryHover">Saqlash</button>
              <button onClick={() => { setEditingTable(null); setEditTableNum('') }} className="flex-1 py-2 rounded-full text-sm font-bold border border-darkBorder text-textSecond hover:border-primary">Bekor</button>
            </div>
          </div>
        </div>
      )}

      {/* ── XODIM EDIT ── */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-darkCard border border-primary/30 rounded-2xl p-5 w-full max-w-sm">
            <h3 className="text-white font-black mb-4">Xodimni tahrirlash</h3>
            <div className="grid grid-cols-1 gap-3 mb-3">
              <input value={editStaffForm.full_name} onChange={(e) => setEditStaffForm({ ...editStaffForm, full_name: e.target.value })} placeholder="To'liq ism *" className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary" />
              <input value={editStaffForm.username} onChange={(e) => setEditStaffForm({ ...editStaffForm, username: e.target.value })} placeholder="Username *" className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary" />
              <input value={editStaffForm.password} type="password" onChange={(e) => setEditStaffForm({ ...editStaffForm, password: e.target.value })} placeholder="Yangi parol (bo'sh qolsa o'zgarmaydi)" className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary" />
              <select value={editStaffForm.role} onChange={(e) => setEditStaffForm({ ...editStaffForm, role: e.target.value })} className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white outline-none focus:border-primary">
                <option value="waiter">🧑‍🍳 Ofitsiant</option>
                <option value="chef">👨‍🍳 Oshpaz</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleUpdateStaff} className="flex-1 py-2 rounded-full text-sm font-bold bg-primary text-white hover:bg-primaryHover">Saqlash</button>
              <button onClick={() => setEditingStaff(null)} className="flex-1 py-2 rounded-full text-sm font-bold border border-darkBorder text-textSecond hover:border-primary">Bekor</button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR MODAL ── */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-darkCard border border-primary/30 rounded-2xl p-5 w-full max-w-xs text-center">
            <h3 className="text-white font-black mb-1">Stol #{qrModal.tableNumber}</h3>
            <p className="text-textMuted text-xs mb-4">QR kodni chop eting va stolga joylashtiring</p>
            <div className="bg-white p-3 rounded-2xl mb-4 inline-block"><img src={qrModal.url} alt="QR" className="w-48 h-48 object-contain" /></div>
            <div className="flex gap-2">
              <a href={qrModal.url} download={`stol-${qrModal.tableNumber}-qr.png`} className="flex-1 py-2 rounded-full text-sm font-bold bg-primary text-white hover:bg-primaryHover text-center">⬇️ Yuklab olish</a>
              <button onClick={() => { URL.revokeObjectURL(qrModal.url); setQrModal(null) }} className="flex-1 py-2 rounded-full text-sm font-bold border border-darkBorder text-textSecond hover:border-primary">Yopish</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ORDER DETAIL ── */}
      {orderDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-darkCard border border-primary/30 rounded-2xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-black">Buyurtma #{orderDetail.id}</h3>
              <button onClick={() => setOrderDetail(null)} className="text-textMuted hover:text-white">✕</button>
            </div>
            <div className="bg-darkBg rounded-xl p-3 mb-3 space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-textMuted">🪑 Stol:</span><span className="text-white font-bold">#{orderDetail.table_number}</span></div>
              {orderDetail.waiter_name && <div className="flex justify-between text-xs"><span className="text-textMuted">🧑‍🍳:</span><span className="text-teal font-bold">{orderDetail.waiter_name}</span></div>}
              <div className="flex justify-between text-xs"><span className="text-textMuted">🕐 Keldi:</span><span className="text-white">{fmtDate(orderDetail.created_at)} {fmtTime(orderDetail.created_at)}</span></div>
              {orderDetail.accepted_at  && <div className="flex justify-between text-xs"><span className="text-textMuted">✅ Qabul:</span><span className="text-blue-400">{fmtTime(orderDetail.accepted_at)}</span></div>}
              {orderDetail.ready_at     && <div className="flex justify-between text-xs"><span className="text-textMuted">🍽️ Tayyor:</span><span className="text-teal font-bold">{fmtTime(orderDetail.ready_at)}</span></div>}
              {orderDetail.delivered_at && <div className="flex justify-between text-xs"><span className="text-textMuted">📦 Yetkazildi:</span><span className="text-green-400 font-bold">{fmtTime(orderDetail.delivered_at)}</span></div>}
            </div>
            <div className="space-y-1 mb-3">
              {orderDetail.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-textSecond">{item.name} × {item.quantity}</span>
                  <span className="text-white font-bold">{fmt(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="bg-darkBg rounded-xl p-3 space-y-1">
              <div className="flex justify-between text-xs"><span className="text-textSecond">Taomlar:</span><span className="text-white">{fmt(orderDetail.total_price)} so'm</span></div>
              <div className="flex justify-between text-xs"><span className="text-textSecond">Xizmat haqi (10%):</span><span className="text-teal font-bold">{fmt(orderDetail.service_fee)} so'm</span></div>
              <div className="flex justify-between text-xs pt-1 border-t border-darkBorder"><span className="text-white font-bold">Jami:</span><span className="text-primary font-black">{fmt(orderDetail.final_price)} so'm</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-darkBg border-b border-darkBorder">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-teal flex items-center justify-center"><span className="text-white text-xs font-black">A</span></div>
            <div><p className="text-white font-black text-sm">Admin paneli</p>{user && <p className="text-textMuted text-xs">{user.full_name}</p>}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadAll} className="w-8 h-8 rounded-full bg-darkCard border border-darkBorder flex items-center justify-center hover:border-primary transition-colors">
              <svg className="w-4 h-4 text-textSecond" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <ThemeToggle />
            <button onClick={handleLogout} className="text-xs font-bold px-3 py-1.5 rounded-full border border-darkBorder text-textSecond hover:border-primary transition-colors">Chiqish</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5">
        <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${tab === t.key ? 'bg-primary text-white' : 'bg-darkCard border border-darkBorder text-textSecond hover:border-primary'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex gap-2">
                {[{ key: 'today', label: '📅 Bugun' }, { key: 'month', label: '📆 Oy' }].map((p) => (
                  <button key={p.key} onClick={() => handleDashPeriod(p.key)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${dashPeriod === p.key ? 'bg-primary text-white' : 'bg-darkCard border border-darkBorder text-textSecond hover:border-primary'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <select value={dashWaiterId} onChange={(e) => handleDashWaiter(Number(e.target.value))}
                className="px-3 py-2 rounded-xl text-sm bg-darkCard border border-darkBorder text-white outline-none focus:border-primary">
                <option value={0}>🧑‍🍳 Barcha ofitsiantlar</option>
                {waiters.map((w) => <option key={w.id} value={w.id}>{w.full_name}</option>)}
              </select>
              <button onClick={() => loadDashboard(dashPeriod, dashWaiterId)} className="px-3 py-2 rounded-xl text-sm bg-darkCard border border-darkBorder text-textSecond hover:border-primary transition-colors">🔄</button>
            </div>
            {dashboard && <p className="text-textMuted text-xs">📅 {dashboard.date_from} — {dashboard.date_to}{dashWaiterId > 0 && dashboard.waiter_stats?.[0] && <span className="ml-2 text-teal">· {dashboard.waiter_stats[0].full_name}</span>}</p>}
            {dashLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[1,2,3,4].map((i) => <div key={i} className="h-24 rounded-2xl shimmer border border-darkBorder" />)}</div>
            ) : dashboard ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Jami tushum',   value: fmt(dashboard.total_revenue), color: 'text-primary', sub: "so'm" },
                    { label: 'Taom narxlari', value: fmt(dashboard.total_food),    color: 'text-white',   sub: "so'm" },
                    { label: 'Xizmat haqlar', value: fmt(dashboard.total_service), color: 'text-teal',    sub: "so'm" },
                    { label: 'Zakazlar',      value: dashboard.total_count,        color: 'text-orange',  sub: 'ta'   },
                  ].map((s) => (
                    <div key={s.label} className="bg-darkCard border border-darkBorder rounded-2xl p-4 text-center">
                      <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-textMuted text-xs mt-0.5">{s.sub}</p>
                      <p className="text-textSecond text-xs mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                {dashboard.waiter_stats?.length > 0 && (
                  <section>
                    <h2 className="text-white font-black mb-3">🧑‍🍳 {dashWaiterId > 0 ? 'Ofitsiant hisoboti' : 'Barcha ofitsiantlar'}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dashboard.waiter_stats.filter((w) => Number(dashWaiterId) === 0 || w.id === Number(dashWaiterId)).map((w) => (
                        <div key={w.id} className="bg-darkCard border border-darkBorder rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-9 h-9 rounded-full bg-teal/10 border border-teal/30 flex items-center justify-center"><span className="text-sm">🧑‍🍳</span></div>
                            <div><p className="text-white font-bold text-sm">{w.full_name}</p><p className="text-textMuted text-xs">{w.orders_count} ta zakaz</p></div>
                          </div>
                          {w.tables?.length > 0 && <div className="flex flex-wrap gap-1 mb-3">{w.tables.map((n) => <span key={n} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">#{n}</span>)}</div>}
                          <div className="space-y-1.5 pt-2 border-t border-darkBorder">
                            <div className="flex justify-between text-xs"><span className="text-textSecond">Taom tushumi:</span><span className="text-white font-bold">{fmt(w.food_total)} so'm</span></div>
                            <div className="flex justify-between text-xs"><span className="text-textSecond">Xizmat haqi:</span><span className="text-teal font-bold">{fmt(w.service_fee)} so'm</span></div>
                            <div className="flex justify-between text-xs pt-1 border-t border-darkBorder"><span className="text-white font-bold">Jami:</span><span className="text-primary font-black">{fmt(w.revenue)} so'm</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {dashboard.waiter_stats?.length === 0 && <div className="text-center py-16"><p className="text-3xl mb-2">📭</p><p className="text-textSecond text-sm">Bu davrda zakaz yo'q</p></div>}
              </>
            ) : <div className="text-center py-20"><p className="text-4xl mb-3">📈</p><p className="text-textSecond font-bold">Yuklanmoqda...</p></div>}
          </div>
        )}

        {/* ── STATISTIKA ── */}
        {tab === 'stats' && stats && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Jami tushumlar', value: fmt(stats.total_revenue), color: 'text-primary', sub: "so'm"      },
                { label: 'Taom narxlari',  value: fmt(stats.total_food),    color: 'text-white',   sub: "so'm"      },
                { label: 'Xizmat haqlar',  value: fmt(stats.total_service), color: 'text-teal',    sub: "so'm"      },
                { label: 'Yetkazilgan',    value: stats.total_count,        color: 'text-orange',  sub: 'ta zakaz'  },
              ].map((s) => (
                <div key={s.label} className="bg-darkCard border border-darkBorder rounded-2xl p-4 text-center">
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-textMuted text-xs mt-0.5">{s.sub}</p>
                  <p className="text-textSecond text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <section>
              <h2 className="text-white font-black mb-3">🧑‍🍳 Ofitsiantlar ish haqi (72 soat)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.waiter_stats?.map((w) => (
                  <div key={w.id} className="bg-darkCard border border-darkBorder rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-teal/10 border border-teal/30 flex items-center justify-center"><span className="text-sm">🧑‍🍳</span></div>
                      <div><p className="text-white font-bold text-sm">{w.full_name}</p><p className="text-textMuted text-xs">{w.orders_count} ta zakaz</p></div>
                    </div>
                    {w.tables?.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{w.tables.map((n) => <span key={n} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">#{n}</span>)}</div>}
                    <div className="flex justify-between items-center pt-2 border-t border-darkBorder">
                      <span className="text-textSecond text-xs">Ish haqi:</span>
                      <span className="text-teal font-black">{fmt(w.service_fee)} so'm</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-white font-black mb-3">📦 Yetkazilgan zakazlar (oxirgi 72 soat)</h2>
              <div className="space-y-2">
                {stats.delivered_orders?.map((order) => (
                  <div key={order.id} className="bg-darkCard border border-darkBorder rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-primary transition-colors" onClick={() => setOrderDetail(order)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-400/10 border border-green-400/30 flex items-center justify-center shrink-0"><span className="text-green-400 font-black text-sm">#{order.id}</span></div>
                      <div>
                        <p className="text-white font-bold text-sm">Stol #{order.table_number}{order.waiter_name && <span className="ml-2 text-teal text-xs font-normal">· {order.waiter_name}</span>}</p>
                        <p className="text-textMuted text-xs">{fmtDate(order.created_at)} {fmtTime(order.created_at)}{order.delivered_at && <span className="ml-2 text-green-400">→ {fmtTime(order.delivered_at)}</span>}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-primary font-black text-sm">{fmt(order.final_price)} so'm</p>
                      <p className="text-teal text-xs">+{fmt(order.service_fee)} haqi</p>
                    </div>
                  </div>
                ))}
                {stats.delivered_orders?.length === 0 && <div className="text-center py-10"><p className="text-3xl mb-2">📭</p><p className="text-textSecond text-sm">Yetkazilgan zakaz yo'q</p></div>}
              </div>
            </section>
          </div>
        )}
        {tab === 'stats' && !stats && <div className="text-center py-20"><p className="text-4xl mb-3">📊</p><p className="text-textSecond font-bold">Yuklanmoqda...</p></div>}

        {/* ── ISH HAQI ── */}
        {tab === 'salary' && (
          <section>
            <h2 className="text-white font-black mb-4">💰 Ofitsiantlar ish haqi boshqaruvi</h2>
            {waiters.length === 0 ? (
              <div className="text-center py-20"><p className="text-3xl mb-2">🧑‍🍳</p><p className="text-textSecond text-sm">Ofitsiant yo'q</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {waiters.map((w) => (
                  <div key={w.id} className="bg-darkCard border border-darkBorder rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-teal/10 border border-teal/30 flex items-center justify-center"><span className="text-lg">🧑‍🍳</span></div>
                      <div className="flex-1 min-w-0"><p className="text-white font-bold text-sm truncate">{w.full_name}</p><p className="text-textMuted text-xs">@{w.username}</p></div>
                    </div>
                    {w.assigned_tables?.length > 0 && <div className="flex flex-wrap gap-1 mb-3">{w.assigned_tables.map((n) => <span key={n} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">#{n}</span>)}</div>}
                    <div className="flex gap-2">
                      <button onClick={() => openSalaryModal(w)} className="flex-1 py-2 rounded-full text-sm font-bold bg-teal/10 border border-teal/30 text-teal hover:bg-teal/20 transition-colors">💰 Ish haqi</button>
                      <button onClick={() => openRatingModal(w)} className="flex-1 py-2 rounded-full text-sm font-bold bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/20 transition-colors">⭐ Reyting</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── MENU ── */}
        {tab === 'menu' && (
          <div className="space-y-6">

            {/* AI yangilash + aksiya statistikasi */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-darkCard border border-darkBorder rounded-2xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-white font-bold text-sm">🤖 AI menyu</p>
                  <p className="text-textMuted text-xs">Taom qo'shgandan keyin yangilang</p>
                </div>
                {saleItemsCount > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-orange/10 text-orange border border-orange/30 font-bold">
                    🔥 {saleItemsCount} ta aksiyada
                  </span>
                )}
              </div>
              <button onClick={handleAiReindex} disabled={aiReindexing}
                className="px-4 py-2 rounded-full text-sm font-bold bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors">
                {aiReindexing ? <><div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block mr-1" />Yangilanmoqda...</> : '🔄 AI ni yangilash'}
              </button>
            </div>

            {/* Kategoriyalar */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-black">Kategoriyalar ({categories.length})</h2>
                <button onClick={() => setShowAddCat(true)} className="px-4 py-2 rounded-full text-sm font-bold bg-primary text-white hover:bg-primaryHover transition-colors">+ Qo'shish</button>
              </div>
              {showAddCat && (
                <div className="bg-darkCard border border-primary/30 rounded-2xl p-4 mb-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    <input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="Nomi *" className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary col-span-2 sm:col-span-1" />
                    <input value={catForm.emoji} onChange={(e) => setCatForm({ ...catForm, emoji: e.target.value })} placeholder="Emoji (🍽️)" className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary" />
                    <input value={catForm.sort_order} onChange={(e) => setCatForm({ ...catForm, sort_order: e.target.value })} type="number" placeholder="Tartib" className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddCategory} className="px-4 py-2 rounded-full text-sm font-bold bg-primary text-white hover:bg-primaryHover">Saqlash</button>
                    <button onClick={() => setShowAddCat(false)} className="px-4 py-2 rounded-full text-sm font-bold border border-darkBorder text-textSecond hover:border-primary">Bekor</button>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2 px-4 py-2 rounded-full bg-darkCard border border-darkBorder">
                    <span className="text-white text-sm font-bold">{cat.emoji && `${cat.emoji} `}{cat.name}</span>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-textMuted hover:text-red-400 transition-colors text-xs">✕</button>
                  </div>
                ))}
              </div>
            </section>

            {/* Taomlar */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-black">Taomlar ({items.length})</h2>
                <button onClick={() => setShowAddItem(!showAddItem)} className="px-4 py-2 rounded-full text-sm font-bold bg-teal text-white hover:opacity-80 transition-opacity">
                  {showAddItem ? '✕ Yopish' : "+ Qo'shish"}
                </button>
              </div>

              {showAddItem && (
                <div className="bg-darkCard border border-teal/30 rounded-2xl p-4 mb-4">
                  <ItemForm
                    form={itemForm} setForm={setItemForm}
                    categories={categories}
                    imgLoading={itemImgLoading} setImgLoading={setItemImgLoading}
                    onSave={handleAddItem}
                    onCancel={() => { setShowAddItem(false); setItemForm(EMPTY_ITEM) }}
                    saveLabel="Qo'shish"
                  />
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{[1,2,3].map((i) => <div key={i} className="h-24 rounded-2xl shimmer border border-darkBorder" />)}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((item) => (
                    <div key={item.id} className={`bg-darkCard border rounded-2xl p-3 flex gap-3 items-start ${item.is_sale && item.discounted_price ? 'border-orange/30' : 'border-darkBorder'}`}>
                      {item.image_url && <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-xl object-cover border border-darkBorder shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{item.name}</p>
                        <div className="flex items-center gap-1.5">
                          {item.is_sale && item.discounted_price ? (
                            <>
                              <p className="text-primary font-black text-sm">{fmt(item.discounted_price)} so'm</p>
                              <p className="text-textMuted text-xs line-through">{fmt(item.price)}</p>
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange/10 text-orange border border-orange/20">-{item.discount_percent}%</span>
                            </>
                          ) : (
                            <p className="text-primary font-black text-sm">{fmt(item.price)} so'm</p>
                          )}
                        </div>
                        {item.is_sale && item.sale_end && (
                          <p className="text-orange text-xs mt-0.5">
                            ⏰ {new Date(item.sale_end).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' })} gacha
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${item.availability === 'available' ? 'bg-teal/10 text-teal border-teal/30' : item.availability === 'low_stock' ? 'bg-orange/10 text-orange border-orange/30' : 'bg-red-400/10 text-red-400 border-red-400/30'}`}>
                            {item.availability === 'available' ? 'Mavjud' : item.availability === 'low_stock' ? 'Kam qoldi' : 'Mavjud emas'}
                          </span>
                          {item.food_type     && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">{FOOD_TYPE_MAP[item.food_type] || item.food_type}</span>}
                          {item.is_fatty      && <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange/10 text-orange border border-orange/20">🥩</span>}
                          {item.is_sweet      && <span className="text-xs px-1.5 py-0.5 rounded-full bg-pink-400/10 text-pink-400 border border-pink-400/20">🍬</span>}
                          {item.is_vegetarian && <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/20">🥦</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => handleEditItemOpen(item)} className="text-teal hover:text-teal/80 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteItem(item.id)} className="text-textMuted hover:text-red-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── BANNERLAR ── */}
        {tab === 'banners' && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white font-black">Reklama Bannerlar ({banners.length})</h2>
              <button onClick={() => setShowAddBanner(true)} className="px-4 py-2 rounded-full text-sm font-bold bg-primary text-white hover:bg-primaryHover transition-colors">+ Qo'shish</button>
            </div>
            <p className="text-textMuted text-xs mb-4">Banner — faqat reklama uchun (rasm + sarlavha). Aksiyalar uchun taomni edit qiling.</p>
            {showAddBanner && (
              <div className="bg-darkCard border border-primary/30 rounded-2xl p-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <input value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} placeholder="Sarlavha *" className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary" />
                  <div>
                    {bannerForm.image_url && <img src={bannerForm.image_url} alt="preview" className="w-full h-28 object-cover rounded-xl mb-2 border border-darkBorder" />}
                    <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl cursor-pointer border border-dashed transition-colors bg-darkBg text-sm font-bold ${bannerImgLoading ? 'border-primary text-primary' : 'border-darkBorder text-textSecond hover:border-primary'}`}>
                      {bannerImgLoading
                        ? <><div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />Yuklanmoqda...</>
                        : <>📷 {bannerForm.image_url ? 'Rasmni almashtirish' : 'Rasm tanlang'}</>}
                      <input type="file" accept="image/*" className="hidden" disabled={bannerImgLoading}
                        onChange={async (e) => {
                          const file = e.target.files[0]
                          if (!file) return
                          setBannerImgLoading(true)
                          try { const url = await uploadFile(file); setBannerForm((prev) => ({ ...prev, image_url: url })) }
                          catch { alert('Rasm yuklashda xatolik') }
                          finally { setBannerImgLoading(false) }
                        }} />
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddBanner} className="px-4 py-2 rounded-full text-sm font-bold bg-primary text-white hover:bg-primaryHover">Saqlash</button>
                  <button onClick={() => setShowAddBanner(false)} className="px-4 py-2 rounded-full text-sm font-bold border border-darkBorder text-textSecond hover:border-primary">Bekor</button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {banners.map((banner) => (
                <div key={banner.id} className="bg-darkCard border border-darkBorder rounded-2xl overflow-hidden">
                  <div className="relative h-32">
                    <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-darkBg/80 to-transparent" />
                    <p className="absolute bottom-3 left-3 text-white font-black text-sm">{banner.title}</p>
                  </div>
                  <div className="p-3 flex justify-end">
                    <button onClick={() => handleDeleteBanner(banner.id)} className="text-xs font-bold px-3 py-1.5 rounded-full border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-colors">O'chirish</button>
                  </div>
                </div>
              ))}
              {banners.length === 0 && <div className="text-center py-10 col-span-2"><p className="text-3xl mb-2">🖼️</p><p className="text-textSecond text-sm">Banner yo'q</p></div>}
            </div>
          </section>
        )}

        {/* ── STOLLAR ── */}
        {tab === 'tables' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-black">Stollar ({tables.length})</h2>
              <button onClick={() => setShowAddTable(true)} className="px-4 py-2 rounded-full text-sm font-bold bg-primary text-white hover:bg-primaryHover transition-colors">+ Qo'shish</button>
            </div>
            {showAddTable && (
              <div className="bg-darkCard border border-primary/30 rounded-2xl p-4 mb-4">
                <div className="flex gap-3">
                  <input value={tableNum} onChange={(e) => setTableNum(e.target.value)} type="number" min="1" placeholder="Stol raqami *" className="flex-1 px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary" />
                  <button onClick={handleAddTable} className="px-4 py-2 rounded-full text-sm font-bold bg-primary text-white hover:bg-primaryHover">Yaratish</button>
                  <button onClick={() => setShowAddTable(false)} className="px-4 py-2 rounded-full text-sm font-bold border border-darkBorder text-textSecond hover:border-primary">Bekor</button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {tables.map((table) => (
                <div key={table.id} className="bg-darkCard border border-darkBorder rounded-2xl p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-2"><span className="text-primary font-black text-lg">{table.number}</span></div>
                  <p className="text-white font-bold text-sm mb-1">Stol #{table.number}</p>
                  <p className={`text-xs font-bold mb-3 ${table.is_active ? 'text-teal' : 'text-textMuted'}`}>{table.is_active ? 'Aktiv' : 'Yopiq'}</p>
                  <div className="grid grid-cols-2 gap-1 mb-1">
                    <button onClick={() => handleShowQr(table.id)} className="py-1.5 rounded-full text-xs font-bold border border-primary/30 text-primary hover:bg-primary/10 transition-colors">QR</button>
                    <button onClick={() => handleEditTable(table)} className="py-1.5 rounded-full text-xs font-bold border border-teal/30 text-teal hover:bg-teal/10 transition-colors">Edit</button>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button onClick={() => handleCloseSession(table.id)} className="py-1.5 rounded-full text-xs font-bold border border-darkBorder text-textSecond hover:border-orange hover:text-orange transition-colors">Yopish</button>
                    <button onClick={() => handleDeleteTable(table.id)} className="py-1.5 rounded-full text-xs font-bold border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-colors">O'chirish</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── XODIMLAR ── */}
        {tab === 'staff' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-black">Xodimlar ({staff.length})</h2>
              <button onClick={() => setShowAddStaff(true)} className="px-4 py-2 rounded-full text-sm font-bold bg-primary text-white hover:bg-primaryHover transition-colors">+ Qo'shish</button>
            </div>
            {showAddStaff && (
              <div className="bg-darkCard border border-primary/30 rounded-2xl p-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <input value={staffForm.full_name} onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })} placeholder="To'liq ism *" className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary" />
                  <input value={staffForm.username} onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })} placeholder="Username *" className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary" />
                  <input value={staffForm.password} type="password" onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} placeholder="Parol * (min 6 ta belgi)" className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white placeholder-textMuted outline-none focus:border-primary" />
                  <select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })} className="px-3 py-2 rounded-xl text-sm bg-darkBg border border-darkBorder text-white outline-none focus:border-primary">
                    <option value="">Role tanlang *</option>
                    <option value="waiter">🧑‍🍳 Ofitsiant</option>
                    <option value="chef">👨‍🍳 Oshpaz</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddStaff} className="px-4 py-2 rounded-full text-sm font-bold bg-primary text-white hover:bg-primaryHover">Saqlash</button>
                  <button onClick={() => setShowAddStaff(false)} className="px-4 py-2 rounded-full text-sm font-bold border border-darkBorder text-textSecond hover:border-primary">Bekor</button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {staff.map((s) => (
                <div key={s.id} className="bg-darkCard border border-darkBorder rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary/10 border border-primary/30"><span className="text-lg">{s.role === 'chef' ? '👨‍🍳' : '🧑‍🍳'}</span></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{s.full_name}</p>
                      <p className="text-textMuted text-xs">@{s.username}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border mt-1 inline-block ${s.role === 'chef' ? 'bg-orange/10 text-orange border-orange/30' : s.role === 'admin' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-teal/10 text-teal border-teal/30'}`}>{s.role === 'chef' ? 'Oshpaz' : s.role === 'admin' ? 'Admin' : 'Ofitsiant'}</span>                    </div>
                  </div>
                  {s.role === 'waiter' && (
                    <div className="mb-3">
                      {s.assigned_tables?.length > 0
                        ? <div className="flex flex-wrap gap-1">{s.assigned_tables.map((n) => <span key={n} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">#{n}</span>)}</div>
                        : <p className="text-textMuted text-xs">Stol biriktirilmagan</p>}
                    </div>
                  )}
                  <div className="flex gap-1">
                    {s.role === 'waiter' && <button onClick={() => openAssignModal(s)} className="flex-1 py-1.5 rounded-full text-xs font-bold border border-primary/30 text-primary hover:bg-primary/10 transition-colors">Stollar</button>}
                    <button onClick={() => handleEditStaff(s)} className="flex-1 py-1.5 rounded-full text-xs font-bold border border-teal/30 text-teal hover:bg-teal/10 transition-colors">Edit</button>
                    <button onClick={() => handleDeleteStaff(s.id)} className="flex-1 py-1.5 rounded-full text-xs font-bold border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-colors">O'chirish</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}