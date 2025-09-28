'use client'

import { useState } from 'react'

interface UploadToggleProps {
  uploadId: string
  currentStatus: string
}

export default function UploadToggle({ uploadId, currentStatus }: UploadToggleProps) {
  const [status, setStatus] = useState(currentStatus)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async () => {
    if (isLoading) return

    setIsLoading(true)
    const newStatus = status === 'published' ? 'pending' : 'published'

    try {
      const response = await fetch(`/api/uploads/${uploadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        setStatus(newStatus)
      } else {
        console.error('Failed to update upload status')
      }
    } catch (error) {
      console.error('Error updating upload status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const isPublished = status === 'published'
  const canToggle = status !== 'processing'

  return (
    <button
      onClick={handleToggle}
      disabled={!canToggle || isLoading}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        isPublished
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
      } ${
        !canToggle || isLoading
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer'
      }`}
    >
      {isLoading ? (
        <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-1" />
      ) : (
        <div className={`w-2 h-2 rounded-full mr-1 ${
          isPublished ? 'bg-green-500' : 'bg-gray-400'
        }`} />
      )}
      {isPublished ? 'Published' : 'Pending'}
    </button>
  )
}
