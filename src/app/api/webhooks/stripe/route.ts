import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supaAdmin'
import Stripe from 'stripe'
import { headers } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('No Stripe signature found')
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      try {
        const userId = session.metadata?.userId
        const credits = parseInt(session.metadata?.credits || '10')
        const amountTotal = session.amount_total || 0 // Amount in pence
        const stripePaymentId = session.payment_intent as string

        if (!userId) {
          console.error('No userId in session metadata')
          return NextResponse.json({ error: 'No userId' }, { status: 400 })
        }

        // Calculate credits from amount (1 credit per £1)
        const calculatedCredits = Math.floor(amountTotal / 100)

        // Upsert wallet to ensure it exists
        const { error: walletError } = await supabaseAdmin
          .from('wallets')
          .upsert({
            id: `wallet_${userId}`,
            userId: userId,
            credits: 0,
            totalEarned: 0,
            totalSpent: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, {
            onConflict: 'userId'
          })

        if (walletError) {
          console.error('Error upserting wallet:', walletError)
          throw new Error('Failed to upsert wallet')
        }

        // Increment credits in wallet
        const { error: updateWalletError } = await supabaseAdmin
          .from('wallets')
          .update({
            credits: supabaseAdmin.raw('credits + ?', [calculatedCredits]),
            totalEarned: supabaseAdmin.raw('total_earned + ?', [calculatedCredits]),
            updatedAt: new Date().toISOString()
          })
          .eq('userId', userId)

        if (updateWalletError) {
          console.error('Error updating wallet credits:', updateWalletError)
          throw new Error('Failed to update wallet credits')
        }

        // Insert transaction record (idempotent with unique index)
        const { error: transactionError } = await supabaseAdmin
          .from('transactions')
          .insert({
            id: `txn_${stripePaymentId}`,
            userId: userId,
            type: 'credit_topup',
            deltaCredits: calculatedCredits,
            amountPence: amountTotal,
            stripePaymentId: stripePaymentId,
            createdAt: new Date().toISOString()
          })

        if (transactionError) {
          // Check if it's a duplicate key error (idempotent)
          if (transactionError.code === '23505') {
            console.log('Transaction already processed (idempotent)')
            return NextResponse.json({ received: true })
          }
          console.error('Error inserting transaction:', transactionError)
          throw new Error('Failed to insert transaction')
        }

        console.log(`Successfully processed payment for user ${userId}: ${calculatedCredits} credits, ${amountTotal} pence`)

      } catch (error) {
        console.error('Error processing checkout.session.completed:', error)
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing failed:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
