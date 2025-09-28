import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from './supaAdmin'
import { sendWelcomeEmail } from './mail'

export interface UserProfile {
  id: string
  email: string
  username: string
  credits: number
  createdAt: string
  updatedAt: string
}

export interface UserWallet {
  id: string
  userId: string
  credits: number
  totalEarned: number
  totalSpent: number
  createdAt: string
  updatedAt: string
}

export async function ensureProfile(): Promise<UserProfile | null> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return null
    }

    // Check if profile already exists
    const { data: existingProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching profile:', fetchError)
      return null
    }

    if (existingProfile) {
      return existingProfile as UserProfile
    }

    // Get user info from Clerk
    const clerkUser = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!clerkUser.ok) {
      console.error('Failed to fetch Clerk user data')
      return null
    }

    const clerkUserData = await clerkUser.json()
    const email = clerkUserData.email_addresses?.[0]?.email_address || ''
    const username = clerkUserData.username || clerkUserData.first_name || 'User'

    // Create new profile
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email,
        username,
        credits: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating profile:', createError)
      return null
    }

    // Create wallet for the user
    const { error: walletError } = await supabaseAdmin
      .from('wallets')
      .insert({
        id: `wallet_${userId}`,
        userId,
        credits: 0,
        totalEarned: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

    if (walletError) {
      console.error('Error creating wallet:', walletError)
    }

    // Send welcome email
    try {
      await sendWelcomeEmail(email, username)
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail the profile creation if email fails
    }

    return newProfile as UserProfile
  } catch (error) {
    console.error('Error in ensureProfile:', error)
    return null
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data as UserProfile
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    return null
  }
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        ...updates,
        updatedAt: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      return null
    }

    return data as UserProfile
  } catch (error) {
    console.error('Error in updateUserProfile:', error)
    return null
  }
}

export async function getUserWallet(userId: string): Promise<UserWallet | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('userId', userId)
      .single()

    if (error) {
      console.error('Error fetching user wallet:', error)
      return null
    }

    return data as UserWallet
  } catch (error) {
    console.error('Error in getUserWallet:', error)
    return null
  }
}

export async function updateWalletCredits(userId: string, creditChange: number, type: 'earned' | 'spent'): Promise<UserWallet | null> {
  try {
    const wallet = await getUserWallet(userId)
    if (!wallet) {
      return null
    }

    const newCredits = wallet.credits + creditChange
    const totalEarned = type === 'earned' ? wallet.totalEarned + Math.abs(creditChange) : wallet.totalEarned
    const totalSpent = type === 'spent' ? wallet.totalSpent + Math.abs(creditChange) : wallet.totalSpent

    const { data, error } = await supabaseAdmin
      .from('wallets')
      .update({
        credits: newCredits,
        totalEarned,
        totalSpent,
        updatedAt: new Date().toISOString()
      })
      .eq('userId', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating wallet credits:', error)
      return null
    }

    return data as UserWallet
  } catch (error) {
    console.error('Error in updateWalletCredits:', error)
    return null
  }
}
