import React from 'react'
import { CardGridSkeleton } from '../../components/skeletons'

const Syllabi = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Syllabi</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardGridSkeleton cards={6} />
        </div>
      </div>
    </div>
  )
}

export default Syllabi
