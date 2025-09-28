'use client'

import { useState, useCallback } from 'react'

interface UploadProgress {
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  message: string
  uploadId?: string
}

export default function Uploader() {
  const [files, setFiles] = useState<File[]>([])
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('audio/')
    )
    
    setFiles(prev => [...prev, ...droppedFiles])
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).filter(file => 
      file.type.startsWith('audio/')
    )
    setFiles(prev => [...prev, ...selectedFiles])
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const uploadFile = async (file: File): Promise<UploadProgress> => {
    const uploadProgress: UploadProgress = {
      file,
      status: 'pending',
      progress: 0,
      message: 'Preparing upload...'
    }

    try {
      // Step 1: Initialize upload
      uploadProgress.status = 'uploading'
      uploadProgress.message = 'Initializing upload...'
      setUploads(prev => [...prev, uploadProgress])

      const initResponse = await fetch('/api/upload/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          filename: file.name
        })
      })

      if (!initResponse.ok) {
        throw new Error('Failed to initialize upload')
      }

      const { upload_id, url } = await initResponse.json()
      uploadProgress.uploadId = upload_id
      uploadProgress.message = 'Uploading file...'

      // Step 2: Upload file to signed URL
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        }
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      uploadProgress.progress = 50
      uploadProgress.message = 'Processing file...'

      // Step 3: Finalize upload
      const finalizeResponse = await fetch('/api/upload/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ upload_id })
      })

      if (!finalizeResponse.ok) {
        throw new Error('Failed to process file')
      }

      const result = await finalizeResponse.json()
      
      uploadProgress.status = 'completed'
      uploadProgress.progress = 100
      uploadProgress.message = `Upload complete! BPM: ${result.bpm}, Duration: ${result.duration}s`

      return uploadProgress

    } catch (error) {
      uploadProgress.status = 'error'
      uploadProgress.message = error instanceof Error ? error.message : 'Upload failed'
      return uploadProgress
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    setUploads([])

    // Upload files sequentially to avoid overwhelming the server
    for (const file of files) {
      const result = await uploadFile(file)
      setUploads(prev => {
        const index = prev.findIndex(u => u.file === file)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = result
          return updated
        }
        return [...prev, result]
      })
    }

    setIsUploading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload Beat</h1>
          <p className="mt-2 text-gray-600">
            Share your music with the world
          </p>
        </div>
        
        {/* Drag and Drop Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
            </svg>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-900">Upload your beat</h3>
            <p className="mt-2 text-sm text-gray-500">
              Drag and drop your audio file here, or click to browse
            </p>
          </div>
          <div className="mt-6">
            <input
              type="file"
              multiple
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
            >
              Choose Files
            </label>
          </div>
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Selected Files</h3>
            <div className="space-y-3">
              {files.map((file, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">♪</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-6">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md"
              >
                {isUploading ? 'Uploading...' : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploads.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Progress</h3>
            <div className="space-y-4">
              {uploads.map((upload, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">{upload.file.name}</p>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      upload.status === 'completed' ? 'bg-green-100 text-green-800' :
                      upload.status === 'error' ? 'bg-red-100 text-red-800' :
                      upload.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {upload.status}
                    </span>
                  </div>
                  
                  {upload.status !== 'completed' && upload.status !== 'error' && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-600">{upload.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
