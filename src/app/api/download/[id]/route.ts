import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supaAdmin'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth guard
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const listingId = params.id

    // Fetch listing price_pence for id
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('price_pence, path_original')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      console.error('Error fetching listing:', listingError)
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const pricePence = listing.price_pence || 0
    const creditsNeeded = Math.ceil(pricePence / 100)

    // Check wallet credits
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('credits')
      .eq('userId', userId)
      .single()

    if (walletError || !wallet) {
      console.error('Error fetching wallet:', walletError)
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    if (wallet.credits < creditsNeeded) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        creditsNeeded,
        creditsAvailable: wallet.credits
      }, { status: 402 })
    }

    // Call spend_credits function (assuming it's a PostgreSQL function)
    const { data: spendResult, error: spendError } = await supabaseAdmin
      .rpc('spend_credits', {
        p_user_id: userId,
        p_delta: creditsNeeded
      })

    if (spendError) {
      console.error('Error spending credits:', spendError)
      return NextResponse.json({ error: 'Failed to spend credits' }, { status: 500 })
    }

    // Insert purchases row
    const { error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .insert({
        id: `purchase_${userId}_${listingId}_${Date.now()}`,
        userId: userId,
        listingId: listingId,
        creditsSpent: creditsNeeded,
        pricePence: pricePence,
        createdAt: new Date().toISOString()
      })

    if (purchaseError) {
      console.error('Error inserting purchase:', purchaseError)
      return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 })
    }

    // Create a 60s signed URL for the original in 'originals' bucket
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('originals')
      .createSignedUrl(listing.path_original, 60)

    if (signedUrlError || !signedUrlData) {
      console.error('Error creating signed URL:', signedUrlError)
      return NextResponse.json({ error: 'Failed to create download URL' }, { status: 500 })
    }

    return NextResponse.json({ 
      url: signedUrlData.signedUrl,
      creditsSpent: creditsNeeded,
      remainingCredits: wallet.credits - creditsNeeded
    })

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
