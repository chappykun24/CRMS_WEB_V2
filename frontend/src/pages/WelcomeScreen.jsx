import React from 'react'
import { Link } from 'react-router-dom'
import { 
  GraduationCap,
  BookOpen,
  Users,
  BarChart3,
  Shield,
  Clock,
  ArrowRight,
  CheckCircle
} from 'lucide-react'
import bsuLogo from '../images/bsu-logo.png'
import bagongPilipinasLogo from '../images/Hi-Res-BAGONG-PILIPINAS-LOGO-1474x1536.png'
import alangilanImage from '../images/Alangilan-entrance-facade.jpg'
import image204107 from '../images/204107.jpg'
import lipaSliderImage from '../images/lipa-slider-1-scaled.jpg'
import bwBsuImage from '../images/b&w BSU.jpg'

const WelcomeScreen = () => {
  console.log('WelcomeScreen component is rendering')
  
  const [currentSlide, setCurrentSlide] = React.useState(0)
  
  const slideshowImages = [
    alangilanImage,
    image204107,
    lipaSliderImage
  ]
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideshowImages.length)
    }, 5000) // Change slide every 5 seconds
    
    return () => clearInterval(interval)
  }, [slideshowImages.length])
  
  const features = [
    {
      icon: BookOpen,
      title: 'Course & Section Management',
      description: 'Organize courses, sections, and class schedules with real-time updates. Manage course assignments, section configurations, and class rosters efficiently.',
      color: 'bg-blue-500'
    },
    {
      icon: Users,
      title: 'Student Enrollment & Records',
      description: 'Maintain comprehensive student profiles, track enrollment status, and manage academic records throughout their educational journey with detailed tracking capabilities.',
      color: 'bg-green-500'
    },
    {
      icon: Clock,
      title: 'Attendance Tracking',
      description: 'Digital attendance management with real-time recording, session history, and detailed analytics. Monitor student engagement and attendance patterns effectively.',
      color: 'bg-orange-500'
    },
    {
      icon: BarChart3,
      title: 'Grade Management',
      description: 'Streamlined grading system supporting various assessment types with automated calculations. Generate comprehensive grade reports and track student performance.',
      color: 'bg-purple-500'
    },
    {
      icon: GraduationCap,
      title: 'Syllabus Management',
      description: 'Digital syllabus creation, review, and approval workflow ensuring compliance with academic standards. Link learning outcomes to program goals and assessments.',
      color: 'bg-indigo-500'
    },
    {
      icon: BarChart3,
      title: 'Performance Analytics',
      description: 'Advanced analytics and reporting tools providing insights into student performance, class statistics, and academic trends using data-driven clustering and visualization.',
      color: 'bg-purple-500'
    },
    {
      icon: BookOpen,
      title: 'Program & Curriculum',
      description: 'Manage academic programs, specializations, and curriculum structures with support for multiple year levels, course prerequisites, and program requirements.',
      color: 'bg-blue-500'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security measures protect your data. Centralized storage ensures reliability and accessibility with role-based access control.',
      color: 'bg-red-500'
    }
  ]

  const stats = [
    { value: '10,000+', label: 'Students' },
    { value: '500+', label: 'Faculty' },
    { value: '50+', label: 'Departments' },
    { value: '99.9%', label: 'Uptime' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Center Container */}
      <div className="max-w-6xl mx-auto shadow-2xl rounded-2xl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Left side - BSU Logo and Title */}
            <div className="flex items-center space-x-6">
              <img 
                src={bsuLogo} 
                alt="BSU Logo" 
                className="h-12 w-auto object-contain"
              />
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-primary-600">Class Record Management System</h1>
              </div>
            </div>
            
            {/* Right side - Navigation and Bagong Pilipinas Logo */}
            <div className="flex items-center space-x-4">
              <Link
                to="/login?force=true"
                className="text-primary-600 hover:text-primary-800 transition-colors font-semibold px-4 py-2 rounded-lg"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
              >
                Sign Up
              </Link>
              <img 
                src={bagongPilipinasLogo} 
                alt="Bagong Pilipinas Logo" 
                className="h-12 w-auto object-contain ml-2"
              />
            </div>
          </div>
        </div>
      </header>

             {/* Slideshow Section */}
       <section className="bg-gradient-to-br from-primary-50 to-blue-50">
         <div className="max-w-6xl mx-auto">
           {/* Slideshow Container */}
           <div className="relative h-[400px] md:h-[500px] overflow-hidden">
            {/* Slideshow Images */}
            <div className="relative w-full h-full">
              {slideshowImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentSlide ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <img
                    src={image}
                    alt={`Slide ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-600/70 to-transparent"></div>
                </div>
              ))}
                         </div>
             
             {/* Text Overlay - Slide indicators removed */}
             <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
               <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg mb-2">Welcome to</h2>
                               <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white drop-shadow-lg mb-2 tracking-wide font-serif">BATANGAS STATE UNIVERSITY</h1>
               <h3 className="text-lg md:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg mb-8">The Philippines' National Engineering University</h3>
             </div>
            </div>
         </div>
       </section>

      {/* Features Section */}
      <section className="py-20 bg-white relative">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
          style={{ backgroundImage: `url(${bwBsuImage})` }}
        ></div>
        {/* Content */}
        <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Academic Management Platform
            </h2>
            <p className="text-xl text-gray-600 max-w-5xl mx-auto mb-6">
              The Class Record Management System (CRMS) is a centralized digital platform designed to modernize and streamline academic operations at Batangas State University.
            </p>
            <p className="text-lg text-gray-500 max-w-5xl mx-auto">
              From course planning to student performance tracking, CRMS provides all the tools needed to manage academic administration efficiently and effectively.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card hover:shadow-lg transition-all duration-300 group">
                <div className={`p-3 rounded-lg ${feature.color} w-fit mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#393939] text-white pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
            {/* Left: University Info */}
            <div className="md:w-1/2">
              <h2 className="text-xl md:text-2xl font-bold mb-1">BATANGAS STATE UNIVERSITY</h2>
              <h3 className="text-lg font-semibold mb-2">The National Engineering University</h3>
              <p className="text-sm italic text-gray-300 mb-3">A premier national university that develops leaders in the global knowledge economy</p>
              <div className="mb-2">
                <a 
                  href="https://www.facebook.com/castillokeysii" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm underline hover:text-gray-200 transition-colors"
                >
                  Contact Us
                </a>
              </div>
              <div className="mb-2 text-sm font-semibold">Copyright © 2025</div>
              <div className="space-y-0.5 text-xs text-gray-200">
                <div>Online Visitors: <span className="font-bold">12,345</span></div>
                <div>Today's Visitors: <span className="font-bold">1,234</span></div>
                <div>Total Page Views: <span className="font-bold">45,678</span></div>
              </div>
            </div>
          </div>
          {/* Social Media Row */}
          <div className="mt-6 flex justify-center gap-4">
            <a href="#" aria-label="Facebook" className="bg-white text-[#393939] rounded-full w-12 h-12 flex items-center justify-center text-xl hover:bg-gray-200 transition"><i className="fa-brands fa-facebook-f"></i></a>
            <a href="#" aria-label="X" className="bg-white text-[#393939] rounded-full w-12 h-12 flex items-center justify-center text-xl hover:bg-gray-200 transition"><i className="fa-brands fa-x-twitter"></i></a>
            <a href="#" aria-label="YouTube" className="bg-white text-[#393939] rounded-full w-12 h-12 flex items-center justify-center text-xl hover:bg-gray-200 transition"><i className="fa-brands fa-youtube"></i></a>
            <a href="#" aria-label="Location" className="bg-white text-[#393939] rounded-full w-12 h-12 flex items-center justify-center text-xl hover:bg-gray-200 transition"><i className="fa-solid fa-location-dot"></i></a>
            <a href="#" aria-label="LinkedIn" className="bg-white text-[#393939] rounded-full w-12 h-12 flex items-center justify-center text-xl hover:bg-gray-200 transition"><i className="fa-brands fa-linkedin-in"></i></a>
            <a href="#" aria-label="Instagram" className="bg-white text-[#393939] rounded-full w-12 h-12 flex items-center justify-center text-xl hover:bg-gray-200 transition"><i className="fa-brands fa-instagram"></i></a>
            <a href="#" aria-label="Spotify" className="bg-white text-[#393939] rounded-full w-12 h-12 flex items-center justify-center text-xl hover:bg-gray-200 transition"><i className="fa-brands fa-spotify"></i></a>
          </div>
        </div>
      </footer>
      </div>
    </div>
  )
}

export default WelcomeScreen 