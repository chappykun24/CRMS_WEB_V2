import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Calendar, Building, GraduationCap } from 'lucide-react';
import { departmentService, schoolTermService } from '../../services/schoolConfigService';

const SchoolConfiguration = () => {
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
  const [newDepartment, setNewDepartment] = useState({ name: '', department_abbreviation: '', status: 'active' });
  const [newTerm, setNewTerm] = useState({ name: '', term_start: '', term_end: '', status: 'active' });
  
  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
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

  // Department Management
  const handleAddDepartment = async () => {
    try {
      if (!newDepartment.name || !newDepartment.department_abbreviation) {
        setErrorMessage('Name and abbreviation are required');
        return;
      }

      const createdDept = await departmentService.create(newDepartment);
      setDepartments([...departments, createdDept]);
      setNewDepartment({ name: '', department_abbreviation: '', status: 'active' });
      setShowAddDepartment(false);
      setSuccessMessage('Department added successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleEditDepartment = (dept) => {
    setEditingDepartment(dept);
    setNewDepartment({ ...dept });
    setShowAddDepartment(true);
  };

  const handleUpdateDepartment = async () => {
    try {
      if (!newDepartment.name || !newDepartment.department_abbreviation) {
        setErrorMessage('Name and abbreviation are required');
        return;
      }

      const updatedDept = await departmentService.update(editingDepartment.department_id, newDepartment);
      setDepartments(departments.map(dept => 
        dept.department_id === editingDepartment.department_id ? updatedDept : dept
      ));
      setNewDepartment({ name: '', department_abbreviation: '', status: 'active' });
      setEditingDepartment(null);
      setShowAddDepartment(false);
      setSuccessMessage('Department updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await departmentService.delete(id);
        setDepartments(departments.filter(dept => dept.department_id !== id));
        setSuccessMessage('Department deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (error) {
        setErrorMessage(error.message);
        setTimeout(() => setErrorMessage(''), 5000);
      }
    }
  };

  const handleToggleDepartmentStatus = async (id) => {
    try {
      const updatedDept = await departmentService.toggleStatus(id);
      setDepartments(departments.map(dept => 
        dept.department_id === id ? updatedDept : dept
      ));
      setSuccessMessage('Department status updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  // School Term Management
  const handleAddTerm = async () => {
    try {
      if (!newTerm.name || !newTerm.term_start || !newTerm.term_end) {
        setErrorMessage('Name, start date, and end date are required');
        return;
      }

      const createdTerm = await schoolTermService.create(newTerm);
      setSchoolTerms([...schoolTerms, createdTerm]);
      setNewTerm({ name: '', term_start: '', term_end: '', status: 'active' });
      setShowAddTerm(false);
      setSuccessMessage('School term added successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleEditTerm = (term) => {
    setEditingTerm(term);
    setNewTerm({ ...term });
    setShowAddTerm(true);
  };

  const handleUpdateTerm = async () => {
    try {
      if (!newTerm.name || !newTerm.term_start || !newTerm.term_end) {
        setErrorMessage('Name, start date, and end date are required');
        return;
      }

      const updatedTerm = await schoolTermService.update(editingTerm.term_id, newTerm);
      setSchoolTerms(schoolTerms.map(term => 
        term.term_id === editingTerm.term_id ? updatedTerm : term
      ));
      setNewTerm({ name: '', term_start: '', term_end: '', status: 'active' });
      setEditingTerm(null);
      setShowAddTerm(false);
      setSuccessMessage('School term updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleDeleteTerm = async (id) => {
    if (window.confirm('Are you sure you want to delete this school term?')) {
      try {
        await schoolTermService.delete(id);
        setSchoolTerms(schoolTerms.filter(term => term.term_id !== id));
        setSuccessMessage('School term deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
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
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const cancelEdit = () => {
    setEditingDepartment(null);
    setEditingTerm(null);
    setNewDepartment({ name: '', department_abbreviation: '', status: 'active' });
    setNewTerm({ name: '', term_start: '', term_end: '', status: 'active' });
    setShowAddDepartment(false);
    setShowAddTerm(false);
  };

  // Calendar functions
  const handleDateSelect = (date) => {
    const formattedDate = date.toISOString().split('T')[0];
    if (showTermStartCalendar) {
      setNewTerm({ ...newTerm, term_start: formattedDate });
      setShowTermStartCalendar(false);
    } else if (showTermEndCalendar) {
      setNewTerm({ ...newTerm, term_end: formattedDate });
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
      setNewTerm({ ...newTerm, term_start: '' });
    } else {
      setNewTerm({ ...newTerm, term_end: '' });
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
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}
        
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
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
        {activeTab === 'departments' && (
          <div>
            {/* Departments Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <Building className="h-8 w-8 text-primary-600" />
                <h2 className="text-2xl font-bold text-gray-900">Departments</h2>
              </div>
              
              <button
                onClick={() => setShowAddDepartment(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Add Department</span>
              </button>
            </div>

            {/* Add/Edit Department Form */}
            {showAddDepartment && (
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingDepartment ? 'Edit Department' : 'Add New Department'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      value={newDepartment.name}
                      onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter department name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Abbreviation *
                    </label>
                    <input
                      type="text"
                      value={newDepartment.department_abbreviation}
                      onChange={(e) => setNewDepartment({ ...newDepartment, department_abbreviation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter abbreviation"
                      maxLength="10"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={newDepartment.status}
                      onChange={(e) => setNewDepartment({ ...newDepartment, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingDepartment ? handleUpdateDepartment : handleAddDepartment}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {editingDepartment ? 'Update' : 'Add'} Department
                  </button>
                </div>
              </div>
            )}

            {/* Departments Table */}
            {departments.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-y-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Abbreviation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {departments.map((dept) => (
                        <tr key={dept.department_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{dept.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{dept.department_abbreviation}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                dept.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {dept.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(dept.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditDepartment(dept)}
                                className="text-primary-600 hover:text-primary-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleToggleDepartmentStatus(dept.department_id)}
                                className={`${
                                  dept.status === 'active' ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                                }`}
                              >
                                {dept.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => handleDeleteDepartment(dept.department_id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
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
              <div className="text-center py-12">
                <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No departments yet</h3>
                <p className="text-gray-500 mb-6">Get started by adding your first department to the system.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'terms' && (
          <div>
            {/* School Terms Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <GraduationCap className="h-8 w-8 text-primary-600" />
                <h2 className="text-2xl font-bold text-gray-900">School Terms</h2>
              </div>
              
              <button
                onClick={() => setShowAddTerm(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Add Term</span>
              </button>
            </div>

            {/* Add/Edit Term Form */}
            {showAddTerm && (
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingTerm ? 'Edit School Term' : 'Add New School Term'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Term Name *
                    </label>
                    <input
                      type="text"
                      value={newTerm.name}
                      onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter term name"
                    />
                  </div>
                  
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Term Start *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newTerm.term_start}
                        onChange={(e) => setNewTerm({ ...newTerm, term_start: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 pr-10"
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
                      {newTerm.term_start && (
                        <button
                          type="button"
                          onClick={() => clearDate('start')}
                          className="absolute inset-y-0 right-8 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Term End *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newTerm.term_end}
                        onChange={(e) => setNewTerm({ ...newTerm, term_end: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 pr-10"
                        placeholder="Select end date"
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={() => setShowTermEndCalendar(!showTermEndCalendar)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <Calendar className="h-5 w-5 text-gray-400" />
                      </button>
                      {newTerm.term_end && (
                        <button
                          type="button"
                          onClick={() => clearDate('end')}
                          className="absolute inset-y-0 right-8 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={newTerm.status}
                      onChange={(e) => setNewTerm({ ...newTerm, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingTerm ? handleUpdateTerm : handleAddTerm}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {editingTerm ? 'Update' : 'Add'} Term
                  </button>
                </div>
              </div>
            )}

            {/* School Terms Table */}
            {schoolTerms.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-y-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Term Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          End Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {schoolTerms.map((term) => (
                        <tr key={term.term_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{term.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(term.term_start).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(term.term_end).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                term.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {term.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(term.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditTerm(term)}
                                className="text-primary-600 hover:text-primary-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleToggleTermStatus(term.term_id)}
                                className={`${
                                  term.status === 'active' ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                                }`}
                              >
                                {term.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => handleDeleteTerm(term.term_id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
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
              <div className="text-center py-12">
                <GraduationCap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No school terms yet</h3>
                <p className="text-gray-500 mb-6">Get started by adding your first school term to the system.</p>
              </div>
            )}
          </div>
        )}

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
                {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate() }, (_, i) => {
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isSelected = (showTermStartCalendar && newTerm.term_start === date.toISOString().split('T')[0]) ||
                                   (showTermEndCalendar && newTerm.term_end === date.toISOString().split('T')[0]);
                  
                  return (
                    <button
                      key={i}
                      onClick={() => handleDateSelect(date)}
                      className={`p-2 text-sm rounded-lg hover:bg-gray-100 ${
                        isToday ? 'bg-blue-100 text-blue-600 font-semibold' : ''
                      } ${
                        isSelected ? 'bg-primary-100 text-primary-600 font-semibold' : ''
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
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
      </div>
    </div>
  );
};

export default SchoolConfiguration;
