import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
})

// TODO: Add request interceptor to attach auth token
// TODO: Add response interceptor for error handling

export default apiClient
