import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supaAdmin'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    // Auth via Clerk server API
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, filename } = body

    if (!title || !filename) {
      return NextResponse.json({ error: 'Title and filename are required' }, { status: 400 })
    }

    // Generate upload ID
    const uploadId = uuidv4()
    
    // Create file path: originals/{userId}/{uploadId}/{filename}
    const filePath = `originals/${userId}/${uploadId}/${filename}`

    // Insert uploads row
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .from('uploads')
      .insert({
        id: uploadId,
        user_id: userId,
        title,
        country: 'GB',
        status: 'uploading',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (uploadError) {
      console.error('Error creating upload record:', uploadError)
      return NextResponse.json({ error: 'Failed to create upload record' }, { status: 500 })
    }

    // Create signed upload URL in Supabase bucket 'originals'
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('originals')
      .createSignedUploadUrl(filePath, {
        upsert: false
      })

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    // Insert assets row with path_original
    const { data: assetData, error: assetError } = await supabaseAdmin
      .from('assets')
      .insert({
        id: uuidv4(),
        upload_id: uploadId,
        path_original: filePath,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (assetError) {
      console.error('Error creating asset record:', assetError)
      return NextResponse.json({ error: 'Failed to create asset record' }, { status: 500 })
    }

    // Return upload_id and signed URL
    return NextResponse.json({
      upload_id: uploadId,
      url: signedUrlData.signedUrl,
      path: filePath
    })

  } catch (error) {
    console.error('Upload init error:', error)
    return NextResponse.json({ error: 'Upload initialization failed' }, { status: 500 })
  }
}
