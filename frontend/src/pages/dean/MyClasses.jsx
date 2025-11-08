import React, { useEffect, useMemo, useState } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import ClassCard from '../../components/ClassCard'
import ClassCardSkeleton from '../../components/ClassCardSkeleton'
import { getPrefetchedClasses } from '../../services/dataPrefetchService'
import { API_BASE_URL } from '../../utils/api'

const MyClasses = () => {
  const [query, setQuery] = useState('')
  const [classes, setClasses] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  
  // Class selection and students
  const [selectedClass, setSelectedClass] = useState(null)
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Handle class selection
  const handleClassSelect = async (classItem) => {
    setSelectedClass(classItem)
    setLoadingStudents(true)
    
    try {
      const response = await fetch(`/api/section-courses/${classItem.id}/students`)
      if (!response.ok) throw new Error(`Failed to fetch students: ${response.status}`)
      const studentData = await response.json()
      setStudents(Array.isArray(studentData) ? studentData : [])
    } catch (error) {
      console.error('Error loading students:', error)
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  // Load existing section courses when component mounts (check prefetch first)
  useEffect(() => {
    let isMounted = true
    
    // Check prefetch cache first
    const prefetchedClasses = getPrefetchedClasses()
    if (prefetchedClasses && Array.isArray(prefetchedClasses)) {
      console.log('📦 [MyClasses] Using prefetched classes data')
      const formattedClasses = prefetchedClasses.map(item => ({
        id: String(item.section_course_id),
        title: item.course_title,
        code: item.course_code,
        section: item.section_code,
        instructor: item.faculty_name,
        bannerType: item.banner_type || 'color',
        bannerColor: item.banner_color || '#3B82F6',
        bannerImage: item.banner_image,
        avatarUrl: item.faculty_avatar
      }))
      setClasses(formattedClasses)
      setLoadingClasses(false)
      return
    }
    
    // Fallback to fetch if not in cache
    ;(async () => {
      try {
        setLoadingClasses(true)
        const response = await fetch(`${API_BASE_URL}/section-courses/assigned`)
        if (!response.ok) throw new Error(`Failed to fetch assigned courses: ${response.status}`)
        
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response is not JSON')
        }
        
        const data = await response.json()
        if (isMounted) {
          const formattedClasses = data.map(item => ({
            id: String(item.section_course_id),
            title: item.course_title,
            code: item.course_code,
            section: item.section_code,
            instructor: item.faculty_name,
            bannerType: item.banner_type || 'color',
            bannerColor: item.banner_color || '#3B82F6',
            bannerImage: item.banner_image,
            avatarUrl: item.faculty_avatar
          }))
          setClasses(formattedClasses)
        }
      } catch (error) {
        console.error('Error loading assigned courses:', error)
        if (isMounted) setClasses([])
      } finally {
        if (isMounted) setLoadingClasses(false)
      }
    })()
    return () => {
      isMounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (!query) return classes
    return classes.filter(c =>
      (c.title || '').toLowerCase().includes(query.toLowerCase()) ||
      (c.code || '').toLowerCase().includes(query.toLowerCase()) ||
      (c.instructor || '').toLowerCase().includes(query.toLowerCase())
    )
  }, [query, classes])

  return (
    <>
      <div className="pt-0 pb-4 overflow-hidden">
        <div className="w-full">
          {/* Header */}
          <div className="bg-gray-50 border-b border-gray-200 mb-2">
            <div className="px-0">
              <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200">
                <nav className="flex space-x-8">
                  <div className="py-2 px-4 font-medium text-sm text-red-600 border-b-2 border-red-600">
                    Classes
                  </div>
                </nav>
              </div>
            </div>
          </div>

          {/* Content Shell */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-150px)]">
            {/* Left Section */}
            <div className="lg:col-span-3 flex flex-col h-full min-h-0">
              {/* Search Bar */}
              <div className="mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search classes or faculty..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Classes Grid */}
              <div className="flex-1 min-h-0 overflow-auto">
                {loadingClasses ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, index) => (
                      <ClassCardSkeleton key={index} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filtered.map(cls => (
                      <ClassCard
                        key={cls.id}
                        title={cls.title}
                        code={cls.code}
                        section={cls.section}
                        instructor={cls.instructor}
                        bannerType={cls.bannerType}
                        bannerColor={cls.bannerColor}
                        bannerImage={cls.bannerImage}
                        avatarUrl={cls.avatarUrl}
                        isSelected={selectedClass?.id === cls.id}
                        onClick={() => handleClassSelect(cls)}
                        onAttendance={() => {}}
                        onAssessments={() => {}}
                        onMore={() => {}}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Section - Class Details and Students */}
            <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-[120px] overflow-auto">
              {selectedClass ? (
                <div className="h-full flex flex-col">
                  {/* Class Header */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedClass.title}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><span className="font-medium">Code:</span> {selectedClass.code}</div>
                      <div><span className="font-medium">Section:</span> {selectedClass.section}</div>
                      <div><span className="font-medium">Instructor:</span> {selectedClass.instructor}</div>
                    </div>
                  </div>

                  {/* Students List */}
                  <div className="flex-1 min-h-0">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-medium text-gray-900">Enrolled Students</h4>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {students.length} student{students.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {loadingStudents ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading students...</span>
                      </div>
                    ) : students.length > 0 ? (
                      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                        {students.map((student) => (
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
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                student.status === 'enrolled' 
                                  ? 'bg-green-100 text-green-800' 
                                  : student.status === 'dropped'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {student.status || 'enrolled'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-center">
                        <div>
                          <div className="mx-auto mb-2 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-500">No students enrolled</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center text-gray-500 py-10">
                  <div>
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <p className="text-sm">Select a class to view students here.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default MyClasses
