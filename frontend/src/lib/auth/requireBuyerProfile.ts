// Buyer profile requirement check
export async function requireBuyerProfile(apiUrl: string, cookie: string) {
  try {
    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: { 'Cookie': cookie },
      credentials: 'include',
    })

    if (!response.ok) {
      return { authenticated: false, hasProfile: false }
    }

    const data = await response.json()

    if (data.success && data.data.account_type === 'buyer') {
      return {
        authenticated: true,
        hasProfile: !!data.data.account_data,
      }
    }

    return { authenticated: false, hasProfile: false }
  } catch (error) {
    console.error('Profile check failed:', error)
    return { authenticated: false, hasProfile: false }
  }
}