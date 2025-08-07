import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Library, 
  CheckCircle, 
  Calculator, 
  TrendingUp,
  GraduationCap,
  Users,
  BookOpen,
  Award
} from 'lucide-react'

const WelcomeScreen = () => {
  const navigate = useNavigate()

  const features = [
    {
      icon: CheckCircle,
      title: 'Attendance Tracking',
      description: 'Real-time attendance monitoring and reporting'
    },
    {
      icon: Calculator,
      title: 'Automated Grading',
      description: 'Intelligent grade computation and feedback'
    },
    {
      icon: TrendingUp,
      title: 'Performance Analytics',
      description: 'Comprehensive student performance insights'
    },
    {
      icon: Users,
      title: 'User Management',
      description: 'Role-based access for faculty and staff'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">CRMS</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/login')}
                className="btn-ghost"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="btn-primary"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Class Record Management
              <span className="text-primary-600"> System</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Streamline your academic operations with our comprehensive digital solution. 
              Manage attendance, grades, and student records with ease and precision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/signup')}
                className="btn-primary px-8 py-4 text-lg flex items-center justify-center space-x-2"
              >
                <BookOpen className="h-5 w-5" />
                <span>Get Started</span>
              </button>
              <button
                onClick={() => navigate('/login')}
                className="btn-outline px-8 py-4 text-lg"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powerful Features for Academic Excellence
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage your academic institution efficiently and effectively.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Academic Management?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of educators who trust CRMS for their daily operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="bg-white text-primary-600 hover:bg-gray-50 px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200"
            >
              Start Free Trial
            </button>
            <button
              onClick={() => navigate('/login')}
              className="border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <span className="text-xl font-bold">CRMS</span>
              </div>
              <p className="text-gray-400 mb-4">
                Empowering educational institutions with comprehensive digital solutions for 
                efficient academic management and student success.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => navigate('/login')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Sign In
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/signup')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Sign Up
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 CRMS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default WelcomeScreen 