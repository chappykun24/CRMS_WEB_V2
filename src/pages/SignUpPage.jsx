import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  GraduationCap,
  Camera,
  Image as ImageIcon,
  Calendar,
  Building,
  Info,
  ArrowLeft
} from 'lucide-react'

const SignUpPage = () => {
  const navigate = useNavigate()
  const { login } = useUser()
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    middleInitial: '',
    suffix: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    termStart: '',
    termEnd: '',
    profilePic: null
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [facultyPhoto, setFacultyPhoto] = useState(null)
  const [showDeptDropdown, setShowDeptDropdown] = useState(false)
  const [departments, setDepartments] = useState([
    { department_id: 1, name: 'Computer Science', department_abbreviation: 'CS' },
    { department_id: 2, name: 'Information Technology', department_abbreviation: 'IT' },
    { department_id: 3, name: 'Computer Engineering', department_abbreviation: 'CE' },
    { department_id: 4, name: 'Electrical Engineering', department_abbreviation: 'EE' },
    { department_id: 5, name: 'Mechanical Engineering', department_abbreviation: 'ME' },
    { department_id: 6, name: 'Civil Engineering', department_abbreviation: 'CE' },
    { department_id: 7, name: 'Business Administration', department_abbreviation: 'BA' },
    { department_id: 8, name: 'Accountancy', department_abbreviation: 'ACC' },
    { department_id: 9, name: 'Mathematics', department_abbreviation: 'MATH' },
    { department_id: 10, name: 'Physics', department_abbreviation: 'PHYS' }
  ])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handlePhotoUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFacultyPhoto(e.target.result)
        setFormData(prev => ({ ...prev, profilePic: file }))
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = () => {
    setFacultyPhoto(null)
    setFormData(prev => ({ ...prev, profilePic: null }))
  }

  const fillRandomData = () => {
    const firstNames = ['Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Liza', 'Carlos', 'Grace', 'Ramon', 'Cecilia']
    const lastNames = ['Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Mendoza', 'Torres', 'Gonzales', 'Ramos', 'Lopez', 'Aquino']
    const middleInitials = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    
    const randomItem = arr => arr[Math.floor(Math.random() * arr.length)]
    const randomEmail = (first, last) => `${first.toLowerCase()}.${last.toLowerCase().replace(/\s/g, '')}${Math.floor(Math.random()*1000)}@university.edu`
    const randomDept = departments[Math.floor(Math.random() * departments.length)].department_id
    
    const firstName = randomItem(firstNames)
    const lastName = randomItem(lastNames)
    
    setFormData({
      lastName,
      firstName,
      middleInitial: randomItem(middleInitials),
      suffix: '',
      email: randomEmail(firstName, lastName),
      password: 'Password123!',
      confirmPassword: 'Password123!',
      department: randomDept,
      termStart: '2024-01-01',
      termEnd: '2025-01-01',
      profilePic: null
    })
  }

  const validateForm = () => {
    if (!formData.lastName.trim()) {
      setError('Last name is required')
      return false
    }
    if (!formData.firstName.trim()) {
      setError('First name is required')
      return false
    }
    if (!formData.email.trim()) {
      setError('Email is required')
      return false
    }
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address')
      return false
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    if (!formData.department) {
      setError('Department is required')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Combine name fields
      const name = [formData.firstName, formData.middleInitial, formData.lastName, formData.suffix].filter(Boolean).join(' ')
      
      // Simulate successful registration
      const user = {
        id: Date.now(),
        name,
        email: formData.email,
        role: 'FACULTY',
        department: formData.department,
        departmentName: departments.find(d => d.department_id == formData.department)?.name,
        termStart: formData.termStart,
        termEnd: formData.termEnd,
        profilePic: facultyPhoto
      }

      // Auto-login after successful registration
      await login(formData.email, formData.password)
      
      // Navigate to dashboard
      navigate('/dashboard')
    } catch (err) {
      setError('Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Faculty Registration</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Fill Random Data Button */}
          <button
            onClick={fillRandomData}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200 mb-8"
          >
            Fill Random Data for Testing
          </button>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Faculty Photo Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Faculty Photo (Optional)</h3>
              <div className="space-y-4">
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  {facultyPhoto ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={facultyPhoto} 
                        alt="Faculty photo" 
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No photo</p>
                    </div>
                  )}
                </div>
                <div className="flex space-x-4">
                  <label className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <ImageIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Choose from Gallery</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter last name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Middle Initial
                  </label>
                  <input
                    type="text"
                    name="middleInitial"
                    value={formData.middleInitial}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter middle initial"
                    maxLength={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suffix
                  </label>
                  <input
                    type="text"
                    name="suffix"
                    value={formData.suffix}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., Jr., Sr."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="input-field pl-10"
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                      className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <span className={formData.department ? 'text-gray-900' : 'text-gray-500'}>
                        {formData.department 
                          ? departments.find(d => d.department_id == formData.department)?.name
                          : 'Select department'
                        }
                      </span>
                      <Building className="h-5 w-5 text-gray-400" />
                    </button>
                    {showDeptDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {departments.map((dept) => (
                          <button
                            key={dept.department_id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, department: dept.department_id })
                              setShowDeptDropdown(false)
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100"
                          >
                            <div className="font-medium text-gray-900">{dept.name}</div>
                            <div className="text-sm text-gray-500">{dept.department_abbreviation}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Term Start
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      name="termStart"
                      value={formData.termStart}
                      onChange={handleInputChange}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Term End
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      name="termEnd"
                      value={formData.termEnd}
                      onChange={handleInputChange}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Account Security */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Security</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="input-field pl-10 pr-10"
                      placeholder="Create a password"
                      required
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="input-field pl-10 pr-10"
                      placeholder="Confirm your password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Information Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  Your application will be reviewed by the administrator. You will receive an email notification once your account is approved.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SignUpPage 