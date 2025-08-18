// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react'
import { auth } from '../lib/supabase'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const user = await auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error getting initial session:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      setUser(session?.user || null)
      setLoading(false)
      
      if (event === 'SIGNED_OUT') {
        setError(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signUp = async (email, password, fullName) => {
    try {
      setError(null)
      setLoading(true)
      
      const data = await auth.signUp(email, password, { full_name: fullName })
      
      // Note: User will need to verify email before they can sign in
      return data
    } catch (error) {
      console.error('Sign up error:', error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      setError(null)
      setLoading(true)
      
      const data = await auth.signIn(email, password)
      return data
    } catch (error) {
      console.error('Sign in error:', error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      await auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
      setError(error.message)
      throw error
    }
  }

  const resetPassword = async (email) => {
    try {
      setError(null)
      await auth.resetPassword(email)
    } catch (error) {
      console.error('Reset password error:', error)
      setError(error.message)
      throw error
    }
  }

  const clearError = () => setError(null)

  const value = {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    clearError,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// HOC to protect routes that require authentication
export const withAuth = (Component) => {
  return (props) => {
    const { user, loading } = useAuth()
    
    if (loading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )
    }
    
    if (!user) {
      return <AuthPage />
    }
    
    return <Component {...props} />
  }
}

// Authentication page component
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const { signIn, signUp, resetPassword, error, loading, clearError } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()

    if (!isLogin) {
      // Sign up validation
      if (password !== confirmPassword) {
        alert('Passwords do not match')
        return
      }
      if (password.length < 6) {
        alert('Password must be at least 6 characters')
        return
      }
    }

    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        await signUp(email, password, fullName)
        alert('Please check your email to verify your account before signing in.')
        setIsLogin(true)
      }
    } catch (error) {
      // Error is handled by the context
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    clearError()
    
    if (!email) {
      alert('Please enter your email address')
      return
    }

    try {
      await resetPassword(email)
      alert('Password reset link sent to your email!')
      setShowResetPassword(false)
    } catch (error) {
      // Error is handled by the context
    }
  }

  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">🔍 Project Loom</h1>
            <p className="text-gray-600">Reset your password</p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowResetPassword(false)}
                className="text-purple-600 hover:text-purple-800 text-sm"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🔍 Project Loom</h1>
          <p className="text-gray-600">AI Simulation Platform</p>
        </div>

        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            onClick={() => {
              setIsLogin(true)
              clearError()
            }}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              isLogin 
                ? 'bg-white text-gray-800 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsLogin(false)
              clearError()
            }}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              !isLogin 
                ? 'bg-white text-gray-800 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              minLength={6}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required={!isLogin}
                minLength={6}
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {loading ? (isLogin ? 'Signing In...' : 'Signing Up...') : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>

          {isLogin && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="text-purple-600 hover:text-purple-800 text-sm"
              >
                Forgot your password?
              </button>
            </div>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                clearError()
                setEmail('')
                setPassword('')
                setFullName('')
                setConfirmPassword('')
              }}
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}