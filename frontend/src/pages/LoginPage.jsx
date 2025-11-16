import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/UnifiedAuthContext'
import logo from '../images/logo.png'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  ArrowRight,
  CheckCircle,
  X,
  AlertCircle
} from 'lucide-react'

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDemoAccounts, setShowDemoAccounts] = useState(false)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState({ email: '', password: '' })
  
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Preload logo image
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setLogoLoaded(true)
    }
    img.onerror = () => {
      console.warn('Failed to load logo image')
      setLogoLoaded(true) // Still set to true to show placeholder
    }
    img.src = logo
  }, [])

  // If already authenticated, don't allow visiting the login page
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const forceLogin = params.get('force') === 'true'
    if (forceLogin) return
    const storedUser = localStorage.getItem('userData')
    const authed = isAuthenticated || (!!storedUser && storedUser !== 'null' && storedUser !== 'undefined' && storedUser !== '')
    if (authed) {
      let role = ''
      try {
        const user = storedUser ? JSON.parse(storedUser) : null
        role = String(user?.role_name || user?.role || '').toLowerCase().replace(/\s|_/g, '')
      } catch (_) {}
              const defaultPath = role === 'faculty'
        ? '/faculty/classes'
        : role === 'dean'
          ? '/dean'
          : role === 'staff'
            ? '/dashboard/students'
            : role === 'programchair'
              ? '/program-chair'
              : '/dashboard'
      navigate(defaultPath, { replace: true })
    }
  }, [isAuthenticated, navigate, location.search])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
    // Clear validation errors when user starts typing
    setValidationErrors({
      ...validationErrors,
      [e.target.name]: ''
    })
  }

  const validateForm = () => {
    const errors = { email: '', password: '' }
    let isValid = true

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required'
      isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
      isValid = false
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required'
      isValid = false
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long'
      isValid = false
    }

    setValidationErrors(errors)
    return isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setShowErrorModal(false)

    // Validate form before submission
    if (!validateForm()) {
      setIsLoading(false)
      setShowErrorModal(true)
      return
    }

      // Use UserContext login function for proper authentication flow
      const isDev = process.env.NODE_ENV === 'development'
      if (isDev) {
        console.log('[LoginPage] submitting', { email: formData.email })
      }
      const result = await login(formData.email, formData.password)
      if (isDev) {
        console.log('[LoginPage] login result', result)
      }
      
      if (result.success) {
        // Redirect to role-specific default route
        const role = String(result.user?.role_name || result.user?.role || '').toLowerCase().replace(/\s|_/g, '')
        const roleDefaultPath = (() => {
          if (role === 'admin') return '/dashboard'
          if (role === 'faculty') return '/faculty/classes'
          if (role === 'dean') return '/dean'
          if (role === 'staff') return '/dashboard/students'
          if (role === 'programchair') return '/program-chair'
          return '/dashboard'
        })()
        if (isDev) {
          console.log('[LoginPage] navigating to', roleDefaultPath, 'for role', role)
        }
        navigate(roleDefaultPath, { replace: true })
      } else {
        const errorMessage = result.error || 'Login failed. Please check your credentials.'
        setError(errorMessage)
        setShowErrorModal(true)
      }
    } catch (err) {
      const isDev = process.env.NODE_ENV === 'development'
      if (isDev) {
        console.error('[LoginPage] login exception', err)
      }
      const errorMessage = err.response?.data?.message || err.message || 'An unexpected error occurred. Please try again.'
      setError(errorMessage)
      setShowErrorModal(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Red Progress Bar at Top */}
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-red-600"></div>
      )}
      
      {/* Full Screen Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
          <div className="text-center">
            {logoLoaded ? (
              <img 
                src={logo} 
                alt="CRMS Logo" 
                className="w-40 h-40 mx-auto mb-8 animate-pulse object-contain"
                loading="eager"
              />
            ) : (
              <div className="w-40 h-40 mx-auto mb-8 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
                <div className="text-gray-400 text-sm">Loading...</div>
              </div>
            )}
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Signing in...</p>
          </div>
        </div>
      )}
      
      {/* BSU Logo at Top Left - Lazy loaded */}
      <div className="fixed top-4 left-4 z-40">
        <Link to="/" className="hover:opacity-80 transition-opacity inline-block">
          {logoLoaded ? (
            <img 
              src={logo} 
              alt="BSU Logo" 
              className="w-10 h-10 object-contain"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded animate-pulse" />
          )}
        </Link>
      </div>
      
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Welcome back to CRMS
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account to continue
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 border border-gray-200 sm:rounded-3xl sm:px-10 shadow-lg">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-0 transition-all duration-300 ${
                      validationErrors.email 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-gray-300 focus:border-gray-300'
                    }`}
                    placeholder="Email"
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                )}
              </div>

              <div>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-10 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-0 transition-all duration-300 ${
                      validationErrors.password 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-gray-300 focus:border-gray-300'
                    }`}
                    placeholder="Password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-0 border-gray-300 rounded"
                    disabled={isLoading}
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                    Forgot your password?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:outline-none focus:ring-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    to="/signup"
                    className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:outline-none focus:ring-0 transition-colors"
                  >
                    Create new account
                  </Link>
                </div>
              </div>
            </form>

            {/* Demo Accounts Toggle */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors underline focus:outline-none focus:ring-0"
                style={{ outline: 'none' }}
              >
                {showDemoAccounts ? 'Hide demo accounts' : 'Show demo accounts'}
              </button>
            </div>

            {/* Demo Accounts Section */}
            {showDemoAccounts && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-center mb-3">
                  <h4 className="text-sm font-medium text-gray-700">Quick Login</h4>
                  <p className="text-xs text-gray-500">Click to auto-fill</p>
                </div>
                
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ email: 'admin@university.edu', password: 'password123' })}
                    className="w-full bg-white p-2 rounded border border-gray-200 hover:bg-gray-100 transition-colors text-left text-xs focus:outline-none focus:ring-0 focus:border-gray-200 active:outline-none active:ring-0 active:border-gray-200"
                    style={{ border: '1px solid #e5e7eb', outline: 'none' }}
                  >
                    <span className="font-mono text-gray-700">admin@university.edu</span>
                    <span className="text-gray-400 ml-2">(Admin)</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ email: 'dean@university.edu', password: 'password123' })}
                    className="w-full bg-white p-2 rounded border border-gray-200 hover:bg-gray-100 transition-colors text-left text-xs focus:outline-none focus:ring-0 focus:border-gray-200 active:outline-none active:ring-0 active:border-gray-200"
                    style={{ border: '1px solid #e5e7eb', outline: 'none' }}
                  >
                    <span className="font-mono text-gray-700">dean@university.edu</span>
                    <span className="text-gray-400 ml-2">(Dean)</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ email: 'faculty@university.edu', password: 'password123' })}
                    className="w-full bg-white p-2 rounded border border-gray-200 hover:bg-gray-100 transition-colors text-left text-xs focus:outline-none focus:ring-0 focus:border-gray-200 active:outline-none active:ring-0 active:border-gray-200"
                    style={{ border: '1px solid #e5e7eb', outline: 'none' }}
                  >
                    <span className="font-mono text-gray-700">faculty@university.edu</span>
                    <span className="text-gray-400 ml-2">(Faculty)</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ email: 'jose.torres148@university.edu', password: 'Password123!' })}
                    className="w-full bg-white p-2 rounded border border-gray-200 hover:bg-gray-100 transition-colors text-left text-xs focus:outline-none focus:ring-0 focus:border-gray-200 active:outline-none active:ring-0 active:border-gray-200"
                    style={{ border: '1px solid #e5e7eb', outline: 'none' }}
                  >
                    <span className="font-mono text-gray-700">jose.torres148@university.edu</span>
                    <span className="text-gray-400 ml-2">(Faculty 2)</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ email: 'staff@university.edu', password: 'password123' })}
                    className="w-full bg-white p-2 rounded border border-gray-200 hover:bg-gray-100 transition-colors text-left text-xs focus:outline-none focus:ring-0 focus:border-gray-200 active:outline-none active:ring-0 active:border-gray-200"
                    style={{ border: '1px solid #e5e7eb', outline: 'none' }}
                  >
                    <span className="font-mono text-gray-700">staff@university.edu</span>
                    <span className="text-gray-400 ml-2">(Staff)</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ email: 'programchair@university.edu', password: 'password123' })}
                    className="w-full bg-white p-2 rounded border border-gray-200 hover:bg-gray-100 transition-colors text-left text-xs focus:outline-none focus:ring-0 focus:border-gray-200 active:outline-none active:ring-0 active:border-gray-200"
                    style={{ border: '1px solid #e5e7eb', outline: 'none' }}
                  >
                    <span className="font-mono text-gray-700">programchair@university.edu</span>
                    <span className="text-gray-400 ml-2">(Program Chair)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowErrorModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Login Error</h3>
              </div>
              <button
                onClick={() => setShowErrorModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="mb-6">
              {error ? (
                <p className="text-gray-700">{error}</p>
              ) : (
                <div className="space-y-3">
                  {validationErrors.email && (
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email Error</p>
                        <p className="text-sm text-gray-600">{validationErrors.email}</p>
                      </div>
                    </div>
                  )}
                  {validationErrors.password && (
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Password Error</p>
                        <p className="text-sm text-gray-600">{validationErrors.password}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default LoginPage 