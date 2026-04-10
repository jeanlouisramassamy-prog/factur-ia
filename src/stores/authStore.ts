import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, Profile, Business } from '@/lib/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  business: Business | null
  loading: boolean
  initialized: boolean

  initialize: () => Promise<void>
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  fetchProfile: () => Promise<void>
  fetchBusiness: () => Promise<void>
  setBusiness: (business: Business) => void
}

let initialized = false
let authListenerRegistered = false

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  business: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    if (initialized) return
    initialized = true

    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      set({ user: session.user })
      await get().fetchProfile()
      await get().fetchBusiness()
    }

    set({ loading: false, initialized: true })

    if (!authListenerRegistered) {
      authListenerRegistered = true
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          set({ user: session.user })
          await get().fetchProfile()
          await get().fetchBusiness()
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, profile: null, business: null })
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          set({ user: session.user })
        }
      })
    }
  },

  signUp: async (email, password, firstName, lastName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    })
    if (error) return { error: error.message }
    return { error: null }
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, business: null })
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) return { error: error.message }
    return { error: null }
  },

  fetchProfile: async () => {
    const user = get().user
    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) set({ profile: data })
  },

  fetchBusiness: async () => {
    const user = get().user
    if (!user) return

    const { data } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .limit(1)
      .single()

    if (data) set({ business: data })
  },

  setBusiness: (business) => set({ business }),
}))
