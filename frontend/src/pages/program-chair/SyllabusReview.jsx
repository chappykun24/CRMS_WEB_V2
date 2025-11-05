import React from 'react'
import { DocumentTextIcon } from '@heroicons/react/24/solid'

const SyllabusReview = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Syllabus Review</h1>
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="flex justify-center mb-6">
            <DocumentTextIcon className="h-20 w-20 text-gray-300" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Feature Coming Soon</h2>
          <p className="text-gray-500 text-base max-w-md mx-auto">
            The syllabus review feature is currently under development and will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SyllabusReview
