'use client'

import { useState, useEffect } from 'react'

interface Listing {
  id: string
  title: string
  bpm: number
  price: number
  preview_path: string
  created_at: string
  username: string
}

export default function BrowsePage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bpmMin, setBpmMin] = useState(0)
  const [bpmMax, setBpmMax] = useState(300)
  const [downloading, setDownloading] = useState<string | null>(null)

  const fetchListings = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        bpmMin: bpmMin.toString(),
        bpmMax: bpmMax.toString()
      })

      const response = await fetch(`/api/search?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch listings')
      }

      const data = await response.json()
      setListings(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch listings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListings()
  }, [bpmMin, bpmMax])

  const handleDownload = async (listingId: string) => {
    try {
      setDownloading(listingId)

      const response = await fetch(`/api/download/${listingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        if (response.status === 402) {
          // Insufficient credits
          alert(`Insufficient credits. You need ${errorData.creditsNeeded} credits but only have ${errorData.creditsAvailable}. Please purchase more credits.`)
          return
        }
        
        throw new Error(errorData.error || 'Failed to initiate download')
      }

      const data = await response.json()
      
      if (data.url) {
        // Redirect to the download URL
        window.location.href = data.url
      } else {
        throw new Error('No download URL received')
      }
    } catch (err) {
      console.error('Download error:', err)
      alert(`Failed to download: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setDownloading(null)
    }
  }

  const getPreviewUrl = (previewPath: string) => {
    if (!previewPath) return null
    
    // Construct public URL for preview from Supabase storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    return `${supabaseUrl}/storage/v1/object/public/previews/${previewPath}`
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Browse Beats</h1>
          <p className="mt-2 text-gray-600">
            Discover amazing beats from talented producers
          </p>
        </div>

        {/* BPM Filter */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filter by BPM</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="bpmMin" className="block text-sm font-medium text-gray-700 mb-1">
                Min BPM
              </label>
              <input
                type="number"
                id="bpmMin"
                min="0"
                max="300"
                value={bpmMin}
                onChange={(e) => setBpmMin(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="bpmMax" className="block text-sm font-medium text-gray-700 mb-1">
                Max BPM
              </label>
              <input
                type="number"
                id="bpmMax"
                min="0"
                max="300"
                value={bpmMax}
                onChange={(e) => setBpmMax(parseInt(e.target.value) || 300)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchListings}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchListings}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md"
            >
              Try Again
            </button>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-2xl">♪</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No beats found</h3>
            <p className="text-gray-500">Try adjusting your BPM filter or check back later for new uploads.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => {
              const previewUrl = getPreviewUrl(listing.preview_path)
              
              return (
                <div key={listing.id} className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {listing.title}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {listing.bpm} BPM
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">
                      by {listing.username}
                    </p>

                    {/* Audio Preview */}
                    {previewUrl && (
                      <div className="mb-4">
                        <audio
                          controls
                          className="w-full"
                          preload="metadata"
                        >
                          <source src={previewUrl} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-green-600">
                        {listing.price} credits
                      </div>
                      <button
                        onClick={() => handleDownload(listing.id)}
                        disabled={downloading === listing.id}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md text-sm"
                      >
                        {downloading === listing.id ? (
                          <div className="flex items-center">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Downloading...
                          </div>
                        ) : (
                          'Download with credits'
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 px-6 py-3">
                    <p className="text-xs text-gray-500">
                      Uploaded {new Date(listing.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
