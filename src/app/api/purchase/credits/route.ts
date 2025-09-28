import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(request: NextRequest) {
  try {
    // Auth guard
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { credits } = body

    if (!credits || credits !== 10) {
      return NextResponse.json({ error: 'Only 10 credit purchases are supported' }, { status: 400 })
    }

    const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000'

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      success_url: `${APP_BASE_URL}/wallet?success=true`,
      cancel_url: `${APP_BASE_URL}/wallet?canceled=true`,
      metadata: {
        userId: userId,
        credits: credits.toString()
      },
      // Use PRICE_CREDITS_10 if available, otherwise create inline price
      ...(process.env.PRICE_CREDITS_10 ? {
        line_items: [
          {
            price: process.env.PRICE_CREDITS_10,
            quantity: 1,
          },
        ],
      } : {
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: 'Credits 10',
                description: '10 credits for Beats4Cheese',
              },
              unit_amount: 1000, // £10.00 in pence
            },
            quantity: 1,
          },
        ],
      })
    })

    return NextResponse.json({ url: session.url })

  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
