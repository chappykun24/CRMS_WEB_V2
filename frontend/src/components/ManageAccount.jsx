import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/UnifiedAuthContext';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  CameraIcon
} from '@heroicons/react/24/solid';

const ManageAccount = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });

  // Password change states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null); // This will store base64 data
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Modal states for consistent notifications
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize form data with user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  // Ensure form data is always defined to prevent controlled/uncontrolled input warnings
  const safeFormData = {
    name: formData.name || '',
    email: formData.email || ''
  };

  // Check if there are any changes to enable/disable the update button
  const hasChanges = () => {
    if (!user) return false;
    return formData.name !== user.name || formData.email !== user.email;
  };



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Please select a valid image file' });
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size must be less than 5MB. Large images will be converted to base64 and may exceed database limits.' });
        return;
      }

      // Create preview and convert to base64
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const base64Data = e.target.result;
        setPhotoPreview(base64Data);
        setPhotoFile(base64Data);
      };
      
      reader.onerror = (error) => {
        console.error('Photo selection error:', error);
        setMessage({ type: 'error', text: 'Failed to read file. Please try again.' });
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !user?.id) return;

    console.log('📸 [PHOTO UPLOAD] Starting upload for user:', user.id);
    console.log('📸 [PHOTO UPLOAD] Photo file data length:', photoFile?.length);

    setIsUploading(true);

    try {
      const response = await fetch(`/api/users/${user.id}/upload-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoData: photoFile
        }),
      });

      console.log('📸 [PHOTO UPLOAD] Response status:', response.status);
      const data = await response.json();
      console.log('📸 [PHOTO UPLOAD] Response data:', data);

      if (data.success) {
        // Update user context with new photo
        if (updateUser) {
          updateUser({ ...user, profilePic: data.user.profilePic });
        }
        
        setSuccessMessage('Profile photo updated successfully!');
        setShowSuccessModal(true);
        setPhotoFile(null);
        setPhotoPreview(null);
        
        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const errorMsg = data.error === 'User not found' 
          ? 'User not found. Please try logging in again.' 
          : data.error || 'Failed to upload photo';
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      setErrorMessage('Failed to upload photo. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setIsLoading(true);

    try {
      // Create payload that ensures email doesn't change if not modified
      const payload = {
        name: formData.name,
        email: formData.email,
        profilePic: user.profilePic // Include current profile picture
      };
      
      console.log('📤 [FRONTEND] Sending payload:', payload);
      console.log('📤 [FRONTEND] User ID:', user.id);
      
      const response = await fetch(`/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📤 [FRONTEND] Response status:', response.status);
      const data = await response.json();
      console.log('📤 [FRONTEND] Response data:', data);

      if (data.success) {
        // Update user context
        if (updateUser) {
          updateUser({ ...user, ...formData });
        }
        
        setSuccessMessage('Profile updated successfully!');
        setShowSuccessModal(true);
      } else {
        const errorMsg = data.error === 'User not found' 
          ? 'User not found. Please try logging in again.' 
          : data.error || 'Failed to update profile';
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setErrorMessage('Failed to update profile. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('New passwords do not match');
      setShowErrorModal(true);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long');
      setShowErrorModal(true);
      return;
    }

    setIsChangingPassword(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`/api/users/${user.id}/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccessMessage('Password changed successfully!');
        setShowSuccessModal(true);
        // Clear password form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordForm(false);
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to change password');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Password change error:', error);
      setErrorMessage('An error occurred while changing password');
      setShowErrorModal(true);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (!user.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Unable to load user information</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-primary-600 hover:text-primary-700 underline"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">


        {/* Main Content */}
        <div className="space-y-6">
          {/* Profile Photo Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Profile Photo</h3>
              <div className="flex items-center space-x-4">
                {/* Profile Photo */}
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0 relative">
                  {photoPreview ? (
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : user.profilePic ? (
                    <img 
                      src={user.profilePic} 
                      alt={user.name || 'User'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary-600 flex items-center justify-center">
                      <UserIcon className="h-10 w-10 text-white" />
                    </div>
                  )}
                </div>
                
                {/* Photo Upload */}
                <div className="flex-1">
                  {!photoPreview ? (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <CameraIcon className="w-4 h-4 mr-2" />
                      Change Photo
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handlePhotoUpload}
                        disabled={isUploading}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isUploading ? 'Uploading...' : 'Upload Photo'}
                      </button>
                      <button
                        onClick={() => {
                          setPhotoPreview(null);
                          setPhotoFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="inline-flex items-center px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WebP • Max 5MB</p>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Profile Information</h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name and Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={safeFormData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={safeFormData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex flex-col items-end pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={isLoading || !hasChanges()}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={() => console.log('🔘 [BUTTON] Button clicked, hasChanges():', hasChanges())}
                  >
                    {isLoading ? 'Updating...' : 'Update Profile'}
                  </button>
                  {!hasChanges() && (
                    <p className="text-xs text-gray-500">No changes to save</p>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Password Change Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">Change Password</h3>
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="inline-flex items-center px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
              >
                {showPasswordForm ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {showPasswordForm && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

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
  );
};

export default ManageAccount;
