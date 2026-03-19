import api from './axios'

export const getCategories  = ()       => api.get('/menu/categories')
export const getBanners     = ()       => api.get('/menu/banners')
export const getMenuItems   = (params) => api.get('/menu/items', { params })
export const getMenuItemById = (id)    => api.get(`/menu/items/${id}`)
export const getCombos      = ()       => api.get('/menu/combos')

// Admin
export const createCategory  = (data)       => api.post('/menu/categories', data)
export const updateCategory  = (id, data)   => api.patch(`/menu/categories/${id}`, data)
export const deleteCategory  = (id)         => api.delete(`/menu/categories/${id}`)

export const createMenuItem  = (data)       => api.post('/menu/items', data)
export const updateMenuItem  = (id, data)   => api.patch(`/menu/items/${id}`, data)
export const deleteMenuItem  = (id)         => api.delete(`/menu/items/${id}`)
export const setAvailability = (id, avail)  => api.patch(`/menu/items/${id}/availability`, null, { params: { availability: avail } })

export const createBanner    = (data)       => api.post('/menu/banners', data)
export const deleteBanner    = (id)         => api.delete(`/menu/banners/${id}`)