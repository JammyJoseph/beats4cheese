import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Handle Stripe webhooks
    return NextResponse.json({ received: true })
  } catch (error) {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
