import React, { useState, useEffect, useMemo } from 'react'
import { useUser } from '../../contexts/UserContext'
 
import ClassCard from '../../components/ClassCard'

const MyClasses = () => {
  const { user } = useUser()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Normalize faculty ID from user context
  const facultyId = user?.user_id ?? user?.id
  
  // Selected class and students
  const [selectedClass, setSelectedClass] = useState(null)
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [editFormData, setEditFormData] = useState({
    bannerType: 'color',
    bannerColor: '#3B82F6',
    bannerImage: ''
  })

  // Success message state
  const [successMessage, setSuccessMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Helpers: extract surname (last word) for alphabetical sorting
  const extractSurname = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return ''
    const tokens = fullName.trim().split(/\s+/)
    if (tokens.length === 0) return ''
    return tokens[tokens.length - 1].toLowerCase()
  }

  // Edit modal handlers
  const handleEditClass = (classItem) => {
    setEditingClass(classItem)
    setEditFormData({
      bannerType: classItem.banner_type || 'color',
      bannerColor: classItem.banner_color || '#3B82F6',
      bannerImage: classItem.banner_image || ''
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingClass) return

    try {
      const response = await fetch(`/api/section-courses/${editingClass.section_course_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          banner_type: editFormData.bannerType,
          banner_color: editFormData.bannerType === 'color' ? editFormData.bannerColor : null,
          banner_image: editFormData.bannerType === 'image' ? editFormData.bannerImage : null
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update class: ${response.status}`)
      }

      // Update local state
      setClasses(prev => prev.map(cls => 
        cls.section_course_id === editingClass.section_course_id
          ? {
              ...cls,
              banner_type: editFormData.bannerType,
              banner_color: editFormData.bannerColor,
              banner_image: editFormData.bannerImage
            }
          : cls
      ))

      // Update selected class if it's the one being edited
      if (selectedClass?.section_course_id === editingClass.section_course_id) {
        setSelectedClass(prev => ({
          ...prev,
          banner_type: editFormData.bannerType,
          banner_color: editFormData.bannerColor,
          banner_image: editFormData.bannerImage
        }))
      }

      setShowEditModal(false)
      setEditingClass(null)
      setSuccessMessage('Class banner updated successfully!')
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Error updating class:', error)
      alert(`Failed to update class: ${error.message}`)
    }
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingClass(null)
    setEditFormData({
      bannerType: 'color',
      bannerColor: '#3B82F6',
      bannerImage: ''
    })
  }

  

  // Fetch faculty's assigned classes
  const fetchClasses = async () => {
    try {
      setLoading(true)
      console.log(`🔍 [FACULTY] Fetching classes for user ID: ${facultyId}`)
      
      const response = await fetch(`/api/section-courses/faculty/${facultyId}`, {
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
      const list = Array.isArray(data) ? data : []
      list.sort((a, b) => {
        const aLast = extractSurname(a.full_name)
        const bLast = extractSurname(b.full_name)
        if (aLast === bLast) {
          return (a.full_name || '').localeCompare(b.full_name || '')
        }
        return aLast.localeCompare(bLast)
      })
      setStudents(list)
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
    if (facultyId) {
      fetchClasses()
    }
  }, [facultyId])

  return (
    <div className="h-full flex overflow-hidden">
      {/* Main Content - Classes List */}
      <div className="flex-1 flex flex-col">

        {/* Classes Grid */}
        <div className="flex-1 p-6">
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
                  avatarUrl={cls.faculty_avatar}
                  bannerColor={cls.banner_color}
                  bannerImage={cls.banner_image}
                  bannerType={cls.banner_type}
                  isSelected={selectedClass?.section_course_id === cls.section_course_id}
                  onClick={() => handleClassSelect(cls)}
                  onAttendance={() => console.log('Attendance clicked')}
                  onAssessments={() => console.log('Assessments clicked')}
                  onMore={() => console.log('More clicked')}
                  onEdit={() => handleEditClass(cls)}
                  onArchive={() => console.log('Archive clicked')}
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
      <div className="w-80 bg-white flex flex-col p-4 rounded-lg shadow-sm border border-gray-200 overflow-hidden min-h-0">
        {selectedClass ? (
          <div className="h-full flex flex-col">
            {/* Class Header */}
            <div className="mb-3 pb-3 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-gray-900 whitespace-normal break-words">
                    {selectedClass.course_title}
                  </h2>
                  <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                    <p className="truncate">{selectedClass.course_code} • {selectedClass.section_code}</p>
                    <div className="flex items-center justify-between">
                      <p className="truncate">{selectedClass.semester} {selectedClass.school_year}</p>
                      <span className="ml-2 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                        {students.length} student{students.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enrolled Students Section */}
            <div className="flex-1 flex flex-col min-h-0">
              

              {/* Students List */}
              <div className="flex-1 overflow-auto min-h-0">
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

      {/* Edit Modal */}
      {showEditModal && editingClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Class Banner</h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form */}
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banner</label>
                    
                    {/* Banner Type Selection */}
                    <div className="flex gap-4 mb-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="bannerType"
                          value="color"
                          checked={editFormData.bannerType === 'color'}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, bannerType: e.target.value }))}
                          className="mr-2"
                        />
                        <span className="text-sm">Color</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="bannerType"
                          value="image"
                          checked={editFormData.bannerType === 'image'}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, bannerType: e.target.value }))}
                          className="mr-2"
                        />
                        <span className="text-sm">Image</span>
                      </label>
                    </div>

                    {/* Color Palette */}
                    {editFormData.bannerType === 'color' && (
                      <div className="flex flex-wrap gap-1">
                        {[
                          '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
                          '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#F43F5E'
                        ].map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditFormData(prev => ({ ...prev, bannerColor: color }))}
                            className={`w-6 h-6 rounded border ${
                              editFormData.bannerColor === color 
                                ? 'border-gray-800' 
                                : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    )}

                    {/* Image Upload */}
                    {editFormData.bannerType === 'image' && (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setEditFormData(prev => ({ 
                                  ...prev, 
                                  bannerImage: event.target.result 
                                }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        {editFormData.bannerImage && (
                          <div className="mt-2">
                            <img 
                              src={editFormData.bannerImage} 
                              alt="Banner preview" 
                              className="w-full h-20 object-cover rounded-md"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div>
                <div className="text-sm text-gray-500 mb-2">Preview</div>
                <ClassCard
                  title={editingClass.course_title}
                  code={editingClass.course_code}
                  section={editingClass.section_code}
                  instructor={editingClass.faculty_name}
                  bannerType={editFormData.bannerType}
                  bannerColor={editFormData.bannerColor}
                  bannerImage={editFormData.bannerImage}
                  avatarUrl={editingClass.faculty_avatar}
                  onAttendance={() => {}}
                  onAssessments={() => {}}
                  onMore={() => {}}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={closeEditModal} className="px-3 py-1.5 text-sm bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
              <button onClick={handleSaveEdit} className="px-3 py-1.5 text-sm text-white bg-red-600 rounded-md hover:bg-red-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Success!</h3>
              <p className="text-sm text-gray-500 mb-6">{successMessage}</p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessMessage('');
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyClasses