import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export const api = {
  // Hot topics
  getHotTopics: async (params?: any) => {
    const { data } = await apiClient.get('/hot-topics', { params })
    return data
  },

  getTopic: async (id: string) => {
    const { data } = await apiClient.get(`/hot-topics/${id}`)
    return data
  },

  // Tokens
  getToken: async (mintAddress: string) => {
    const { data } = await apiClient.get(`/tokens/${mintAddress}`)
    return data
  },

  searchTokens: async (params: any) => {
    const { data } = await apiClient.get('/tokens/search', { params })
    return data
  },

  // KOLs
  getKOLs: async () => {
    const { data } = await apiClient.get('/kols')
    return data
  },

  createKOL: async (kol: any) => {
    const { data } = await apiClient.post('/kols', kol)
    return data
  },

  deleteKOL: async (id: number) => {
    const { data } = await apiClient.delete(`/kols/${id}`)
    return data
  },
}

export default apiClient

