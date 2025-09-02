import React, { useState, useEffect, useMemo } from 'react'
import { useUser } from '../../contexts/UserContext'
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/solid'
import ClassCard from '../../components/ClassCard'

const MyClasses = () => {
  const { user } = useUser()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Selected class and students
  const [selectedClass, setSelectedClass] = useState(null)
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Fetch faculty's assigned classes
  const fetchClasses = async () => {
    try {
      setLoading(true)
      console.log(`🔍 [FACULTY] Fetching classes for user ID: ${user.user_id}`)
      
      const response = await fetch(`/api/section-courses/faculty/${user.user_id}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      console.log(`📡 [FACULTY] Response status: ${response.status}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch classes: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log(`✅ [FACULTY] Received ${Array.isArray(data) ? data.length : 0} classes`)
      
      setClasses(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('❌ [FACULTY] Error fetching classes:', error)
      setClasses([])
    } finally {
      setLoading(false)
    }
  }

  // Handle class selection
  const handleClassSelect = async (classItem) => {
    setSelectedClass(classItem)
    setLoadingStudents(true)
    try {
      const response = await fetch(`/api/section-courses/${classItem.section_course_id}/students`)
      if (!response.ok) throw new Error('Failed to fetch students')
      const data = await response.json()
      setStudents(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  // Filter classes based on search query
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classes
    const query = searchQuery.toLowerCase()
    return classes.filter(cls => 
      cls.course_title?.toLowerCase().includes(query) ||
      cls.course_code?.toLowerCase().includes(query) ||
      cls.section_code?.toLowerCase().includes(query)
    )
  }, [classes, searchQuery])

  useEffect(() => {
    if (user?.user_id) {
      fetchClasses()
    }
  }, [user?.user_id])

  return (
    <div className="h-full flex">
      {/* Main Content - Classes List */}
      <div className="flex-1 flex flex-col">
        {/* Search Bar */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        {/* Classes Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              <span className="ml-3 text-sm text-gray-600">Loading classes...</span>
            </div>
          ) : filteredClasses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((cls) => (
                <ClassCard
                  key={cls.section_course_id}
                  id={cls.section_course_id}
                  title={cls.course_title}
                  code={cls.course_code}
                  section={cls.section_code}
                  instructor={cls.faculty_name}
                  instructorAvatar={cls.faculty_avatar}
                  bannerColor={cls.banner_color}
                  bannerImage={cls.banner_image}
                  bannerType={cls.banner_type}
                  isSelected={selectedClass?.section_course_id === cls.section_course_id}
                  onClick={() => handleClassSelect(cls)}
                  onAttendance={() => console.log('Attendance clicked')}
                  onAssessments={() => console.log('Assessments clicked')}
                  onMore={() => console.log('More clicked')}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-center">
              <div>
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
                <p className="text-gray-500">
                  {searchQuery ? 'No classes match your search criteria.' : 'You have no assigned classes yet.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Class Details and Students */}
      <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
        {selectedClass ? (
          <div className="h-full flex flex-col">
            {/* Class Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    {selectedClass.course_title}
                  </h2>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Code:</span> {selectedClass.course_code}</p>
                    <p><span className="font-medium">Section:</span> {selectedClass.section_code}</p>
                    <p><span className="font-medium">Instructor:</span> {selectedClass.faculty_name}</p>
                    <p><span className="font-medium">Term:</span> {selectedClass.semester} {selectedClass.school_year}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Enrolled Students Section */}
            <div className="flex-1 flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Enrolled Students</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border">
                      {students.length} student{students.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Students List */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingStudents ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading students...</span>
                  </div>
                ) : students.length > 0 ? (
                  <div className="space-y-3">
                    {students.map((student, index) => (
                      <div key={student.student_id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          {student.student_photo ? (
                            <img 
                              src={student.student_photo} 
                              alt={student.full_name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {student.full_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {student.student_number}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            enrolled
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-center">
                    <div>
                      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">No students enrolled</h3>
                      <p className="text-xs text-gray-500">This class has no enrolled students yet.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">Select a class</h3>
              <p className="text-xs text-gray-500">Choose a class from the list to view enrolled students</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyClasses