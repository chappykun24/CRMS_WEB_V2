import React, { useEffect, useMemo, useRef, useState } from 'react'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import ClassCard from '../../components/ClassCard'

const initialMockClasses = [
  {
    id: '1',
    title: 'IT 412 Platform Technologies',
    code: 'IT-BA-4102',
    section: 'IT BA-4102',
    instructor: 'Charlene Calosa',
    bannerUrl: 'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1600&auto=format&fit=crop',
    avatarUrl: 'https://images.unsplash.com/photo-1544006659-f0b21884ce1d?q=80&w=256&auto=format&fit=crop'
  },
  {
    id: '2',
    title: 'ENGG 405 - Technopreneurship',
    code: 'IT-BA-4102',
    section: 'IT-BA-4102',
    instructor: 'Mhark Ellgine Libao',
    bannerUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=256&auto=format&fit=crop'
  },
  {
    id: '3',
    title: 'CS 423 - SIPP',
    code: 'BA - 4102',
    section: 'BA - 4102',
    instructor: 'Richelle Sulit',
    bannerUrl: 'https://images.unsplash.com/photo-1522199710521-72d69614c702?q=80&w=1600&auto=format&fit=crop',
    avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=256&auto=format&fit=crop'
  },
  {
    id: '4',
    title: 'BA02 AIAS',
    code: 'BA4102',
    section: 'BA4102',
    instructor: 'Zymon Andrew M. Maquinto',
    bannerUrl: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1600&auto=format&fit=crop',
    avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=256&auto=format&fit=crop'
  }
]

const AssignFaculty = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [query, setQuery] = useState('')
  const [classes, setClasses] = useState(initialMockClasses)
  const [courses, setCourses] = useState([])
  const [showCourseSuggestions, setShowCourseSuggestions] = useState(false)
  const [terms, setTerms] = useState([])

  const [formData, setFormData] = useState({
    title: '',
    code: '',
    section: '',
    instructor: '',
    bannerUrl: '',
    avatarUrl: ''
  })

  const openCreateModal = () => setShowCreateModal(true)
  const closeCreateModal = () => {
    setShowCreateModal(false)
    setFormData({ title: '', code: '', section: '', instructor: '', bannerUrl: '', avatarUrl: '' })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    const newClass = {
      id: String(Date.now()),
      title: formData.title || 'Untitled Class',
      code: formData.code,
      section: formData.section,
      instructor: formData.instructor,
      bannerUrl: formData.bannerUrl,
      avatarUrl: formData.avatarUrl
    }
    setClasses(prev => [newClass, ...prev])
    closeCreateModal()
  }

  // Compute API base URL similar to other services
  const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api'

  // Load courses when the create modal opens (once per open)
  useEffect(() => {
    if (!showCreateModal) return
    let isMounted = true
    ;(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/courses`)
        if (!response.ok) throw new Error(`Failed to fetch courses: ${response.status}`)
        const data = await response.json()
        if (isMounted) setCourses(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error loading courses:', error)
      }
    })()
    ;(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/school-terms`)
        if (!response.ok) throw new Error(`Failed to fetch school terms: ${response.status}`)
        const data = await response.json()
        if (isMounted) setTerms(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error loading school terms:', error)
      }
    })()
    return () => {
      isMounted = false
    }
  }, [showCreateModal])

  const titleInputRef = useRef(null)

  // Filtered course suggestions based on the title input
  const matchingCourses = useMemo(() => {
    const query = (formData.title || '').trim().toLowerCase()
    if (!query) return []
    return courses
      .filter(c =>
        (c.title || '').toLowerCase().includes(query) ||
        (c.course_code || '').toLowerCase().includes(query)
      )
      .slice(0, 8)
  }, [formData.title, courses])

  const handleSelectCourse = (course) => {
    setFormData(prev => ({
      ...prev,
      title: `${course.course_code || ''} ${course.title || ''}`.trim(),
      code: course.course_code || prev.code
    }))
    setShowCourseSuggestions(false)
    // refocus input after selection for smoother UX
    if (titleInputRef.current) titleInputRef.current.focus()
  }

  const activeTerms = useMemo(() => terms.filter(t => t.is_active), [terms])

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
          {/* Tabs and Add Button */}
          <div className="bg-gray-50 border-b border-gray-200 mb-2">
            <div className="px-0">
              <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200">
                <nav className="flex space-x-8">
                  <div className="py-2 px-4 font-medium text-sm text-red-600 border-b-2 border-red-600">
                    Classes
                  </div>
                </nav>

                {/* Add Button aligned with navigation */}
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  title="Add Class"
                >
                  <PlusIcon className="h-5 w-5 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>

          {/* Content Shell with search to mirror StudentManagement */}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filtered.map(cls => (
                    <ClassCard
                      key={cls.id}
                      title={cls.title}
                      code={cls.code}
                      section={cls.section}
                      instructor={cls.instructor}
                      bannerUrl={cls.bannerUrl}
                      avatarUrl={cls.avatarUrl}
                      onAttendance={() => {}}
                      onAssessments={() => {}}
                      onMore={() => {}}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Section - Sidebar Placeholder */}
            <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-[120px] overflow-auto">
              <div className="h-full flex items-center justify-center text-center text-gray-500 py-10">
                <div>
                  <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <p className="text-sm">Select a class to view details here.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-5xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create Class</h3>
              <button onClick={closeCreateModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form */}
              <div>
                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
                    <input
                      ref={titleInputRef}
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={(e) => { handleInputChange(e); setShowCourseSuggestions(true) }}
                      onFocus={() => setShowCourseSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCourseSuggestions(false), 150)}
                      placeholder="e.g., IT 111 Introduction to Computing"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    {showCourseSuggestions && matchingCourses.length > 0 && (
                      <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow">
                        {matchingCourses.map(course => (
                          <li
                            key={course.course_id}
                            className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-50"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectCourse(course)}
                          >
                            <div className="font-medium text-gray-900">{course.course_code || '—'}</div>
                            <div className="text-gray-600">{course.title}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                      <select
                        name="termId"
                        value={formData.termId || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, termId: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                      >
                        <option value="">Select semester</option>
                        {activeTerms.map(term => (
                          <option key={term.term_id} value={term.term_id}>
                            {`${term.school_year} - ${term.semester}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                      <input
                        type="text"
                        name="section"
                        value={formData.section}
                        onChange={handleInputChange}
                        placeholder="e.g., IT BA-4102"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
                    <input
                      type="text"
                      name="instructor"
                      value={formData.instructor}
                      onChange={handleInputChange}
                      placeholder="Instructor name"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image URL</label>
                    <input
                      type="url"
                      name="bannerUrl"
                      value={formData.bannerUrl}
                      onChange={handleInputChange}
                      placeholder="https://..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instructor Avatar URL</label>
                    <input
                      type="url"
                      name="avatarUrl"
                      value={formData.avatarUrl}
                      onChange={handleInputChange}
                      placeholder="https://..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div>
                <div className="text-sm text-gray-500 mb-2">Preview</div>
                <ClassCard
                  title={formData.title || 'Course Title'}
                  code={formData.code || 'CODE-1234'}
                  section={formData.section || 'SECTION'}
                  instructor={formData.instructor || 'Instructor Name'}
                  bannerUrl={formData.bannerUrl}
                  avatarUrl={formData.avatarUrl}
                  onAttendance={() => {}}
                  onAssessments={() => {}}
                  onMore={() => {}}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={closeCreateModal} className="px-3 py-1.5 text-sm bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
              <button onClick={handleSave} className="px-3 py-1.5 text-sm text-white bg-red-600 rounded-md hover:bg-red-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AssignFaculty


