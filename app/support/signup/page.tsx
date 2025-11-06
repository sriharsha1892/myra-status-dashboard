'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Invalid or missing signup link')
        setVerifying(false)
        return
      }

      try {
        const response = await fetch(`/api/auth/verify-signup-token?token=${token}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invalid signup link')
          setVerifying(false)
          return
        }

        setEmail(data.email)
        setVerifying(false)
      } catch (err) {
        setError('Failed to verify signup link')
        setVerifying(false)
      }
    }

    verifyToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    try {
      // Complete signup with the token
      const response = await fetch('/api/auth/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create account')
        setLoading(false)
        return
      }

      // Sign in the user automatically
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        setError('Account created but failed to sign in. Please use the login page.')
        setLoading(false)
        return
      }

      setSuccess(true)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/support/trials')
      }, 2000)

    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your signup link...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
          <p className="text-gray-600 mb-4">Redirecting you to the dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden opacity-40">
        <div
          className="absolute top-0 -left-4 w-72 h-72 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full mix-blend-multiply filter blur-xl opacity-70"
          style={{ animation: 'liquidMove 20s ease-in-out infinite' }}
        ></div>
        <div
          className="absolute top-0 -right-4 w-72 h-72 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full mix-blend-multiply filter blur-xl opacity-70"
          style={{ animation: 'liquidMove 25s ease-in-out infinite reverse' }}
        ></div>
        <div
          className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-70"
          style={{ animation: 'liquidMove 30s ease-in-out infinite' }}
        ></div>
      </div>

      {/* Main content */}
      <div className="relative w-full max-w-lg">
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl mb-4 shadow-2xl shadow-blue-600/30">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">myRA AI</h1>
          <p className="text-sm text-gray-600 mt-2 font-medium">Complete Your Account Setup</p>
        </div>

        {/* Card */}
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-900/10 border border-white/20 p-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 pointer-events-none"></div>

          <div className="relative z-10">
            {error ? (
              <div className="mb-8">
                <div className="p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-red-900">Setup Failed</p>
                    <p className="text-sm text-red-700 mt-0.5">{error}</p>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <a href="/support/login" className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
                    Go to Login Page →
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Set Your Password</h2>
                  <p className="text-sm text-gray-600 mt-2">Create a secure password for your account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email Display */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Email address
                    </label>
                    <div className="w-full h-12 px-4 text-sm text-gray-700 bg-gray-50 border-2 border-gray-200 rounded-xl flex items-center">
                      {email}
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="group">
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2 transition-colors group-focus-within:text-blue-600">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      disabled={loading}
                      className="w-full h-12 px-4 text-sm text-gray-900 bg-white/50 backdrop-blur-sm border-2 border-gray-200 rounded-xl placeholder:text-gray-400
                               focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white
                               disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
                               transition-all duration-200 ease-out"
                    />
                  </div>

                  {/* Confirm Password Input */}
                  <div className="group">
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2 transition-colors group-focus-within:text-blue-600">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      disabled={loading}
                      className="w-full h-12 px-4 text-sm text-gray-900 bg-white/50 backdrop-blur-sm border-2 border-gray-200 rounded-xl placeholder:text-gray-400
                               focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white
                               disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
                               transition-all duration-200 ease-out"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="relative w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700
                             active:scale-[0.98] disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed
                             text-white text-sm font-semibold rounded-xl
                             transition-all duration-200 ease-out
                             shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 disabled:shadow-none
                             flex items-center justify-center gap-2 mt-8 overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 relative z-10" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="relative z-10">Creating account...</span>
                      </>
                    ) : (
                      <span className="relative z-10">Create Account & Sign In</span>
                    )}
                  </button>
                </form>

                {/* Password Requirements */}
                <div className="mt-6 p-4 bg-blue-50/50 rounded-xl">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Password requirements:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      At least 8 characters long
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Mix of letters and numbers recommended
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
