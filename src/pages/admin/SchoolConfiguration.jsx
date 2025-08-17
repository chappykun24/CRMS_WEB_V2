import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Building, Calendar, Save, X, Check } from 'lucide-react';

const SchoolConfiguration = () => {
  const [activeTab, setActiveTab] = useState(() => {
    // Get the active tab from localStorage or default to departments
    return localStorage.getItem('schoolConfigActiveTab') || 'departments'
  });
  
  // Start with empty data arrays
  const [departments, setDepartments] = useState([]);
  const [schoolTerms, setSchoolTerms] = useState([]);

  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [showAddTerm, setShowAddTerm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [editingTerm, setEditingTerm] = useState(null);

  const [newDepartment, setNewDepartment] = useState({ name: '', abbreviation: '' });
  const [newTerm, setNewTerm] = useState({ name: '', startDate: '', endDate: '' });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Update localStorage when activeTab changes
  useEffect(() => {
    localStorage.setItem('schoolConfigActiveTab', activeTab)
    
    // Dispatch custom event to notify Header component
    const event = new CustomEvent('schoolConfigTabChanged', { 
      detail: { activeTab } 
    })
    window.dispatchEvent(event)
  }, [activeTab])

  // Department Management
  const handleAddDepartment = () => {
    if (!newDepartment.name.trim() || !newDepartment.abbreviation.trim()) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    // Check if abbreviation already exists
    const abbreviationExists = departments.some(
      dept => dept.abbreviation.toLowerCase() === newDepartment.abbreviation.trim().toLowerCase()
    );
    
    if (abbreviationExists) {
      setErrorMessage('Department abbreviation already exists');
      return;
    }

    const department = {
      id: Date.now(),
      name: newDepartment.name.trim(),
      abbreviation: newDepartment.abbreviation.trim().toUpperCase(),
      status: 'active',
      createdAt: new Date().toISOString()
    };

    setDepartments([...departments, department]);
    setNewDepartment({ name: '', abbreviation: '' });
    setShowAddDepartment(false);
    setSuccessMessage('Department added successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleEditDepartment = (department) => {
    setEditingDepartment(department);
    setNewDepartment({ name: department.name, abbreviation: department.abbreviation });
    setShowAddDepartment(true);
  };

  const handleUpdateDepartment = () => {
    if (!newDepartment.name.trim() || !newDepartment.abbreviation.trim()) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    // Check if abbreviation already exists (excluding current department being edited)
    const abbreviationExists = departments.some(
      dept => dept.id !== editingDepartment.id && 
      dept.abbreviation.toLowerCase() === newDepartment.abbreviation.trim().toLowerCase()
    );
    
    if (abbreviationExists) {
      setErrorMessage('Department abbreviation already exists');
      return;
    }

    const updatedDepartments = departments.map(dept =>
      dept.id === editingDepartment.id
        ? { 
            ...dept, 
            name: newDepartment.name.trim(), 
            abbreviation: newDepartment.abbreviation.trim().toUpperCase(),
            updatedAt: new Date().toISOString()
          }
        : dept
    );

    setDepartments(updatedDepartments);
    setEditingDepartment(null);
    setNewDepartment({ name: '', abbreviation: '' });
    setShowAddDepartment(false);
    setSuccessMessage('Department updated successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteDepartment = (id) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      setDepartments(departments.filter(dept => dept.id !== id));
      setSuccessMessage('Department deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleToggleDepartmentStatus = (id) => {
    setDepartments(departments.map(dept =>
      dept.id === id
        ? { ...dept, status: dept.status === 'active' ? 'inactive' : 'active' }
        : dept
    ));
  };

  // School Term Management
  const handleAddTerm = () => {
    if (!newTerm.name.trim() || !newTerm.startDate || !newTerm.endDate) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    if (new Date(newTerm.startDate) >= new Date(newTerm.endDate)) {
      setErrorMessage('End date must be after start date');
      return;
    }

    // Check if term name already exists
    const termNameExists = schoolTerms.some(
      term => term.name.toLowerCase() === newTerm.name.trim().toLowerCase()
    );
    
    if (termNameExists) {
      setErrorMessage('School term name already exists');
      return;
    }

    const term = {
      id: Date.now(),
      name: newTerm.name.trim(),
      startDate: newTerm.startDate,
      endDate: newTerm.endDate,
      status: 'inactive',
      createdAt: new Date().toISOString()
    };

    setSchoolTerms([...schoolTerms, term]);
    setNewTerm({ name: '', startDate: '', endDate: '' });
    setShowAddTerm(false);
    setSuccessMessage('School term added successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleEditTerm = (term) => {
    setEditingTerm(term);
    setNewTerm({ name: term.name, startDate: term.startDate, endDate: term.endDate });
    setShowAddTerm(true);
  };

  const handleUpdateTerm = () => {
    if (!newTerm.name.trim() || !newTerm.startDate || !newTerm.endDate) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    if (new Date(newTerm.startDate) >= new Date(newTerm.endDate)) {
      setErrorMessage('End date must be after start date');
      return;
    }

    // Check if term name already exists (excluding current term being edited)
    const termNameExists = schoolTerms.some(
      term => term.id !== editingTerm.id && 
      term.name.toLowerCase() === newTerm.name.trim().toLowerCase()
    );
    
    if (termNameExists) {
      setErrorMessage('School term name already exists');
      return;
    }

    const updatedTerms = schoolTerms.map(term =>
      term.id === editingTerm.id
        ? { 
            ...term, 
            name: newTerm.name.trim(), 
            startDate: newTerm.startDate, 
            endDate: newTerm.endDate,
            updatedAt: new Date().toISOString()
          }
        : term
    );

    setSchoolTerms(updatedTerms);
    setEditingTerm(null);
    setNewTerm({ name: '', startDate: '', endDate: '' });
    setShowAddTerm(false);
    setSuccessMessage('School term updated successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteTerm = (id) => {
    if (window.confirm('Are you sure you want to delete this school term?')) {
      setSchoolTerms(schoolTerms.filter(term => term.id !== id));
      setSuccessMessage('School term deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleToggleTermStatus = (id) => {
    setSchoolTerms(schoolTerms.map(term =>
      term.id === id
        ? { ...term, status: term.status === 'active' ? 'inactive' : 'active' }
        : term
    ));
  };

  const cancelEdit = () => {
    setEditingDepartment(null);
    setEditingTerm(null);
    setNewDepartment({ name: '', abbreviation: '' });
    setNewTerm({ name: '', startDate: '', endDate: '' });
    setShowAddDepartment(false);
    setShowAddTerm(false);
    setErrorMessage('');
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center">
            <Check className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        )}
        
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
            <X className="h-5 w-5 mr-2" />
            {errorMessage}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('departments')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'departments'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Building className="inline h-4 w-4 mr-2" />
                Departments
              </button>
              <button
                onClick={() => setActiveTab('terms')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'terms'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="inline h-4 w-4 mr-2" />
                School Terms
              </button>
            </nav>
          </div>
        </div>

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Department Management</h2>
              <button
                onClick={() => setShowAddDepartment(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </button>
            </div>

            {/* Add/Edit Department Form */}
            {showAddDepartment && (
              <div className="mb-6 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingDepartment ? 'Edit Department' : 'Add New Department'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      value={newDepartment.name}
                      onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter department name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Abbreviation *
                    </label>
                    <input
                      type="text"
                      value={newDepartment.abbreviation}
                      onChange={(e) => setNewDepartment({ ...newDepartment, abbreviation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                      placeholder="e.g., CS, IT"
                      maxLength={10}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingDepartment ? handleUpdateDepartment : handleAddDepartment}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
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
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Abbreviation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {departments.map((department) => (
                        <tr key={department.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{department.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {department.abbreviation}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleDepartmentStatus(department.id)}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                department.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {department.status === 'active' ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditDepartment(department)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteDepartment(department.id)}
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
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <Building className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No departments yet</h3>
                <p className="text-gray-500 max-w-sm mx-auto">Start building your school structure by adding the first department. This will help organize your academic programs and faculty.</p>
              </div>
            )}
          </div>
        )}

        {/* School Terms Tab */}
        {activeTab === 'terms' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">School Term Management</h2>
              <button
                onClick={() => setShowAddTerm(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add School Term
              </button>
            </div>

            {/* Add/Edit Term Form */}
            {showAddTerm && (
              <div className="mb-6 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingTerm ? 'Edit School Term' : 'Add New School Term'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Term Name *
                    </label>
                    <input
                      type="text"
                      value={newTerm.name}
                      onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                      placeholder="e.g., First Semester AY 2024-2025"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={newTerm.startDate}
                      onChange={(e) => setNewTerm({ ...newTerm, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={newTerm.endDate}
                      onChange={(e) => setNewTerm({ ...newTerm, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingTerm ? handleUpdateTerm : handleAddTerm}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingTerm ? 'Update' : 'Add'} School Term
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
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {schoolTerms.map((term) => (
                        <tr key={term.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{term.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(term.startDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(term.endDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleTermStatus(term.id)}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                term.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {term.status === 'active' ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditTerm(term)}
                                className="text-indigo-600 hover:text-red-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTerm(term.id)}
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
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <Calendar className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No school terms yet</h3>
                <p className="text-gray-500 max-w-sm mx-auto">Define your academic calendar by adding school terms. This helps organize your academic year into manageable periods.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolConfiguration;
