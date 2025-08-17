import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Calendar, Building, GraduationCap } from 'lucide-react';
import { departmentService, schoolTermService } from '../../services/schoolConfigService';
import { useSidebar } from '../../contexts/SidebarContext';

const SchoolConfiguration = () => {
  const { sidebarExpanded } = useSidebar();
  const [activeTab, setActiveTab] = useState(() => {
    // Get the active tab from localStorage or default to departments
    return localStorage.getItem('schoolConfigActiveTab') || 'departments'
  });
  
  // Database state
  const [departments, setDepartments] = useState([]);
  const [schoolTerms, setSchoolTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [showAddTerm, setShowAddTerm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [editingTerm, setEditingTerm] = useState(null);
  const [newDepartment, setNewDepartment] = useState({ name: '', department_abbreviation: '' });
  const [newTerm, setNewTerm] = useState({ school_year: '', semester: '', start_date: '', end_date: '', is_active: false });
  
  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  
  // Loading states
  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [isAddingTerm, setIsAddingTerm] = useState(false);
  const [isUpdatingDepartment, setIsUpdatingDepartment] = useState(false);
  const [isUpdatingTerm, setIsUpdatingTerm] = useState(false);
  
  // Validation states
  const [departmentErrors, setDepartmentErrors] = useState({});
  const [termErrors, setTermErrors] = useState({});
  
  // Calendar states
  const [showTermStartCalendar, setShowTermStartCalendar] = useState(false);
  const [showTermEndCalendar, setShowTermEndCalendar] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Update localStorage when activeTab changes
  useEffect(() => {
    localStorage.setItem('schoolConfigActiveTab', activeTab)
    
    // Dispatch custom event to notify Header component
    const event = new CustomEvent('schoolConfigTabChanged', { 
      detail: { activeTab } 
    })
    window.dispatchEvent(event)
  }, [activeTab])

  // Load data from database
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [deptData, termData] = await Promise.all([
        departmentService.getAll(),
        schoolTermService.getAll()
      ]);
      setDepartments(deptData);
      setSchoolTerms(termData);
    } catch (error) {
      console.error('Error loading data:', error);
      setErrorMessage('Failed to load data from database');
    } finally {
      setLoading(false);
    }
  };

  // Validation functions
  const validateDepartment = () => {
    const errors = {};
    
    if (!newDepartment.name.trim()) {
      errors.name = 'Department name is required';
    } else if (newDepartment.name.trim().length < 2) {
      errors.name = 'Department name must be at least 2 characters';
    } else if (newDepartment.name.trim().length > 100) {
      errors.name = 'Department name must be less than 100 characters';
    }
    
    if (!newDepartment.department_abbreviation.trim()) {
      errors.abbreviation = 'Department abbreviation is required';
    } else if (newDepartment.department_abbreviation.trim().length < 2) {
      errors.abbreviation = 'Abbreviation must be at least 2 characters';
    } else if (newDepartment.department_abbreviation.trim().length > 10) {
      errors.abbreviation = 'Abbreviation must be less than 10 characters';
    }
    
    // Check for duplicate names
    const existingDept = departments.find(dept => 
      dept.name.toLowerCase().trim() === newDepartment.name.toLowerCase().trim() &&
      (!editingDepartment || dept.department_id !== editingDepartment.department_id)
    );
    if (existingDept) {
      errors.name = 'Department name already exists';
    }
    
    // Check for duplicate abbreviations
    const existingAbbr = departments.find(dept => 
      dept.department_abbreviation.toLowerCase().trim() === newDepartment.department_abbreviation.toLowerCase().trim() &&
      (!editingDepartment || dept.department_id !== editingDepartment.department_id)
    );
    if (existingAbbr) {
      errors.abbreviation = 'Department abbreviation already exists';
    }
    
    return errors;
  };

  const validateTerm = () => {
    const errors = {};
    
    if (!newTerm.school_year.trim()) {
      errors.schoolYear = 'School year is required';
    } else if (!/^\d{4}-\d{4}$/.test(newTerm.school_year.trim())) {
      errors.schoolYear = 'School year must be in format YYYY-YYYY (e.g., 2024-2025)';
    }
    
    if (!newTerm.semester) {
      errors.semester = 'Semester is required';
    }
    
    if (!newTerm.start_date) {
      errors.startDate = 'Start date is required';
    }
    
    if (!newTerm.end_date) {
      errors.endDate = 'End date is required';
    }
    
    if (newTerm.start_date && newTerm.end_date) {
      const startDate = new Date(newTerm.start_date);
      const endDate = new Date(newTerm.end_date);
      if (startDate >= endDate) {
        errors.endDate = 'End date must be after start date';
      }
    }
    
    return errors;
  };

  // Department Management
  const handleAddDepartment = async () => {
    // Clear previous errors
    setDepartmentErrors({});
    setErrorMessage('');
    
    // Validate form
    const errors = validateDepartment();
    if (Object.keys(errors).length > 0) {
      setDepartmentErrors(errors);
      return;
    }

    try {
      setIsAddingDepartment(true);
      const createdDept = await departmentService.create(newDepartment);
      setDepartments([...departments, createdDept]);
      setNewDepartment({ name: '', department_abbreviation: '' });
      setShowAddDepartment(false);
      setSuccessMessage('Department added successfully');
      setShowSuccessModal(true);
    } catch (error) {
      setErrorMessage(error.message);
      setShowErrorModal(true);
    } finally {
      setIsAddingDepartment(false);
    }
  };

  const handleEditDepartment = (dept) => {
    setEditingDepartment(dept);
    setNewDepartment({ ...dept });
    setShowAddDepartment(true);
  };

  const handleUpdateDepartment = async () => {
    // Clear previous errors
    setDepartmentErrors({});
    setErrorMessage('');
    
    // Validate form
    const errors = validateDepartment();
    if (Object.keys(errors).length > 0) {
      setDepartmentErrors(errors);
      return;
    }

    try {
      setIsUpdatingDepartment(true);
      const updatedDept = await departmentService.update(editingDepartment.department_id, newDepartment);
      setDepartments(departments.map(dept => 
        dept.department_id === editingDepartment.department_id ? updatedDept : dept
      ));
      setNewDepartment({ name: '', department_abbreviation: '' });
      setEditingDepartment(null);
      setShowAddDepartment(false);
      setSuccessMessage('Department updated successfully');
      setShowSuccessModal(true);
    } catch (error) {
      setErrorMessage(error.message);
      setShowErrorModal(true);
    } finally {
      setIsUpdatingDepartment(false);
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await departmentService.delete(id);
        setDepartments(departments.filter(dept => dept.department_id !== id));
        setSuccessMessage('Department deleted successfully');
        setShowSuccessModal(true);
      } catch (error) {
        setErrorMessage(error.message);
        setTimeout(() => setErrorMessage(''), 5000);
      }
    }
  };

  const handleToggleDepartmentStatus = async (id) => {
    // Status toggle not supported - status column not in database schema
    setErrorMessage('Status toggle not supported - status column not in database schema');
    setTimeout(() => setErrorMessage(''), 5000);
  };

  // School Term Management
  const handleAddTerm = async () => {
    // Clear previous errors
    setTermErrors({});
    setErrorMessage('');
    
    // Validate form
    const errors = validateTerm();
    if (Object.keys(errors).length > 0) {
      setTermErrors(errors);
      return;
    }

    try {
      setIsAddingTerm(true);
      const createdTerm = await schoolTermService.create(newTerm);
      setSchoolTerms([...schoolTerms, createdTerm]);
      setNewTerm({ school_year: '', semester: '', start_date: '', end_date: '', is_active: false });
      setShowAddTerm(false);
      setSuccessMessage('School term added successfully');
      setShowSuccessModal(true);
    } catch (error) {
      setErrorMessage(error.message);
      setShowErrorModal(true);
    } finally {
      setIsAddingTerm(false);
    }
  };

  const handleEditTerm = (term) => {
    setEditingTerm(term);
    setNewTerm({ ...term });
    setShowAddTerm(true);
  };

  const handleUpdateTerm = async () => {
    // Clear previous errors
    setTermErrors({});
    setErrorMessage('');
    
    // Validate form
    const errors = validateTerm();
    if (Object.keys(errors).length > 0) {
      setTermErrors(errors);
      return;
    }

    try {
      setIsUpdatingTerm(true);
      const updatedTerm = await schoolTermService.update(editingTerm.term_id, newTerm);
      setSchoolTerms(schoolTerms.map(term => 
        term.term_id === editingTerm.term_id ? updatedTerm : term
      ));
      setNewTerm({ school_year: '', semester: '', start_date: '', end_date: '', is_active: false });
      setEditingTerm(null);
      setShowAddTerm(false);
      setSuccessMessage('School term updated successfully');
      setShowSuccessModal(true);
    } catch (error) {
      setErrorMessage(error.message);
      setShowErrorModal(true);
    } finally {
      setIsUpdatingTerm(false);
    }
  };

  const handleDeleteTerm = async (id) => {
    if (window.confirm('Are you sure you want to delete this school term?')) {
      try {
        await schoolTermService.delete(id);
        setSchoolTerms(schoolTerms.filter(term => term.term_id !== id));
        setSuccessMessage('School term deleted successfully');
        setShowSuccessModal(true);
      } catch (error) {
        setErrorMessage(error.message);
        setTimeout(() => setErrorMessage(''), 5000);
      }
    }
  };

  const handleToggleTermStatus = async (id) => {
    try {
      const updatedTerm = await schoolTermService.toggleStatus(id);
      setSchoolTerms(schoolTerms.map(term => 
        term.term_id === id ? updatedTerm : term
      ));
      setSuccessMessage('School term status updated successfully');
      setShowSuccessModal(true);
    } catch (error) {
      setErrorMessage(error.message);
      setShowErrorModal(true);
    }
  };

  const cancelEdit = () => {
    setEditingDepartment(null);
    setEditingTerm(null);
    setNewDepartment({ name: '', department_abbreviation: '' });
    setNewTerm({ school_year: '', semester: '', start_date: '', end_date: '', is_active: false });
    setShowAddDepartment(false);
    setShowAddTerm(false);
    setDepartmentErrors({});
    setTermErrors({});
    setErrorMessage('');
  };

  // Calendar functions
  const handleDateSelect = (date) => {
    // Format date as YYYY-MM-DD without timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    if (showTermStartCalendar) {
      setNewTerm({ ...newTerm, start_date: formattedDate });
      setShowTermStartCalendar(false);
    } else if (showTermEndCalendar) {
      setNewTerm({ ...newTerm, end_date: formattedDate });
      setShowTermEndCalendar(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const clearDate = (field) => {
    if (field === 'start') {
      setNewTerm({ ...newTerm, start_date: '' });
    } else {
      setNewTerm({ ...newTerm, end_date: '' });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading school configuration...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          html, body {
            overflow: hidden !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        `}
      </style>
      <div className={`absolute top-20 bottom-0 bg-white overflow-hidden transition-all duration-500 ease-in-out ${
          sidebarExpanded ? 'left-64 right-0' : 'left-20 right-0'
        }`}>
        <div className="w-full pr-2 pl-2 transition-all duration-500 ease-in-out">

          {/* Tabs */}
          <div className="absolute top-0 right-0 z-40 bg-white transition-all duration-500 ease-in-out left-0 shadow-sm">
            <div className="w-full border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('departments')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'departments'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Building className="h-5 w-5" />
                    <span>Departments</span>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('terms')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'terms'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="h-5 w-5" />
                    <span>School Terms</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="pt-20 pb-6 transition-all duration-500 ease-in-out" style={{ height: 'calc(100vh - 80px)' }}>
            {activeTab === 'departments' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 px-8 h-full">
                {/* List Container - Left Side */}
                <div className="lg:col-span-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 h-full">
                  {/* Departments Table */}
                  {departments.length > 0 ? (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300">
                      <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Department Name
                              </th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Abbreviation
                              </th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {departments.map((dept) => (
                              <tr key={dept.department_id} className="hover:bg-gray-50">
                                <td className="px-8 py-6">
                                  <div className="text-sm font-medium text-gray-900 break-words">{dept.name}</div>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="text-sm font-medium text-gray-900">{dept.department_abbreviation}</div>
                                </td>
                                <td className="px-8 py-6 text-sm font-medium">
                                  <div className="flex space-x-3">
                                    <button
                                      onClick={() => handleEditDepartment(dept)}
                                      className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-gray-100"
                                    >
                                      <Edit className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDepartment(dept.department_id)}
                                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-gray-100"
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center py-8">
                        <Building className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No departments yet</h3>
                        <p className="text-gray-500">Get started by adding your first department to the system.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Add Functions Container - Right Side */}
                <div className="lg:col-span-1">
                  {/* Add/Edit Department Form */}
                  <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4 border border-gray-300">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 text-left">
                      {editingDepartment ? 'Edit Department' : 'Add New Department'}
                    </h4>
                    
                                            <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Department Name *
                            </label>
                            <input
                              type="text"
                              value={newDepartment.name}
                              onChange={(e) => {
                                setNewDepartment({ ...newDepartment, name: e.target.value });
                                if (departmentErrors.name) {
                                  setDepartmentErrors({ ...departmentErrors, name: '' });
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                                departmentErrors.name ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="Enter department name"
                            />
                            {departmentErrors.name && (
                              <p className="mt-1 text-sm text-red-600">{departmentErrors.name}</p>
                            )}
                          </div>
                           
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Abbreviation *
                            </label>
                            <input
                              type="text"
                              value={newDepartment.department_abbreviation}
                              onChange={(e) => {
                                setNewDepartment({ ...newDepartment, department_abbreviation: e.target.value });
                                if (departmentErrors.abbreviation) {
                                  setDepartmentErrors({ ...departmentErrors, abbreviation: '' });
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                                departmentErrors.abbreviation ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="Enter abbreviation"
                              maxLength="10"
                            />
                            {departmentErrors.abbreviation && (
                              <p className="mt-1 text-sm text-red-600">{departmentErrors.abbreviation}</p>
                            )}
                          </div>
                        </div>
                    
                    <div className="flex space-x-3 mt-4">
                      <button
                        onClick={cancelEdit}
                        disabled={isAddingDepartment || isUpdatingDepartment}
                        className="flex-1 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={editingDepartment ? handleUpdateDepartment : handleAddDepartment}
                        disabled={isAddingDepartment || isUpdatingDepartment}
                        className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isAddingDepartment || isUpdatingDepartment ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {editingDepartment ? 'Updating...' : 'Adding...'}
                          </>
                        ) : (
                          editingDepartment ? 'Update' : 'Add'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'terms' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 px-8 h-full">
                {/* List Container - Left Side */}
                <div className="lg:col-span-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 h-full">
                  <div className="bg-white rounded-lg shadow-sm h-full border border-gray-300">
                    {/* School Terms Table */}
                    {schoolTerms.length > 0 ? (
                      <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                School Year
                              </th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Semester
                              </th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Start Date
                              </th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                End Date
                              </th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Active
                              </th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {schoolTerms.map((term) => (
                              <tr key={term.term_id} className="hover:bg-gray-50">
                                <td className="px-8 py-6">
                                  <div className="text-sm font-medium text-gray-900">{term.school_year}</div>
                                </td>
                                <td className="px-8 py-6 text-sm text-gray-900">
                                  {term.semester}
                                </td>
                                <td className="px-8 py-6 text-sm text-gray-900">
                                  {new Date(term.start_date).toLocaleDateString()}
                                </td>
                                <td className="px-8 py-6 text-sm text-gray-900">
                                  {new Date(term.end_date).toLocaleDateString()}
                                </td>
                                <td className="px-8 py-6">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      term.is_active
                                        ? 'bg-gray-100 text-gray-800'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {term.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-8 py-6 text-sm font-medium">
                                  <div className="flex space-x-3">
                                    <button
                                      onClick={() => handleEditTerm(term)}
                                      className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-gray-100"
                                    >
                                      <Edit className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() => handleToggleTermStatus(term.term_id)}
                                      className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100"
                                    >
                                      {term.is_active ? <EyeOff className="h-5 w-4" /> : <Eye className="h-5 w-4" />}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTerm(term.term_id)}
                                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-gray-100"
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center py-8">
                          <GraduationCap className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No school terms yet</h3>
                          <p className="text-gray-500">Get started by adding your first school term to the system.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Functions Container - Right Side */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg shadow-sm h-full border border-gray-300">
                                          {/* Add/Edit Term Form */}
                      <div className="p-4 sticky top-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 text-left">
                        {editingTerm ? 'Edit School Term' : 'Add New School Term'}
                      </h4>
                  
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            School Year *
                          </label>
                          <input
                            type="text"
                            value={newTerm.school_year}
                            onChange={(e) => {
                              setNewTerm({ ...newTerm, school_year: e.target.value });
                              if (termErrors.schoolYear) {
                                setTermErrors({ ...termErrors, schoolYear: '' });
                              }
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                              termErrors.schoolYear ? 'border-red-300' : 'border-gray-300'
                            }`}
                            placeholder="e.g., 2024-2025"
                          />
                          {termErrors.schoolYear && (
                            <p className="mt-1 text-sm text-red-600">{termErrors.schoolYear}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Semester *
                          </label>
                          <select
                            value={newTerm.semester}
                            onChange={(e) => {
                              setNewTerm({ ...newTerm, semester: e.target.value });
                              if (termErrors.semester) {
                                setTermErrors({ ...termErrors, semester: '' });
                              }
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                              termErrors.semester ? 'border-red-300' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Select semester</option>
                            <option value="1st">1st Semester</option>
                            <option value="2nd">2nd Semester</option>
                            <option value="Summer">Summer</option>
                          </select>
                          {termErrors.semester && (
                            <p className="mt-1 text-sm text-red-600">{termErrors.semester}</p>
                          )}
                        </div>
                        
                        <div className="relative">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Term Start *
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={newTerm.start_date}
                              onChange={(e) => setNewTerm({ ...newTerm, start_date: e.target.value })}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 pr-10 ${
                                termErrors.startDate ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="Select start date"
                              readOnly
                            />
                            <button
                              type="button"
                              onClick={() => setShowTermStartCalendar(!showTermStartCalendar)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              <Calendar className="h-5 w-5 text-gray-400" />
                            </button>
                            {newTerm.start_date && (
                              <button
                                type="button"
                                onClick={() => clearDate('start')}
                                className="absolute inset-y-0 right-8 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                              >
                                ×
                              </button>
                            )}
                          </div>
                          {termErrors.startDate && (
                            <p className="mt-1 text-sm text-red-600">{termErrors.startDate}</p>
                          )}
                        </div>
                        
                        <div className="relative">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Term End *
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={newTerm.end_date}
                              onChange={(e) => setNewTerm({ ...newTerm, end_date: e.target.value })}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 pr-10 ${
                                termErrors.endDate ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="Select end date"
                              readOnly
                            />
                            <button
                              type="button"
                              onClick={() => setShowTermEndCalendar(!showTermEndCalendar)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              <Calendar className="h-5 w-5 text-gray-500" />
                            </button>
                            {newTerm.end_date && (
                              <button
                                type="button"
                                onClick={() => clearDate('end')}
                                className="absolute inset-y-0 right-8 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                              >
                                ×
                              </button>
                            )}
                          </div>
                          {termErrors.endDate && (
                            <p className="mt-1 text-sm text-red-600">{termErrors.endDate}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Active Status
                          </label>
                          <select
                            value={newTerm.is_active ? 'true' : 'false'}
                            onChange={(e) => setNewTerm({ ...newTerm, is_active: e.target.value === 'true' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="false">Inactive</option>
                            <option value="true">Active</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex space-x-3 mt-4">
                        <button
                          onClick={cancelEdit}
                          disabled={isAddingTerm || isUpdatingTerm}
                          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={editingTerm ? handleUpdateTerm : handleAddTerm}
                          disabled={isAddingTerm || isUpdatingTerm}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {isAddingTerm || isUpdatingTerm ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              {editingTerm ? 'Updating...' : 'Adding...'}
                            </>
                          ) : (
                            `${editingTerm ? 'Update' : 'Add'} Term`
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Custom Calendar Component */}
          {(showTermStartCalendar || showTermEndCalendar) && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={goToPreviousMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <h2 className="text-lg font-semibold text-gray-900">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  
                  <button
                    onClick={goToNextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                    const daysInMonth = lastDay.getDate();
                    const firstDayOfWeek = firstDay.getDay();
                    
                    // Create array of all dates to display (including empty cells for padding)
                    const dates = [];
                    
                    // Add empty cells for days before the first day of the month
                    for (let i = 0; i < firstDayOfWeek; i++) {
                      dates.push(<div key={`empty-${i}`} className="p-2"></div>);
                    }
                    
                    // Add all days of the month
                    for (let i = 1; i <= daysInMonth; i++) {
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
                      const isToday = date.toDateString() === new Date().toDateString();
                      const isSelected = (showTermStartCalendar && newTerm.start_date === date.toISOString().split('T')[0]) ||
                        (showTermEndCalendar && newTerm.end_date === date.toISOString().split('T')[0]);
                      
                      dates.push(
                        <button
                          key={i}
                          onClick={() => handleDateSelect(date)}
                          className={`p-2 text-sm rounded-lg hover:bg-gray-100 ${
                            isToday ? 'bg-gray-100 text-gray-600 font-semibold' : ''
                          } ${
                            isSelected ? 'bg-primary-100 text-primary-600 font-semibold' : ''
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    
                    return dates;
                  })()}
                </div>
                
                <div className="flex justify-between mt-4">
                  <button
                    onClick={goToToday}
                    className="px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
                  >
                    Today
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowTermStartCalendar(false);
                      setShowTermEndCalendar(false);
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Close
                  </button>
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

          {/* Error Modal */}
          {showErrorModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
                  <p className="text-sm text-gray-500 mb-6">{errorMessage}</p>
                  <button
                    onClick={() => {
                      setShowErrorModal(false);
                      setErrorMessage('');
                    }}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SchoolConfiguration;
