interface PostmarkEmailRequest {
  From: string
  To: string
  Subject: string
  TextBody: string
}

interface PostmarkResponse {
  MessageID: string
  SubmittedAt: string
  To: string
  ErrorCode?: number
  Message?: string
}

const POSTMARK_TOKEN = process.env.POSTMARK_TOKEN!
const POSTMARK_FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL || 'noreply@beats4cheese.com'

if (!POSTMARK_TOKEN) {
  throw new Error('Missing POSTMARK_TOKEN environment variable')
}

export async function sendEmail(to: string, subject: string, textBody: string): Promise<PostmarkResponse> {
  const emailData: PostmarkEmailRequest = {
    From: POSTMARK_FROM_EMAIL,
    To: to,
    Subject: subject,
    TextBody: textBody
  }

  try {
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': POSTMARK_TOKEN
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Postmark API error: ${errorData.Message || response.statusText}`)
    }

    const result: PostmarkResponse = await response.json()
    return result
  } catch (error) {
    console.error('Email sending failed:', error)
    throw error
  }
}

export async function sendWelcomeEmail(to: string, username: string): Promise<PostmarkResponse> {
  const subject = 'Welcome to Beats4Cheese!'
  const textBody = `Hi ${username},

Welcome to Beats4Cheese! We're excited to have you join our community of music producers and creators.

Get started by:
- Uploading your first beat
- Browsing our marketplace
- Connecting with other producers

Happy creating!

The Beats4Cheese Team`

  return sendEmail(to, subject, textBody)
}

export async function sendPurchaseConfirmation(to: string, credits: number, amount: number): Promise<PostmarkResponse> {
  const subject = 'Purchase Confirmation - Beats4Cheese'
  const textBody = `Thank you for your purchase!

You've successfully purchased ${credits} credits for $${amount.toFixed(2)}.

Your credits are now available in your wallet and ready to use for downloads.

Happy shopping!

The Beats4Cheese Team`

  return sendEmail(to, subject, textBody)
}
