import api from './axios'

export const sendAiMessage = (message, sessionId = 'default') => {
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]')
  return api.post('/ai/chat', {
    message,
    session_id:   sessionId,
    favorite_ids: favorites,
  })
}
