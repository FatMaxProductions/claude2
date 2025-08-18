// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wjigajzuokltibgjwdcz.supabase.co'
const supabaseAnonKey = 'sb_publishable_p2gk5Z7nQ49hVLu3IzWs-Q_vpJe7coe'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database helper functions
export const db = {
  // Personas
  async getPersonas() {
    const { data, error } = await supabase
      .from('personas')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async createPersona(persona) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('personas')
      .insert([{ ...persona, user_id: user.id }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updatePersona(id, updates) {
    const { data, error } = await supabase
      .from('personas')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deletePersona(id) {
    const { error } = await supabase
      .from('personas')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Environments
  async getEnvironments() {
    const { data, error } = await supabase
      .from('environments')
      .select(`
        *,
        environment_participants (
          persona_id,
          personas (id, name, llm, role, traits)
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Transform the data to match your existing structure
    return data?.map(env => ({
      ...env,
      participants: env.environment_participants?.map(ep => ep.personas) || []
    })) || []
  },

  async createEnvironment(environment) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { participants, ...envData } = environment
    
    // Create environment
    const { data: env, error: envError } = await supabase
      .from('environments')
      .insert([{ ...envData, user_id: user.id }])
      .select()
      .single()
    
    if (envError) throw envError

    // Add participants
    if (participants?.length > 0) {
      const participantData = participants.map(p => ({
        environment_id: env.id,
        persona_id: p.id
      }))

      const { error: participantError } = await supabase
        .from('environment_participants')
        .insert(participantData)

      if (participantError) throw participantError
    }

    return env
  },

  async updateEnvironment(id, updates) {
    const { participants, ...envData } = updates
    
    // Update environment
    const { data: env, error: envError } = await supabase
      .from('environments')
      .update(envData)
      .eq('id', id)
      .select()
      .single()
    
    if (envError) throw envError

    // Update participants if provided
    if (participants !== undefined) {
      // Remove existing participants
      await supabase
        .from('environment_participants')
        .delete()
        .eq('environment_id', id)

      // Add new participants
      if (participants.length > 0) {
        const participantData = participants.map(p => ({
          environment_id: id,
          persona_id: p.id
        }))

        const { error: participantError } = await supabase
          .from('environment_participants')
          .insert(participantData)

        if (participantError) throw participantError
      }
    }

    return env
  },

  async deleteEnvironment(id) {
    const { error } = await supabase
      .from('environments')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Simulations
  async getSimulations() {
    const { data, error } = await supabase
      .from('simulations')
      .select(`
        *,
        environments (id, name)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async createSimulation(simulation) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('simulations')
      .insert([{ ...simulation, user_id: user.id }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateSimulation(id, updates) {
    const { data, error } = await supabase
      .from('simulations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteSimulation(id) {
    const { error } = await supabase
      .from('simulations')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // API Keys
  async getApiKeys() {
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('id, provider, created_at')
    
    if (error) throw error
    return data || []
  },

  async saveApiKey(provider, encryptedKey) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('user_api_keys')
      .upsert([
        { 
          provider, 
          encrypted_key: encryptedKey,
          user_id: user.id
        }
      ])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getApiKey(provider) {
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('encrypted_key')
      .eq('provider', provider)
      .single()
    
    if (error) throw error
    return data?.encrypted_key
  },

  async deleteApiKey(provider) {
    const { error } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('provider', provider)
    
    if (error) throw error
  },

  // Profile
  async getProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (error) throw error
    return data
  },

  async updateProfile(updates) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// Auth helper functions
export const auth = {
  async signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    
    if (error) throw error
    return data
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Utility functions
export const utils = {
  // Simple encryption for API keys (in production, use proper server-side encryption)
  encryptApiKey(key) {
    // This is a basic obfuscation - in production, encrypt on the server
    return btoa(key)
  },

  decryptApiKey(encryptedKey) {
    // This is a basic obfuscation - in production, decrypt on the server
    try {
      return atob(encryptedKey)
    } catch {
      return null
    }
  }
}