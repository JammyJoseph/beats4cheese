import { auth } from '@clerk/nextjs/server'
import { ensureProfile } from '@/lib/profile'
import Link from 'next/link'
import Uploader from '@/components/Uploader'

export default async function UploadPage() {
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
              Please sign in to upload beats
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
  await ensureProfile()

  return <Uploader />
}
