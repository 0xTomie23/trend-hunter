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
}

export default apiClient

