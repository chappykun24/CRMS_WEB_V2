import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  GraduationCap
} from 'lucide-react'

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useUser()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // For demo purposes, accept any email/password
      if (formData.email && formData.password) {
        // Use the login function with email and password
        const result = await login(formData.email, formData.password)
        
        if (result.success) {
          navigate('/dashboard/')
        } else {
          setError(result.error || 'Login failed. Please try again.')
        }
      } else {
        setError('Please fill in all fields')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-bold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Welcome back to CRMS
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-6xl flex justify-center">
        <div className="w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-sm border border-gray-200 sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                  {error}
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
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
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

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full"
                >
                  {isLoading ? (
                    <div className="loading-spinner"></div>
                  ) : (
                    'Sign in'
                  )}
                </button>
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
                  className="btn-secondary w-full text-center block"
                >
                  Sign up here
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Credentials - Right Side */}
        <div className="hidden lg:block ml-8 w-80">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sticky top-8">
            <h3 className="text-sm font-medium text-blue-900 mb-3">Quick Login (Demo)</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setFormData({ email: 'admin@university.edu', password: 'admin123' })
                }}
                className="w-full text-left px-3 py-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm"
              >
                <div className="font-medium text-blue-900">Administrator</div>
                <div className="text-xs text-blue-600">admin@university.edu</div>
              </button>
              
              <button
                onClick={() => {
                  setFormData({ email: 'faculty@university.edu', password: 'faculty123' })
                }}
                className="w-full text-left px-3 py-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm"
              >
                <div className="font-medium text-blue-900">Faculty</div>
                <div className="text-xs text-blue-600">faculty@university.edu</div>
              </button>
              
              <button
                onClick={() => {
                  setFormData({ email: 'dean@university.edu', password: 'dean123' })
                }}
                className="w-full text-left px-3 py-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm"
              >
                <div className="font-medium text-blue-900">Dean</div>
                <div className="text-xs text-blue-600">dean@university.edu</div>
              </button>
              
              <button
                onClick={() => {
                  setFormData({ email: 'staff@university.edu', password: 'staff123' })
                }}
                className="w-full text-left px-3 py-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm"
              >
                <div className="font-medium text-blue-900">Staff</div>
                <div className="text-xs text-blue-600">staff@university.edu</div>
              </button>
              
              <button
                onClick={() => {
                  setFormData({ email: 'chair@university.edu', password: 'chair123' })
                }}
                className="w-full text-left px-3 py-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm"
              >
                <div className="font-medium text-blue-900">Program Chair</div>
                <div className="text-xs text-blue-600">chair@university.edu</div>
              </button>
            </div>
            <p className="text-xs text-blue-600 mt-3">
              Click any role to auto-fill credentials
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage 