import { NextRequest, NextResponse } from 'next/server'
import { getCurrentConfirmedUser } from '@/lib/supabase/server'
import { getStripe } from '@/lib/billing'

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

  const subscriptionId = user.app_metadata?.stripe_subscription_id
  if (!subscriptionId) {
    return NextResponse.redirect(
      `${origin()}/account?error=${encodeURIComponent('Aucun abonnement actif trouvé.')}`,
      303
    )
  }

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    // Sync the updated subscription status to the user
    const { syncSubscriptionToUser } = await import('@/lib/billing')
    await syncSubscriptionToUser(user.id, subscription)

    return NextResponse.redirect(
      `${origin()}/account?message=${encodeURIComponent('Votre abonnement sera annulé à la fin de la période en cours.')}`,
      303
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'annulation.'
    return NextResponse.redirect(
      `${origin()}/account?error=${encodeURIComponent(message)}`,
      303
    )
  }
}
