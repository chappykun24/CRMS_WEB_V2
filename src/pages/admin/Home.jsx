import React from 'react'

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Home</h1>
        <p className="text-gray-500 text-lg">Welcome to the Admin Home</p>
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <p className="text-gray-600">You are currently in the <span className="font-semibold text-gray-800">Home</span> section</p>
        </div>
      </div>
    </div>
  )
}

export default Home 