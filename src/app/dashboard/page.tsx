import { auth } from '@clerk/nextjs/server'
import { ensureProfile } from '@/lib/profile'
import { supabaseAdmin } from '@/lib/supaAdmin'
import Link from 'next/link'
import UploadToggle from './UploadToggle'

interface UploadWithBPM {
  id: string
  title: string
  status: string
  created_at: string
  bpm: number | null
}

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Access Required
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please sign in to access your dashboard
            </p>
          </div>
          <Link 
            href="/sign-in"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  // Ensure user profile exists
  const profile = await ensureProfile()

  // Fetch user uploads with BPM from tags
  const { data: uploads, error: uploadsError } = await supabaseAdmin
    .from('uploads')
    .select(`
      id,
      title,
      status,
      created_at,
      tags!inner(name, value)
    `)
    .eq('user_id', userId)
    .eq('tags.name', 'bpm')
    .order('created_at', { ascending: false })

  // Also get uploads without BPM tags
  const { data: uploadsWithoutBpm, error: uploadsWithoutBpmError } = await supabaseAdmin
    .from('uploads')
    .select('id, title, status, created_at')
    .eq('user_id', userId)
    .not('id', 'in', `(${uploads?.map(u => u.id).join(',') || 'null'})`)

  // Combine and format uploads
  const allUploads: UploadWithBPM[] = [
    ...(uploads || []).map(upload => ({
      id: upload.id,
      title: upload.title,
      status: upload.status,
      created_at: upload.created_at,
      bpm: upload.tags?.[0]?.value ? parseInt(upload.tags[0].value) : null
    })),
    ...(uploadsWithoutBpm || []).map(upload => ({
      id: upload.id,
      title: upload.title,
      status: upload.status,
      created_at: upload.created_at,
      bpm: null
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {profile?.username || 'User'}!
          </p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">C</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Credits
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {profile?.credits || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">U</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Uploads
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {allUploads.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">P</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Published
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {allUploads.filter(u => u.status === 'published').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Uploads Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Your Uploads</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    BPM
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
                {allUploads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <span className="text-gray-400 text-xl">♪</span>
                        </div>
                        <p className="text-lg font-medium text-gray-900 mb-2">No uploads yet</p>
                        <p className="text-sm text-gray-500 mb-4">Start by uploading your first beat</p>
                        <Link
                          href="/upload"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Upload Beat
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  allUploads.map((upload) => (
                    <tr key={upload.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {upload.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {upload.bpm ? `${upload.bpm} BPM` : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          upload.status === 'published' 
                            ? 'bg-green-100 text-green-800'
                            : upload.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {upload.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(upload.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <UploadToggle 
                          uploadId={upload.id} 
                          currentStatus={upload.status}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
