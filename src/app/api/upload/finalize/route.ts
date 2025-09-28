import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supaAdmin'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { parseFile } from 'music-metadata'
import { detectBpm } from 'bpm-detective'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

// Set ffmpeg path
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath as string)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { upload_id } = body

    if (!upload_id) {
      return NextResponse.json({ error: 'Upload ID is required' }, { status: 400 })
    }

    // Lookup asset.path_original
    const { data: asset, error: assetError } = await supabaseAdmin
      .from('assets')
      .select('path_original')
      .eq('upload_id', upload_id)
      .single()

    if (assetError || !asset) {
      console.error('Error fetching asset:', assetError)
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Create a 60s signed URL for the original file
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('originals')
      .createSignedUrl(asset.path_original, 60)

    if (signedUrlError || !signedUrlData) {
      console.error('Error creating signed URL:', signedUrlError)
      return NextResponse.json({ error: 'Failed to create download URL' }, { status: 500 })
    }

    // Download and stream to /tmp/in.wav (no full buffering)
    const response = await fetch(signedUrlData.signedUrl)
    if (!response.ok) {
      throw new Error('Failed to download original file')
    }

    const inputPath = '/tmp/in.wav'
    const outputPath = '/tmp/out.mp3'

    // Stream the file to disk
    const writeStream = fs.createWriteStream(inputPath)
    const reader = response.body?.getReader()
    
    if (!reader) {
      throw new Error('No response body reader available')
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      writeStream.write(value)
    }
    writeStream.end()

    // Wait for write to complete
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
    })

    // ffmpeg path is already set at module level

    // Create 30s 128k mp3 preview
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .duration(30)
        .audioBitrate(128)
        .audioCodec('mp3')
        .format('mp3')
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath)
    })

    // Detect BPM using bpm-detective on a slice
    let bpm = 120 // default
    let confidence = 0.7

    try {
      // Read a slice of the file for BPM detection
      const stats = fs.statSync(inputPath)
      const sliceSize = Math.min(1024 * 1024, stats.size) // 1MB or file size
      const buffer = Buffer.alloc(sliceSize)
      const fd = fs.openSync(inputPath, 'r')
      fs.readSync(fd, buffer, 0, sliceSize, 0)
      fs.closeSync(fd)

      const detectedBpm = await detectBpm(buffer)
      if (detectedBpm && detectedBpm > 0) {
        bpm = Math.round(detectedBpm)
        confidence = 0.8
      }
    } catch (bpmError) {
      console.warn('BPM detection failed:', bpmError)
      // Use default values
    }

    // Upload preview to 'previews' bucket with .mp3 extension
    const previewPath = `previews/${upload_id}.mp3`
    const previewBuffer = fs.readFileSync(outputPath)

    const { error: uploadError } = await supabaseAdmin.storage
      .from('previews')
      .upload(previewPath, previewBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading preview:', uploadError)
      throw new Error('Failed to upload preview')
    }

    // Make preview public
    const { error: publicError } = await supabaseAdmin.storage
      .from('previews')
      .updatePublicAccess(true)

    if (publicError) {
      console.warn('Failed to make preview public:', publicError)
    }

    // Get duration from metadata
    let duration = 30 // default to preview length
    try {
      const metadata = await parseFile(inputPath)
      duration = metadata.format.duration || 30
    } catch (metadataError) {
      console.warn('Failed to get metadata:', metadataError)
    }

    // Update assets with path_preview and duration_sec
    const { error: updateAssetError } = await supabaseAdmin
      .from('assets')
      .update({
        path_preview: previewPath,
        duration_sec: Math.round(duration),
        updated_at: new Date().toISOString()
      })
      .eq('upload_id', upload_id)

    if (updateAssetError) {
      console.error('Error updating asset:', updateAssetError)
      throw new Error('Failed to update asset')
    }

    // Insert tags with BPM and confidence
    const { error: tagsError } = await supabaseAdmin
      .from('tags')
      .insert({
        id: uuidv4(),
        upload_id: upload_id,
        name: 'bpm',
        value: bpm.toString(),
        confidence: confidence,
        created_at: new Date().toISOString()
      })

    if (tagsError) {
      console.error('Error inserting BPM tag:', tagsError)
      // Don't fail the whole process for tag insertion
    }

    // Update uploads status to 'processing'
    const { error: updateUploadError } = await supabaseAdmin
      .from('uploads')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', upload_id)

    if (updateUploadError) {
      console.error('Error updating upload status:', updateUploadError)
      throw new Error('Failed to update upload status')
    }

    // Clean up temp files
    try {
      fs.unlinkSync(inputPath)
      fs.unlinkSync(outputPath)
    } catch (cleanupError) {
      console.warn('Failed to clean up temp files:', cleanupError)
    }

    return NextResponse.json({
      success: true,
      upload_id,
      preview_path: previewPath,
      bpm,
      duration: Math.round(duration)
    })

  } catch (error) {
    console.error('Upload finalize error:', error)

    // On error, insert events row
    try {
      await supabaseAdmin
        .from('events')
        .insert({
          id: uuidv4(),
          upload_id: request.body ? JSON.parse(await request.text()).upload_id : null,
          name: 'error_server',
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
          created_at: new Date().toISOString()
        })
    } catch (eventError) {
      console.error('Failed to insert error event:', eventError)
    }

    return NextResponse.json({ error: 'Upload finalization failed' }, { status: 500 })
  }
}
