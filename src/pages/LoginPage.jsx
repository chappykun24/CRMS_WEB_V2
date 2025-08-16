import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  ArrowRight,
  CheckCircle,
  Key
} from 'lucide-react'
import logo from '../images/logo.png'

const LoginPage = () => {
  console.log('LoginPage component is rendering')
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSettingUpPasswords, setIsSettingUpPasswords] = useState(false)
  const [error, setError] = useState('')
  const [setupMessage, setSetupMessage] = useState('')
  
  const { login } = useUser()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
    setSetupMessage('')
  }

  const handleSetupPasswords = async () => {
    setIsSettingUpPasswords(true)
    setSetupMessage('')
    setError('')

    try {
      const response = await fetch('/api/setup-passwords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSetupMessage(`✅ ${result.message}`)
        // Clear any previous errors
        setError('')
      } else {
        setError(result.error || 'Failed to setup passwords')
        setSetupMessage('')
      }
    } catch (err) {
      console.error('Setup passwords error:', err)
      setError('Failed to setup passwords. Please try again.')
      setSetupMessage('')
    } finally {
      setIsSettingUpPasswords(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSetupMessage('')

    try {
      // Validate form data
      if (!formData.email || !formData.password) {
        setError('Please fill in all fields')
        return
      }

      // Attempt login with real authentication
      const result = await login(formData.email, formData.password)
      
      if (result.success) {
        // Redirect to the main dashboard - role-based routing is handled there
        navigate('/dashboard')
      } else {
        setError(result.error || 'Login failed. Please check your credentials.')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Full Screen Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
          <div className="text-center">
            <img 
              src={logo} 
              alt="CRMS Logo" 
              className="w-40 h-40 mx-auto mb-8 animate-pulse object-contain"
            />
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Signing in...</p>
          </div>
        </div>
      )}
      
      {/* BSU Logo at Top Left */}
      <div className="fixed top-4 left-4 z-40">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <img 
            src={logo} 
            alt="BSU Logo" 
            className="w-10 h-10 object-contain"
          />
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
          <div className="bg-white py-8 px-6 border border-gray-200 sm:rounded-3xl sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>{error}</span>
                </div>
              )}

              {setupMessage && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg flex items-start space-x-2">
                  <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{setupMessage}</p>
                    <p className="text-sm text-green-500 mt-1">
                      You can now login with any user email using password: <code className="bg-green-100 px-1 rounded font-mono">password123</code>
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="label">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <div className="input-icon">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field input-with-icon"
                    placeholder="Enter your email"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="input-icon">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="input-field input-with-icon pr-10"
                    placeholder="Enter your password"
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
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    disabled={isLoading}
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                    Forgot your password?
                  </a>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSetupPasswords}
                  disabled={isSettingUpPasswords || isLoading}
                  className="btn-outline-orange w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSettingUpPasswords ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                      <span>Setting up passwords...</span>
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4" />
                      <span>Setup User Passwords</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-xs text-center text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="font-semibold text-gray-700 mb-2">🔑 Quick Setup Instructions:</p>
                <p className="mb-2"><strong>1.</strong> Click "Setup User Passwords" to configure all users</p>
                <p className="mb-2"><strong>2.</strong> All users will then use password: <code className="bg-gray-200 px-1 rounded font-mono">password123</code></p>
                <p className="mb-2"><strong>3.</strong> Use any of these emails to login:</p>
                <div className="grid grid-cols-1 gap-1 text-xs mt-2">
                  <div className="bg-white p-2 rounded border">
                    <span className="font-mono">admin@university.edu</span> <span className="text-blue-600">(Admin)</span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="font-mono">dean@university.edu</span> <span className="text-green-600">(Dean)</span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="font-mono">faculty@university.edu</span> <span className="text-purple-600">(Faculty)</span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="font-mono">staff@university.edu</span> <span className="text-orange-600">(Staff)</span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="font-mono">student@university.edu</span> <span className="text-red-600">(Student)</span>
                  </div>
                </div>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/signup"
                  className="btn-outline w-full text-center block"
                >
                  Create new account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default LoginPage 