import api from './axios'

export const scanQr       = (qr_code)  => api.post('/tables/scan', { qr_code })
export const getTables    = ()         => api.get('/tables/')
export const createTable  = (number)   => api.post('/tables/', { number })
export const closeSession = (tableId)  => api.delete(`/tables/${tableId}/session`)
export const getQrImage   = (tableId)  => `/api/tables/${tableId}/qr`
