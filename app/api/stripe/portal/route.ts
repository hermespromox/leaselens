import { NextRequest, NextResponse } from 'next/server'
import { getCurrentConfirmedUser } from '@/lib/supabase/server'
import { getStripe, ensureStripeCustomer } from '@/lib/billing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function origin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://asklizy.com').replace(/\/$/, '')
}

export async function POST(_req: NextRequest) {
  const user = await getCurrentConfirmedUser()
  if (!user) {
    return NextResponse.json({ error: 'Vous devez être connecté.' }, { status: 401 })
  }

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe n\'est pas configuré.' }, { status: 500 })
  }

  try {
    const customerId = await ensureStripeCustomer(user)

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin()}/account`,
    })

    return NextResponse.redirect(session.url, 303)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'ouverture du portail.'
    return NextResponse.redirect(
      `${origin()}/account?error=${encodeURIComponent(message)}`,
      303
    )
  }
}
