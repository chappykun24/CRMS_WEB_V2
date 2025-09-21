import React, { useState, useEffect, useMemo } from 'react';
import { PencilSquareIcon, TrashIcon, CalendarDaysIcon, BuildingOffice2Icon, AcademicCapIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { departmentService, schoolTermService } from '../../services/schoolConfigService';
import { useSidebar } from '../../contexts/SidebarContext';
import { TableSkeleton, SidebarSkeleton } from '../../components/skeletons';

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

  // Search & Filter states
  const [departmentQuery, setDepartmentQuery] = useState('');
  const [termQuery, setTermQuery] = useState('');
  const [termSemester, setTermSemester] = useState(''); // '', '1st', '2nd', 'Summer'
  const [termActive, setTermActive] = useState(''); // '', 'true', 'false'

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

  // Derived filtered lists
  const filteredDepartments = useMemo(() => {
    const q = departmentQuery.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((dept) =>
      (dept.name || '').toLowerCase().includes(q) ||
      (dept.department_abbreviation || '').toLowerCase().includes(q)
    );
  }, [departments, departmentQuery]);

  const filteredTerms = useMemo(() => {
    const q = termQuery.trim().toLowerCase();
    return schoolTerms.filter((term) => {
      const matchesQuery = !q ||
        (term.school_year || '').toLowerCase().includes(q) ||
        (term.semester || '').toLowerCase().includes(q);
      const matchesSemester = !termSemester || term.semester === termSemester;
      const matchesActive = !termActive || String(!!term.is_active) === (termActive === 'true' ? 'true' : 'false');
      return matchesQuery && matchesSemester && (termActive ? matchesActive : true);
    });
  }, [schoolTerms, termQuery, termSemester, termActive]);

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
      const response = await departmentService.create(newDepartment);
      // Extract the data from the response object
      const createdDept = response.data || response;
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
      const response = await departmentService.update(editingDepartment.department_id, newDepartment);
      // Extract the data from the response object
      const updatedDept = response.data || response;
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

  // Helper function to format date to YYYY-MM-DD
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return ''; // Check if date is valid
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  // Helper function to format semester for display
  const formatSemesterForDisplay = (semester) => {
    switch (semester) {
      case '1st':
        return '1st Semester';
      case '2nd':
        return '2nd Semester';
      case 'Summer':
        return 'Summer';
      default:
        return semester;
    }
  };

  const handleEditTerm = (term) => {
    setEditingTerm(term);
    // Format dates to show only date portion without time
    setNewTerm({ 
      ...term, 
      start_date: formatDateForDisplay(term.start_date),
      end_date: formatDateForDisplay(term.end_date)
    });
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
      <div className={`absolute top-16 bottom-0 bg-gray-50 rounded-tl-3xl overflow-hidden transition-all duration-500 ease-in-out ${
        sidebarExpanded ? 'left-64 right-0' : 'left-20 right-0'
      }`} style={{ marginTop: '0px' }}>
        <div className="w-full pr-2 pl-2 transition-all duration-500 ease-in-out rounded-tl-3xl" style={{ marginTop: '0px' }}>
          {/* Tabs Skeleton */}
          <div className="absolute top-0 right-0 z-40 bg-gray-50 transition-all duration-500 ease-in-out left-0 rounded-tl-3xl">
            <div className="px-8 bg-gray-50">
              <div className="flex space-x-8 bg-gray-50 border-b border-gray-200">
                <div className="h-12 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-12 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="pt-16 pb-6 transition-all duration-500 ease-in-out" style={{ height: 'calc(100vh - 80px)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 px-8 h-full">
              {/* List Container Skeleton */}
              <div className="lg:col-span-3 h-full">
                {/* Controls toolbar skeleton */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative flex-1">
                    <div className="w-full h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                  </div>
                  <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse"></div>
                </div>

                {/* Table Skeleton */}
                <TableSkeleton rows={8} columns={4} />
              </div>

              {/* Sidebar Skeleton */}
              <div className="lg:col-span-1">
                <SidebarSkeleton />
              </div>
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
          
          /* Remove box borders and focus outlines from tab buttons */
          .tab-button:focus {
            outline: none !important;
            box-shadow: none !important;
            border: none !important;
          }
          
          .tab-button:focus-visible {
            outline: none !important;
            box-shadow: none !important;
            border: none !important;
          }
          
          /* Ensure smooth underline transitions */
          .tab-button {
            transition: all 0.2s ease-in-out !important;
            border-bottom: 2px solid transparent !important;
          }
          
          /* Remove any red styling from search inputs */
          input[type="text"], input[type="search"], select {
            border-color: #d1d5db !important;
            outline: none !important;
            box-shadow: none !important;
          }
          
          input[type="text"]:focus, input[type="search"]:focus, select:focus {
            border-color: #ef4444 !important;
            outline: none !important;
            box-shadow: 0 0 0 1px #ef4444 !important;
          }
          
          /* Clean dropdown styling */
          select {
            appearance: none !important;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e") !important;
            background-position: right 8px center !important;
            background-repeat: no-repeat !important;
            background-size: 16px !important;
            padding-right: 40px !important;
            cursor: pointer !important;
          }
          
          select option {
            background-color: white !important;
            color: #374151 !important;
            padding: 12px 16px !important;
            border: none !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
          }
          
          select option:hover {
            background-color: #f3f4f6 !important;
          }
          
          select option:checked {
            background-color: #e5e7eb !important;
            color: #111827 !important;
            font-weight: 500 !important;
          }
        `}
      </style>
      <div className={`absolute top-16 bottom-0 bg-gray-50 rounded-tl-3xl overflow-hidden transition-all duration-500 ease-in-out ${
          sidebarExpanded ? 'left-64 right-0' : 'left-20 right-0'
        }`} style={{ marginTop: '0px' }}>
        <div className="w-full pr-2 pl-2 transition-all duration-500 ease-in-out rounded-tl-3xl" style={{ marginTop: '0px' }}>

          {/* Tabs */}
          <div className="absolute top-0 right-0 z-40 bg-gray-50 transition-all duration-500 ease-in-out left-0 rounded-tl-3xl">
            <div className="px-8 bg-gray-50">
              <nav className="flex space-x-8 bg-gray-50 border-b border-gray-200">
                                  <button
                    onClick={() => setActiveTab('departments')}
                    className={`tab-button py-4 px-4 font-medium text-sm ${
                      activeTab === 'departments' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Departments
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('terms')}
                    className={`tab-button py-4 px-4 font-medium text-sm ${
                      activeTab === 'terms' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    School Terms
                  </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="pt-16 pb-6 transition-all duration-500 ease-in-out" style={{ height: 'calc(100vh - 80px)' }}>
            {activeTab === 'departments' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 px-8 h-full">
                {/* List Container - Left Side */}
                <div className="lg:col-span-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 h-full">
                  {/* Controls toolbar */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative flex-1 z-50">
                      <input
                        type="text"
                        value={departmentQuery}
                        onChange={(e) => setDepartmentQuery(e.target.value)}
                        placeholder="Search departments or abbreviations"
                        className="w-full px-3 py-2 pl-9 border rounded-lg border-gray-300 bg-white focus:ring-1 focus:ring-red-500 focus:border-red-500"
                      />
                      <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                    </div>
                  </div>
                  {/* Departments Table */}
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300">
                    {filteredDepartments.length > 0 ? (
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
                            {filteredDepartments.map((dept) => (
                              <tr key={dept.department_id} className="hover:bg-gray-50">
                                <td className="px-8 py-3">
                                  <div className="text-sm font-medium text-gray-900 break-words">{dept.name}</div>
                                </td>
                                <td className="px-8 py-3">
                                  <div className="text-sm font-medium text-gray-900">{dept.department_abbreviation}</div>
                                </td>
                                <td className="px-8 py-3 text-sm font-medium">
                                  <div className="flex space-x-3">
                                    <button
                                      onClick={() => handleEditDepartment(dept)}
                                      className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-gray-100"
                                    >
                                      <PencilSquareIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDepartment(dept.department_id)}
                                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-gray-100"
                                    >
                                      <TrashIcon className="h-5 w-5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center py-12">
                        <div className="text-center">
                          <BuildingOffice2Icon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No departments found</h3>
                          <p className="text-gray-500">Try adjusting your search.</p>
                        </div>
                      </div>
                    )}
                  </div>
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
                              className={`w-full px-3 py-2 border rounded-lg border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500`}
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
                              className={`w-full px-3 py-2 border rounded-lg border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500`}
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
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
                  {/* Controls toolbar */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={termQuery}
                        onChange={(e) => setTermQuery(e.target.value)}
                        placeholder="Search school year or semester"
                        className="w-full px-3 py-2 pl-9 border rounded-lg border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-white"
                      />
                      <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                    </div>
                    <select
                      value={termSemester}
                      onChange={(e) => setTermSemester(e.target.value)}
                      className="px-3 py-2 border rounded-lg border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">All Semesters</option>
                      <option value="1st">1st Semester</option>
                      <option value="2nd">2nd Semester</option>
                      <option value="Summer">Summer</option>
                    </select>
                    <select
                      value={termActive}
                      onChange={(e) => setTermActive(e.target.value)}
                      className="px-3 py-2 border rounded-lg border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">All Status</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  {/* School Terms Table */}
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300">
                    {filteredTerms.length > 0 ? (
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
                                Status
                              </th>
                              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTerms.map((term) => (
                              <tr key={term.term_id} className="hover:bg-gray-50">
                                <td className="px-8 py-3">
                                  <div className="text-sm font-medium text-gray-900">{term.school_year}</div>
                                </td>
                                <td className="px-8 py-3">
                                  <div className="text-sm font-medium text-gray-900">{formatSemesterForDisplay(term.semester)}</div>
                                </td>
                                <td className="px-8 py-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {new Date(term.start_date).toLocaleDateString()}
                                  </div>
                                </td>
                                <td className="px-8 py-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {new Date(term.end_date).toLocaleDateString()}
                                  </div>
                                </td>
                                <td className="px-8 py-3">
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
                                <td className="px-8 py-3 text-sm font-medium">
                                  <div className="flex space-x-3">
                                    <button
                                      onClick={() => handleEditTerm(term)}
                                      className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-gray-100"
                                    >
                                      <PencilSquareIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTerm(term.term_id)}
                                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-gray-100"
                                    >
                                      <TrashIcon className="h-5 w-5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center py-12">
                        <div className="text-center">
                          <AcademicCapIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No terms found</h3>
                          <p className="text-gray-500">Adjust your search or filters.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Functions Container - Right Side */}
                <div className="lg:col-span-1">
                  {/* Add/Edit Term Form */}
                  <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4 border border-gray-300">
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
                          className={`w-full px-3 py-2 border rounded-lg border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500`}
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
                          className={`w-full px-3 py-2 border rounded-lg border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500`}
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
                            className={`w-full px-3 py-2 border rounded-lg border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500 pr-10`}
                            placeholder="Select start date"
                            readOnly
                          />
                          <button
                            type="button"
                            onClick={() => setShowTermStartCalendar(!showTermStartCalendar)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                          </button>
                          {newTerm.start_date && (
                            <button
                              type="button"
                              onClick={() => clearDate('start')}
                              className="absolute inset-y-0 right-8 pr-2 flex items-center text-gray-400 hover:text-red-600"
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
                            className={`w-full px-3 py-2 border rounded-lg border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500 pr-10`}
                            placeholder="Select end date"
                            readOnly
                          />
                          <button
                            type="button"
                            onClick={() => setShowTermEndCalendar(!showTermEndCalendar)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            <CalendarDaysIcon className="h-5 w-5 text-gray-500" />
                          </button>
                          {newTerm.end_date && (
                            <button
                              type="button"
                              onClick={() => clearDate('end')}
                              className="absolute inset-y-0 right-8 pr-2 flex items-center text-gray-400 hover:text-red-600"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500"
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
                        className="flex-1 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={editingTerm ? handleUpdateTerm : handleAddTerm}
                        disabled={isAddingTerm || isUpdatingTerm}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isAddingTerm || isUpdatingTerm ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {editingTerm ? 'Updating...' : 'Adding...'}
                          </>
                        ) : (
                          editingTerm ? 'Update' : 'Add'
                        )}
                      </button>
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
                      const isSelected = (showTermStartCalendar && newTerm.start_date === formatDateForDisplay(date)) ||
                        (showTermEndCalendar && newTerm.end_date === formatDateForDisplay(date));
                      
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
