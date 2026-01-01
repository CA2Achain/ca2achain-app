import apiClient from './client'
import { API_ENDPOINTS } from '@/lib/constants/api-endpoints'
import type { BuyerRegistration, BuyerAccount } from '@ca2achain/shared'

export const buyerApi = {
  register: async (data: BuyerRegistration) => {
    const response = await apiClient.post(API_ENDPOINTS.BUYER_REGISTER, data)
    return response.data
  },

  getProfile: async () => {
    const response = await apiClient.get(API_ENDPOINTS.BUYER_PROFILE)
    return response.data
  },

  // TODO: Add more buyer API functions
  // updateProfile: (data) => Promise
  // startVerification: () => Promise
  // getVerificationStatus: () => Promise
}