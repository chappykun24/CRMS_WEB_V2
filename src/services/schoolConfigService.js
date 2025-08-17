const API_BASE_URL = 'http://localhost:3001/api';

// Department API calls
export const departmentService = {
  // Get all departments
  async getAll() {
    try {
      const response = await fetch(`${API_BASE_URL}/departments`);
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  },

  // Get single department
  async getById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/departments/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch department');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching department:', error);
      throw error;
    }
  },

  // Create new department
  async create(departmentData) {
    try {
      const response = await fetch(`${API_BASE_URL}/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(departmentData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create department');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  },

  // Update department
  async update(id, departmentData) {
    try {
      const response = await fetch(`${API_BASE_URL}/departments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(departmentData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update department');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating department:', error);
      throw error;
    }
  },

  // Delete department
  async delete(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/departments/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete department');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting department:', error);
      throw error;
    }
  },

  // Toggle department status
  async toggleStatus(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/departments/${id}/toggle-status`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle department status');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error toggling department status:', error);
      throw error;
    }
  },
};

// School Terms API calls
export const schoolTermService = {
  // Get all school terms
  async getAll() {
    try {
      const response = await fetch(`${API_BASE_URL}/school-terms`);
      if (!response.ok) {
        throw new Error('Failed to fetch school terms');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching school terms:', error);
      throw error;
    }
  },

  // Get single school term
  async getById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/school-terms/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch school term');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching school term:', error);
      throw error;
      throw error;
    }
  },

  // Create new school term
  async create(termData) {
    try {
      const response = await fetch(`${API_BASE_URL}/school-terms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(termData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create school term');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating school term:', error);
      throw error;
    }
  },

  // Update school term
  async update(id, termData) {
    try {
      const response = await fetch(`${API_BASE_URL}/school-terms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(termData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update school term');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating school term:', error);
      throw error;
    }
  },

  // Delete school term
  async delete(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/school-terms/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete school term');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting school term:', error);
      throw error;
    }
  },

  // Toggle school term status
  async toggleStatus(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/school-terms/${id}/toggle-status`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle school term status');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error toggling school term status:', error);
      throw error;
    }
  },
};
