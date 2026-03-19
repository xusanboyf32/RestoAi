import api from './axios'

export const createOrder        = (data)    => api.post('/orders/', data)
export const getOrderById       = (id)      => api.get(`/orders/${id}`)
export const getOrdersBySession = (sid)     => api.get(`/orders/session/${sid}`)
export const getActiveOrders    = ()        => api.get('/orders/active/all')
export const updateOrderStatus  = (id, data) => api.patch(`/orders/${id}/status`, data)
export const requestPayment     = (id, data) => api.patch(`/orders/${id}/payment-request`, data)
export const confirmPayment     = (id)      => api.patch(`/orders/${id}/payment-confirm`)

export const createIssue        = (data)    => api.post('/orders/issues', data)
export const getOpenIssues      = ()        => api.get('/orders/issues/open')
export const resolveIssue       = (id)      => api.patch(`/orders/issues/${id}/resolve`)

export const createRating       = (data)    => api.post('/orders/ratings', data)