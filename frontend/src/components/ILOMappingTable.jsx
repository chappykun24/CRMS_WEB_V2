import React, { useState, useEffect } from 'react'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/solid'

const ILOMappingTable = ({ syllabusId, courseCode, onUpdate }) => {
  const [ilos, setIlos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showILOModal, setShowILOModal] = useState(false)
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [editingILO, setEditingILO] = useState(null)
  const [editingMapping, setEditingMapping] = useState(null)
  const [mappingType, setMappingType] = useState('so') // so, iga, cdio, sdg
  
  // Reference data
  const [soReferences, setSoReferences] = useState([])
  const [igaReferences, setIgaReferences] = useState([])
  const [cdioReferences, setCdioReferences] = useState([])
  const [sdgReferences, setSdgReferences] = useState([])
  
  // Simplified form data - only essential fields stored in DB
  const [iloFormData, setIloFormData] = useState({
    code: '',
    description: ''
  })
  
  const [mappingFormData, setMappingFormData] = useState({
    reference_id: '',
    assessment_tasks: []
  })
  
  // Assessment task options
  const assessmentTasks = [
    { code: 'QZ', label: 'Quiz' },
    { code: 'ME', label: 'Major Exam' },
    { code: 'FP', label: 'Final Project' },
    { code: 'P', label: 'Presentation' },
    { code: 'LA', label: 'Lab Activity' },
    { code: 'Q', label: 'Question' }
  ]
  
  useEffect(() => {
    if (syllabusId) {
      loadILOs()
      loadReferences()
    }
  }, [syllabusId])
  
  const loadILOs = async () => {
    if (!syllabusId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/ilos/syllabus/${syllabusId}`)
      if (response.ok) {
        const data = await response.json()
        setIlos(data)
        setError('')
      } else {
        setError('Failed to load ILOs')
      }
    } catch (error) {
      console.error('Error loading ILOs:', error)
      setError('Failed to load ILOs')
    } finally {
      setLoading(false)
    }
  }
  
  const loadReferences = async () => {
    try {
      const [soRes, igaRes, cdioRes, sdgRes] = await Promise.all([
        fetch('/api/ilos/references/so'),
        fetch('/api/ilos/references/iga'),
        fetch('/api/ilos/references/cdio'),
        fetch('/api/ilos/references/sdg')
      ])
      
      if (soRes.ok) {
        const soData = await soRes.json()
        setSoReferences(soData)
      }
      if (igaRes.ok) {
        const igaData = await igaRes.json()
        setIgaReferences(igaData)
      }
      if (cdioRes.ok) {
        const cdioData = await cdioRes.json()
        setCdioReferences(cdioData)
      }
      if (sdgRes.ok) {
        const sdgData = await sdgRes.json()
        setSdgReferences(sdgData)
      }
    } catch (error) {
      console.error('Error loading references:', error)
    }
  }
  
  const handleCreateILO = async (e) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/ilos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          syllabus_id: syllabusId,
          code: iloFormData.code,
          description: iloFormData.description
        })
      })
      
      if (response.ok) {
        setShowILOModal(false)
        resetILOForm()
        loadILOs()
        if (onUpdate) onUpdate()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create ILO')
      }
    } catch (error) {
      console.error('Error creating ILO:', error)
      alert('Failed to create ILO')
    }
  }
  
  const handleUpdateILO = async (e) => {
    e.preventDefault()
    if (!editingILO) return
    
    try {
      const response = await fetch(`/api/ilos/${editingILO.ilo_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          code: iloFormData.code,
          description: iloFormData.description
        })
      })
      
      if (response.ok) {
        setShowILOModal(false)
        setEditingILO(null)
        resetILOForm()
        loadILOs()
        if (onUpdate) onUpdate()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update ILO')
      }
    } catch (error) {
      console.error('Error updating ILO:', error)
      alert('Failed to update ILO')
    }
  }
  
  const handleDeleteILO = async (iloId) => {
    if (!confirm('Are you sure you want to delete this ILO?')) return
    
    try {
      const response = await fetch(`/api/ilos/${iloId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      
      if (response.ok) {
        loadILOs()
        if (onUpdate) onUpdate()
      } else {
        alert('Failed to delete ILO')
      }
    } catch (error) {
      console.error('Error deleting ILO:', error)
      alert('Failed to delete ILO')
    }
  }
  
  const handleSaveMapping = async (e) => {
    e.preventDefault()
    if (!editingMapping || !mappingFormData.reference_id) return
    
    try {
      const endpoint = `/api/ilos/${editingMapping.ilo_id}/mappings/${mappingType}`
      const body = {
        [`${mappingType}_id`]: parseInt(mappingFormData.reference_id),
        assessment_tasks: mappingFormData.assessment_tasks
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(body)
      })
      
      if (response.ok) {
        setShowMappingModal(false)
        setEditingMapping(null)
        resetMappingForm()
        loadILOs()
        if (onUpdate) onUpdate()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save mapping')
      }
    } catch (error) {
      console.error('Error saving mapping:', error)
      alert('Failed to save mapping')
    }
  }
  
  const handleDeleteMapping = async (iloId, referenceId, type) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return
    
    try {
      const endpoint = `/api/ilos/${iloId}/mappings/${type}/${referenceId}`
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      
      if (response.ok) {
        loadILOs()
        if (onUpdate) onUpdate()
      } else {
        alert('Failed to delete mapping')
      }
    } catch (error) {
      console.error('Error deleting mapping:', error)
      alert('Failed to delete mapping')
    }
  }
  
  const openEditILOModal = (ilo) => {
    setEditingILO(ilo)
    setIloFormData({
      code: ilo.code || '',
      description: ilo.description || ''
    })
    setShowILOModal(true)
  }
  
  const openMappingModal = (ilo, type, existingMapping = null) => {
    setEditingMapping(ilo)
    setMappingType(type)
    if (existingMapping) {
      setMappingFormData({
        reference_id: existingMapping[`${type}_id`] || '',
        assessment_tasks: existingMapping.assessment_tasks || []
      })
    } else {
      resetMappingForm()
    }
    setShowMappingModal(true)
  }
  
  const resetILOForm = () => {
    setIloFormData({
      code: '',
      description: ''
    })
    setEditingILO(null)
  }
  
  const resetMappingForm = () => {
    setMappingFormData({
      reference_id: '',
      assessment_tasks: []
    })
  }
  
  const toggleAssessmentTask = (taskCode) => {
    setMappingFormData(prev => ({
      ...prev,
      assessment_tasks: prev.assessment_tasks.includes(taskCode)
        ? prev.assessment_tasks.filter(t => t !== taskCode)
        : [...prev.assessment_tasks, taskCode]
    }))
  }
  
  const getMappingForILO = (ilo, type) => {
    const mappingKey = `${type}_mappings`
    if (ilo[mappingKey] && Array.isArray(ilo[mappingKey])) {
      return ilo[mappingKey]
    }
    return []
  }
  
  const getReferenceList = () => {
    switch (mappingType) {
      case 'so': return soReferences
      case 'iga': return igaReferences
      case 'cdio': return cdioReferences
      case 'sdg': return sdgReferences
      default: return []
    }
  }
  
  const formatAssessmentTasks = (tasks) => {
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) return '—'
    return tasks.join(', ')
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading ILO mappings...</div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {/* Header with Align ILO button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">ILO Mapping Table</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetILOForm()
              setShowILOModal(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Align ILO
          </button>
        </div>
      </div>
      
      {/* ILO Mapping Table - Simplified */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ILO</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student Outcomes (SO)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Institutional Graduate Attributes (IGA)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CDIO Skills
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SDG Skills
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ilos.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                  No ILOs defined. Click "Align ILO" to create one.
                </td>
              </tr>
            ) : (
              ilos.map((ilo) => (
                <tr key={ilo.ilo_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{ilo.code}</div>
                    <div className="text-xs text-gray-500 truncate max-w-xs">{ilo.description}</div>
                  </td>
                  
                  {/* SO Mappings */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {getMappingForILO(ilo, 'so').map((mapping, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-gray-700">{mapping.so_code}</span>
                          <span className="text-gray-500">({formatAssessmentTasks(mapping.assessment_tasks)})</span>
                          <button
                            onClick={() => handleDeleteMapping(ilo.ilo_id, mapping.so_id, 'so')}
                            className="text-red-600 hover:text-red-900"
                            title="Delete mapping"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => openMappingModal(ilo, 'so')}
                        className="text-xs text-red-600 hover:text-red-900 flex items-center gap-1"
                      >
                        <PlusIcon className="h-3 w-3" />
                        Align SO
                      </button>
                    </div>
                  </td>
                  
                  {/* IGA Mappings */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {getMappingForILO(ilo, 'iga').map((mapping, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-gray-700">{mapping.iga_code}</span>
                          <span className="text-gray-500">({formatAssessmentTasks(mapping.assessment_tasks)})</span>
                          <button
                            onClick={() => handleDeleteMapping(ilo.ilo_id, mapping.iga_id, 'iga')}
                            className="text-red-600 hover:text-red-900"
                            title="Delete mapping"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => openMappingModal(ilo, 'iga')}
                        className="text-xs text-red-600 hover:text-red-900 flex items-center gap-1"
                      >
                        <PlusIcon className="h-3 w-3" />
                        Align IGA
                      </button>
                    </div>
                  </td>
                  
                  {/* CDIO Mappings */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {getMappingForILO(ilo, 'cdio').map((mapping, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-gray-700">{mapping.cdio_code}</span>
                          <span className="text-gray-500">({formatAssessmentTasks(mapping.assessment_tasks)})</span>
                          <button
                            onClick={() => handleDeleteMapping(ilo.ilo_id, mapping.cdio_id, 'cdio')}
                            className="text-red-600 hover:text-red-900"
                            title="Delete mapping"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => openMappingModal(ilo, 'cdio')}
                        className="text-xs text-red-600 hover:text-red-900 flex items-center gap-1"
                      >
                        <PlusIcon className="h-3 w-3" />
                        Align CDIO
                      </button>
                    </div>
                  </td>
                  
                  {/* SDG Mappings */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {getMappingForILO(ilo, 'sdg').map((mapping, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-gray-700">{mapping.sdg_code}</span>
                          <span className="text-gray-500">({formatAssessmentTasks(mapping.assessment_tasks)})</span>
                          <button
                            onClick={() => handleDeleteMapping(ilo.ilo_id, mapping.sdg_id, 'sdg')}
                            className="text-red-600 hover:text-red-900"
                            title="Delete mapping"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => openMappingModal(ilo, 'sdg')}
                        className="text-xs text-red-600 hover:text-red-900 flex items-center gap-1"
                      >
                        <PlusIcon className="h-3 w-3" />
                        Align SDG
                      </button>
                    </div>
                  </td>
                  
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditILOModal(ilo)}
                        className="text-red-600 hover:text-red-900"
                        title="Edit ILO"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteILO(ilo.ilo_id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete ILO"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Simplified ILO Modal - Only Code and Description */}
      {showILOModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingILO ? 'Edit ILO' : 'Create New ILO'}
              </h2>
              
              <form onSubmit={editingILO ? handleUpdateILO : handleCreateILO} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ILO Code *</label>
                  <input
                    type="text"
                    value={iloFormData.code}
                    onChange={(e) => setIloFormData(prev => ({ ...prev, code: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., ILO1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    value={iloFormData.description}
                    onChange={(e) => setIloFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Describe the intended learning outcome..."
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowILOModal(false)
                      resetILOForm()
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {editingILO ? 'Update ILO' : 'Create ILO'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Mapping Modal */}
      {showMappingModal && editingMapping && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Map ILO {editingMapping.code} to {mappingType.toUpperCase()}
              </h2>
              
              <form onSubmit={handleSaveMapping} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {mappingType.toUpperCase()} Reference *
                  </label>
                  <select
                    value={mappingFormData.reference_id}
                    onChange={(e) => setMappingFormData(prev => ({ ...prev, reference_id: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Select {mappingType.toUpperCase()}</option>
                    {getReferenceList().map((ref) => (
                      <option key={ref[`${mappingType}_id`]} value={ref[`${mappingType}_id`]}>
                        {ref[`${mappingType}_code`]} - {ref.description}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Tasks</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {assessmentTasks.map((task) => (
                      <label key={task.code} className="flex items-center gap-2 p-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={mappingFormData.assessment_tasks.includes(task.code)}
                          onChange={() => toggleAssessmentTask(task.code)}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">{task.code} - {task.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMappingModal(false)
                      setEditingMapping(null)
                      resetMappingForm()
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Save Mapping
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ILOMappingTable
