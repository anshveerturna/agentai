"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getSupabaseClient } from "../../lib/supabase.client"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Separator } from "../../components/ui/separator"
import { Alert, AlertDescription } from "../../components/ui/alert"
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle, Sparkles } from "lucide-react"
import Link from "next/link"

type AuthError = {
  message: string
  type: 'error' | 'warning' | 'info'
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'microsoft' | 'apple' | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const [isValidEmail, setIsValidEmail] = useState(true)

  // Handle URL error parameters
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      const errorMessages: Record<string, AuthError> = {
        'auth_callback_failed': {
          message: 'Authentication failed. Please try again.',
          type: 'error'
        },
        'oauth_error': {
          message: 'OAuth authentication error. Please try again.',
          type: 'error'
        }
      }
      
      const errorMessage = errorMessages[errorParam] || {
        message: 'An unexpected error occurred. Please try again.',
        type: 'error'
      }
      
      setError(errorMessage)
    }
  }, [searchParams])

  // Force dark mode on login page
  useEffect(() => {
    document.documentElement.classList.add('dark')
    return () => {
      // Optional: restore previous theme when leaving login page
      // document.documentElement.classList.remove('dark')
    }
  }, [])

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Handle email input with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    setError(null)
    if (value) {
      setIsValidEmail(validateEmail(value))
    } else {
      setIsValidEmail(true)
    }
  }

  // Clear errors when user types
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    setError(null)
  }

  // Enhanced error handling
  const handleAuthError = (error: any) => {
    console.error('Auth error:', error)
    
    // Map common Supabase errors to user-friendly messages
    const errorMap: Record<string, AuthError> = {
      'Invalid login credentials': {
        message: 'Invalid email or password. Please check your credentials and try again.',
        type: 'error'
      },
      'Email not confirmed': {
        message: 'Please check your email and click the confirmation link before signing in.',
        type: 'warning'
      },
      'Too many requests': {
        message: 'Too many login attempts. Please wait a few minutes before trying again.',
        type: 'warning'
      },
      'User not found': {
        message: 'No account found with this email address.',
        type: 'error'
      }
    }

    const authError = errorMap[error.message] || {
      message: error.message || 'An unexpected error occurred. Please try again.',
      type: 'error' as const
    }

    setError(authError)
  }

  // Email/password login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError({ message: 'Please enter both email and password.', type: 'warning' })
      return
    }

    if (!validateEmail(email)) {
      setError({ message: 'Please enter a valid email address.', type: 'warning' })
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Use hardened proxy route to unify errors & apply brute-force protections
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        // Map 429 to friendly message
        if (res.status === 429) {
          setError({ message: json.message || 'Too many attempts. Please wait and try again later.', type: 'warning' })
        } else {
          setError({ message: 'Invalid email or password.', type: 'error' })
        }
        return
      }

      // Set session in Supabase client so rest of app sees it (import tokens)
      try {
        const client = getSupabaseClient()
        await client.auth.setSession({ access_token: json.access_token, refresh_token: json.refresh_token })
      } catch (err) {
        // Fallback: continue; session may already be set by cookie in future implementation
      }
      const next = searchParams.get('next')
      router.push(next || '/agents')
    } catch (e: any) {
      setError({ message: 'Invalid email or password.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // OAuth login handler
  const handleOAuthLogin = async (provider: 'google' | 'microsoft' | 'apple') => {
    setOauthLoading(provider)
    setError(null)

    try {
      const client = getSupabaseClient()
      const { error } = await client.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        handleAuthError(error)
      }
    } catch (e: any) {
      handleAuthError(e)
    } finally {
      setOauthLoading(null)
    }
  }

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        const client = getSupabaseClient()
        const { data: { user } } = await client.auth.getUser()
        if (user) {
          router.push('/agents')
        }
      } catch (error) {
        // Ignore errors during initial check
      }
    }
    checkUser()
  }, [router])

  return (
    <div className="min-h-screen bg-[#0D1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1F6FEB] to-[#0969DA] rounded-lg flex items-center justify-center shadow-lg hover-lift">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#F0F6FC] tracking-tight">AgentAI</h1>
          </div>
          <h2 className="text-xl font-semibold text-[#F0F6FC] mb-2">
            Welcome back
          </h2>
          <p className="text-sm text-[#8B949E]">
            Sign in to your account to continue
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#21262D] rounded-xl border border-[#30363D] shadow-2xl card-shadow-lg p-6 space-y-5">
          {/* OAuth Buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-10 gap-3 font-medium text-[#F0F6FC] bg-[#21262D] border-[#30363D] hover:bg-[#30363D] hover:border-[#1F6FEB] transition-all duration-200 hover-lift"
              onClick={() => handleOAuthLogin('google')}
              disabled={loading || !!oauthLoading}
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </Button>

            <Button
              variant="outline"
              className="w-full h-10 gap-3 font-medium text-[#F0F6FC] bg-[#21262D] border-[#30363D] hover:bg-[#30363D] hover:border-[#1F6FEB] transition-all duration-200 hover-lift"
              onClick={() => handleOAuthLogin('apple')}
              disabled={loading || !!oauthLoading}
            >
              {oauthLoading === 'apple' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              )}
              Continue with Apple
            </Button>

            <Button
              variant="outline"
              className="w-full h-10 gap-3 font-medium text-[#F0F6FC] bg-[#21262D] border-[#30363D] hover:bg-[#30363D] hover:border-[#1F6FEB] transition-all duration-200 hover-lift"
              onClick={() => handleOAuthLogin('microsoft')}
              disabled={loading || !!oauthLoading}
            >
              {oauthLoading === 'microsoft' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#F25022" d="M1 1h10v10H1z"/>
                  <path fill="#00A4EF" d="M13 1h10v10H13z"/>
                  <path fill="#7FBA00" d="M1 13h10v10H1z"/>
                  <path fill="#FFB900" d="M13 13h10v10H13z"/>
                </svg>
              )}
              Continue with Microsoft
            </Button>
          </div>

          <div className="relative my-4">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-[#21262D] px-3 text-sm font-medium text-[#8B949E]">
                OR
              </span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {error && (
              <Alert variant={error.type === 'error' ? 'destructive' : 'default'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#F0F6FC] text-sm font-semibold">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8B949E]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={handleEmailChange}
                  className={`pl-10 h-10 bg-[#0D1117] border-[#30363D] text-[#F0F6FC] placeholder-[#6E7681] focus:border-[#1F6FEB] focus:ring-[#1F6FEB] rounded-lg transition-all duration-200 ${!isValidEmail && email ? 'border-[#F85149] focus:border-[#F85149] focus:ring-[#F85149]' : ''}`}
                  disabled={loading || !!oauthLoading}
                  required
                />
              </div>
              {!isValidEmail && email && (
                <p className="text-xs text-[#F85149] font-medium">Please enter a valid email address</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#F0F6FC] text-sm font-semibold">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8B949E]" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={handlePasswordChange}
                  className="pl-10 pr-10 h-10 bg-[#0D1117] border-[#30363D] text-[#F0F6FC] placeholder-[#6E7681] focus:border-[#1F6FEB] focus:ring-[#1F6FEB] rounded-lg transition-all duration-200"
                  disabled={loading || !!oauthLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8B949E] hover:text-[#F0F6FC] transition-colors duration-200 p-1"
                  disabled={loading || !!oauthLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-[#1F6FEB] hover:bg-[#0969DA] text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover-lift"
              disabled={loading || !!oauthLoading || !email || !password || !isValidEmail}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="text-center space-y-3">
            <Link
              href="/forgot-password"
              className="text-sm text-[#1F6FEB] hover:text-[#0969DA] font-medium transition-colors duration-200"
            >
              Forgot your password?
            </Link>
            
            <div className="text-sm text-[#8B949E]">
              Don't have an account?{' '}
              <Link
                href="/signup"
                className="text-[#1F6FEB] hover:text-[#0969DA] font-semibold transition-colors duration-200"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-4 text-center">
          <p className="text-xs text-[#6E7681] leading-relaxed">
            Protected by enterprise-grade security. Your data is encrypted and secure.
          </p>
        </div>
      </div>
    </div>
  )
}
