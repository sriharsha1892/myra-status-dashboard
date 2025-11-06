'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

// Engaging, motivating login messages
const LOGIN_QUOTES = [
  "Time to turn insights into impact",
  "Your data-driven decisions await",
  "Let's make strategic moves today",
  "Ready to unlock enterprise intelligence?",
  "The trials are calling your expertise",
  "Another day to build something remarkable",
  "Your dashboard: where strategy meets execution",
  "Let's transform complexity into clarity"
]

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(true) // Default to true for convenience
  const [loginQuote] = useState(() => LOGIN_QUOTES[Math.floor(Math.random() * LOGIN_QUOTES.length)])

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Actual Supabase authentication with Remember Me preference
    const { error: authError } = await signIn(email, password, rememberMe)

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Success - show personalized toast
    const userName = email.split('@')[0]
    toast.success(
      <div>
        <div className="font-semibold">Welcome back, {userName}!</div>
        <div className="text-xs mt-1">
          {rememberMe ? 'You\'ll stay logged in for 30 days' : 'You\'ll stay logged in for this session'}
        </div>
      </div>,
      { duration: 3000 }
    )

    // Layout will handle redirect automatically
    // (see support/layout.tsx lines 39-44)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/support/login?reset=true`,
      })

      if (error) throw error

      // Personalized success message
      const userName = resetEmail.split('@')[0]
      toast.success(
        <div>
          <div className="font-semibold">Reset link sent to {userName}!</div>
          <div className="text-xs mt-1">
            Check your inbox at <span className="font-medium">{resetEmail}</span>
          </div>
          <div className="text-xs mt-1 text-blue-600">
            Link expires in 60 minutes • Don't forget to check spam
          </div>
        </div>,
        { duration: 7000 }
      )
      setShowForgotPassword(false)
      setResetEmail('')
    } catch (error: any) {
      toast.error(
        <div>
          <div className="font-semibold">Couldn't send reset email</div>
          <div className="text-xs mt-1">{error.message || 'Please try again or contact support'}</div>
        </div>,
        { duration: 5000 }
      )
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated liquid blobs background */}
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
      <div className="relative w-full max-w-lg animate-[scaleIn_0.5s_ease-out]">
        {/* Logo & Title */}
        <div className="text-center mb-10 animate-[fadeInUp_0.6s_ease-out]">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl mb-4 shadow-2xl shadow-blue-600/30 relative overflow-hidden group">
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <svg className="w-8 h-8 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">myRA AI</h1>
          <p className="text-sm text-gray-600 mt-2 font-medium">Support Portal</p>
        </div>

        {/* Card */}
        <div
          className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-900/10 border border-white/20 p-10 overflow-hidden"
          style={{ animation: 'fadeInUp_0.7s_ease-out_0.1s_both' }}
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 pointer-events-none"></div>

          <div className="relative z-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h2>
              <p className="text-sm text-gray-600 mt-2">{loginQuote}</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div
                className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl flex items-start gap-3"
                style={{ animation: 'slideInLeft_0.3s_ease-out' }}
              >
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-900">Authentication failed</p>
                  <p className="text-sm text-red-700 mt-0.5">{error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div className="group">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2 transition-colors group-focus-within:text-blue-600">
                  Email address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    disabled={loading}
                    className="w-full h-12 px-4 text-sm text-gray-900 bg-white/50 backdrop-blur-sm border-2 border-gray-200 rounded-xl placeholder:text-gray-400
                             focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white
                             disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
                             transition-all duration-200 ease-out"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
              </div>

              {/* Password Input */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-900 transition-colors group-focus-within:text-blue-600">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                    className="w-full h-12 px-4 text-sm text-gray-900 bg-white/50 backdrop-blur-sm border-2 border-gray-200 rounded-xl placeholder:text-gray-400
                             focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white
                             disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
                             transition-all duration-200 ease-out"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                />
                <label
                  htmlFor="rememberMe"
                  className="text-sm text-gray-700 font-medium cursor-pointer select-none"
                >
                  Remember me for 30 days
                </label>
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
                {/* Button shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 relative z-10" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="relative z-10">Authenticating your awesomeness...</span>
                  </>
                ) : (
                  <span className="relative z-10">Sign in</span>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Protected by enterprise-grade security and rock-solid infrastructure</span>
              </p>
            </div>
          </div>
        </div>

        {/* Help Link */}
        <div className="mt-6 text-center animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
          <p className="text-sm text-gray-600">
            Need assistance?{' '}
            <a href="mailto:support@myra.ai" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors inline-flex items-center gap-1">
              Contact support
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 max-w-md w-full animate-in zoom-in-95 duration-300">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Forgot your password?</h3>
                <p className="text-sm text-gray-600 mt-1">Happens to the best strategists. We'll send you a reset link</p>
              </div>
              <button
                onClick={() => {
                  setShowForgotPassword(false)
                  setResetEmail('')
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Info Box */}
            <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-900">What happens next:</p>
                  <ul className="text-xs text-blue-700 mt-1.5 space-y-1">
                    <li>• We'll send a password reset link to your email</li>
                    <li>• The link expires in 60 minutes</li>
                    <li>• Check your spam folder if you don't see it</li>
                  </ul>
                </div>
              </div>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-semibold text-gray-900 mb-2">
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  disabled={resetLoading}
                  className="w-full h-12 px-4 text-sm text-gray-900 bg-white/50 backdrop-blur-sm border-2 border-gray-200 rounded-xl placeholder:text-gray-400
                           focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white
                           disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
                           transition-all duration-200"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false)
                    setResetEmail('')
                  }}
                  disabled={resetLoading}
                  className="flex-1 h-11 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 h-11 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30 hover:shadow-xl flex items-center justify-center gap-2"
                >
                  {resetLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-blue-900">
                  A password reset link will be sent to your email. Click the link to create a new password.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
