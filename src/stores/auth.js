import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/auth/supabase'
export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)

  async function signInWithDiscord() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: false,
      }
    })
    if (error) {
      console.error('Error logging in with Discord:', error.message)
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error logging out:', error.message)
    }
  }

  async function getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  async function getAccessToken() {
    const session = await getSession()
    return session?.access_token || null
  }

  function listenForAuthStateChange() {
    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user || null
    })
  }

  async function init() {
    // Keep store synced with auth changes
    listenForAuthStateChange()
    // Ensure we have a session; redirect to Discord if not
    const session = await getSession()
    if (session?.user) {
      user.value = session.user
    } else {
      await signInWithDiscord()
    }
  }

  async function authorizedFetch(url, options = {}) {
    const token = await getAccessToken()
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
    return fetch(url, { ...options, headers })
  }

  return { user, signInWithDiscord, signOut, listenForAuthStateChange, init, getAccessToken, authorizedFetch }
})
