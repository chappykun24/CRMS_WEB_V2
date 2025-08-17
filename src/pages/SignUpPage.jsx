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
import logo from '../images/logo.png'

// Custom Calendar Component
const CustomCalendar = ({ value, onChange, onClose, isOpen }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const calendarRef = React.useRef(null);

  useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value));
    }
  }, [value]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Add previous month's days
    for (let i = startingDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month, i);
      days.push({ date: currentDate, isCurrentMonth: true });
    }
    
    // Add next month's days to fill the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({ date: nextDate, isCurrentMonth: false });
    }
    
    return days;
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    onChange(date.toISOString().split('T')[0]);
    onClose();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
    onChange(today.toISOString().split('T')[0]);
    onClose();
  };

  const clearDate = () => {
    setSelectedDate(null);
    onChange('');
    onClose();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = getDaysInMonth(currentDate);

  if (!isOpen) return null;

  return (
    <div ref={calendarRef} className="calendar-container absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-4 min-w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="text-lg font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
        
        <button
          onClick={goToNextMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <button
            key={index}
            onClick={() => handleDateSelect(day.date)}
            className={`
              p-2 text-sm rounded-md transition-all duration-200 hover:bg-gray-100
              ${!day.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
              ${selectedDate && day.date.toDateString() === selectedDate.toDateString() 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'hover:bg-gray-100'
              }
              ${day.date.toDateString() === new Date().toDateString() && !selectedDate 
                ? 'bg-gray-100 text-gray-900' 
                : ''
              }
            `}
          >
            {day.date.getDate()}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="flex justify-between mt-4 pt-3 border-t border-gray-200">
        <button
          onClick={clearDate}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Clear
        </button>
        <button
          onClick={goToToday}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Today
        </button>
      </div>
    </div>
  );
};

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
  const [showTermStartCalendar, setShowTermStartCalendar] = useState(false)
  const [showTermEndCalendar, setShowTermEndCalendar] = useState(false)
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

  // Close calendars when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTermStartCalendar || showTermEndCalendar) {
        const calendar = event.target.closest('.calendar-container');
        const input = event.target.closest('input[name="termStart"], input[name="termEnd"]');
        const calendarIcon = event.target.closest('.calendar-icon');
        
        // Close both calendars if clicking outside
        if (!calendar && !input && !calendarIcon) {
          setShowTermStartCalendar(false);
          setShowTermEndCalendar(false);
        }
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setShowTermStartCalendar(false);
        setShowTermEndCalendar(false);
      }
    };

    // Use mousedown for immediate response
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showTermStartCalendar, showTermEndCalendar]);

  // Additional click outside handler for better reliability
  useEffect(() => {
    if (showTermStartCalendar || showTermEndCalendar) {
      const handleBodyClick = () => {
        // Small delay to ensure proper event handling
        setTimeout(() => {
          setShowTermStartCalendar(false);
          setShowTermEndCalendar(false);
        }, 100);
      };

      // Add click listener to body
      document.body.addEventListener('click', handleBodyClick);
      
      return () => {
        document.body.removeEventListener('click', handleBodyClick);
      };
    }
  }, [showTermStartCalendar, showTermEndCalendar]);

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
    <>
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
        <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
          <h2 className="text-center text-3xl font-bold text-gray-900 mb-2">
            Faculty Registration
          </h2>
          <p className="text-center text-sm text-gray-600 mb-8">
            Create your faculty account
          </p>
          
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Personal Information */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  <button
                    type="button"
                    onClick={fillRandomData}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium px-3 py-1 rounded-md hover:bg-primary-50 transition-colors"
                  >
                    Fill Random Data
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="relative">
                      <label 
                        htmlFor="lastName" 
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Last Name *
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all duration-300 text-gray-900 font-medium"
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <label 
                        htmlFor="firstName" 
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        First Name *
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all duration-300 text-gray-900 font-medium"
                        placeholder="Enter first name"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <label 
                        htmlFor="middleInitial" 
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Middle Initial
                      </label>
                      <input
                        type="text"
                        id="middleInitial"
                        name="middleInitial"
                        value={formData.middleInitial}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all duration-300 text-gray-900 font-medium"
                        placeholder="Enter middle initial"
                        maxLength={1}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <label 
                        htmlFor="suffix" 
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Suffix
                      </label>
                      <input
                        type="text"
                        id="suffix"
                        name="suffix"
                        value={formData.suffix}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all duration-300 text-gray-900 font-medium"
                        placeholder="Enter suffix (e.g., Jr., Sr.)"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 mt-2">
                    <label 
                      htmlFor="email" 
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Email Address *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all duration-300"
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department *
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                        className="w-full flex items-center justify-between px-3 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all duration-300"
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
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                          {departments.map((dept) => (
                            <button
                              key={dept.department_id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, department: dept.department_id })
                                setShowDeptDropdown(false)
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 transition-colors"
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
                      Term Start *
                    </label>
                    <div className="relative">
                      <div className="calendar-icon absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Calendar className="h-5 w-5 text-gray-500" />
                      </div>
                      <input
                        type="text"
                        name="termStart"
                        value={formData.termStart}
                        onChange={handleInputChange}
                        onClick={() => {
                          setShowTermEndCalendar(false);
                          setShowTermStartCalendar(true);
                        }}
                        readOnly
                        className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all duration-300 cursor-pointer"
                        placeholder="dd/mm/yyyy"
                      />
                      {showTermStartCalendar && (
                        <CustomCalendar
                          value={formData.termStart}
                          onChange={(date) => {
                            setFormData(prev => ({ ...prev, termStart: date }));
                            setShowTermStartCalendar(false);
                          }}
                          onClose={() => setShowTermStartCalendar(false)}
                          isOpen={showTermStartCalendar}
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Term End *
                    </label>
                    <div className="relative">
                      <div className="calendar-icon absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Calendar className="h-5 w-5 text-gray-500" />
                      </div>
                      <input
                        type="text"
                        name="termEnd"
                        value={formData.termEnd}
                        onChange={handleInputChange}
                        onClick={() => {
                          setShowTermStartCalendar(false);
                          setShowTermEndCalendar(true);
                        }}
                        readOnly
                        className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all duration-300 cursor-pointer"
                        placeholder="dd/mm/yyyy"
                      />
                      {showTermEndCalendar && (
                        <CustomCalendar
                          value={formData.termEnd}
                          onChange={(date) => {
                            setFormData(prev => ({ ...prev, termEnd: date }));
                            setShowTermEndCalendar(false);
                          }}
                          onClose={() => setShowTermEndCalendar(false)}
                          isOpen={showTermEndCalendar}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Security */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Security</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label 
                      htmlFor="password" 
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-5">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="block w-full pl-12 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all duration-300"
                        placeholder="Create a password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center z-5 hover:text-gray-600 transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label 
                      htmlFor="confirmPassword" 
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="block w-full pl-12 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all duration-300"
                        placeholder="Confirm your password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center z-10 hover:text-gray-600 transition-colors"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

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
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
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

              {/* Information Note */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-gray-600 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    Your application will be reviewed by the administrator. You will receive an email notification once your account is approved.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

export default SignUpPage 