import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

// Get admin user IDs from environment
const getAdminUserIds = (): string[] => {
  const adminIds = process.env.ADMIN_USER_IDS || ''
  return adminIds.split(',').map(id => id.trim()).filter(Boolean)
}

// Check if user is admin
export const isAdmin = (userId: string): boolean => {
  const adminIds = getAdminUserIds()
  return adminIds.includes(userId)
}

// Get current user and check if admin
export const getCurrentUser = async () => {
  const { userId } = await auth()
  
  if (!userId) {
    return { userId: null, isAdmin: false }
  }
  
  return {
    userId,
    isAdmin: isAdmin(userId)
  }
}

// Require admin access (for server components)
export const requireAdmin = async () => {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/auth/sign-in')
  }
  
  if (!isAdmin(userId)) {
    redirect('/dashboard')
  }
  
  return userId
}

// Check admin access (for API routes)
export const checkAdminAccess = async () => {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }
  
  if (!isAdmin(userId)) {
    throw new Error('Admin access required')
  }
  
  return userId
}