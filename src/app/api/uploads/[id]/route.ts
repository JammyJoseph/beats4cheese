import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supaAdmin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth guard
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const uploadId = params.id
    const body = await request.json()
    const { status } = body

    if (!status || !['published', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be "published" or "pending"' }, { status: 400 })
    }

    // Ensure the upload belongs to user
    const { data: upload, error: fetchError } = await supabaseAdmin
      .from('uploads')
      .select('id, user_id')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !upload) {
      return NextResponse.json({ error: 'Upload not found or access denied' }, { status: 404 })
    }

    // Update upload status
    const { data: updatedUpload, error: updateError } = await supabaseAdmin
      .from('uploads')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', uploadId)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating upload:', updateError)
      return NextResponse.json({ error: 'Failed to update upload' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      upload: updatedUpload
    })

  } catch (error) {
    console.error('Upload update error:', error)
    return NextResponse.json({ error: 'Upload update failed' }, { status: 500 })
  }
}
