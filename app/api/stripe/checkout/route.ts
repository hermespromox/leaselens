import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getCurrentConfirmedUser } from '@/lib/supabase/server'
import { getStripe, getStripePriceId, ensureStripeCustomer } from '@/lib/billing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function origin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://asklizy.com').replace(/\/$/, '')
}

export async function GET(req: NextRequest) {
  return handleCheckout(req)
}

export async function POST(req: NextRequest) {
  return handleCheckout(req)
}

async function handleCheckout(req: NextRequest) {
  const user = await getCurrentConfirmedUser()
  if (!user) {
    return NextResponse.json({ error: 'Vous devez être connecté pour vous abonner.' }, { status: 401 })
  }

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe n\'est pas configuré.' }, { status: 500 })
  }

  const priceId = getStripePriceId('pro')
  if (!priceId) {
    return NextResponse.json({ error: 'Le plan Pro n\'est pas configuré.' }, { status: 500 })
  }

  let body: Record<string, string> = {}
  try {
    if (req.method === 'POST') {
      const ct = req.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        body = await req.json()
      } else {
        const formData = await req.formData()
        body = Object.fromEntries(
          Array.from(formData.entries()).map(([k, v]) => [k, String(v)])
        ) as Record<string, string>
      }
    } else {
      const plan = req.nextUrl.searchParams.get('plan')
      if (plan) body.plan = plan
    }
  } catch {
    // empty body is fine
  }

  const plan = body.plan || 'pro'
  if (plan !== 'pro') {
    return NextResponse.json({ error: 'Plan inconnu.' }, { status: 400 })
  }

  try {
    const customerId = await ensureStripeCustomer(user)

    // Check if user already has an active subscription
    const existingSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    if (existingSubs.data.length > 0) {
      const sub = existingSubs.data[0]
      // Already subscribed — redirect to portal
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin()}/account?message=Votre abonnement Pro est déjà actif.`,
      })
      return NextResponse.redirect(portal.url, 303)
    }

    const subscriptionData: Record<string, unknown> = {
      metadata: {
        supabase_user_id: user.id,
        app: 'asklizy',
        plan: 'pro',
      },
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      locale: 'fr',
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      subscription_data: subscriptionData as Stripe.Checkout.SessionCreateParams.SubscriptionData,
      custom_fields: [
        {
          key: 'company_name',
          label: { type: 'custom', custom: 'Nom de l\'entreprise' },
          type: 'text',
          optional: true,
        },
        {
          key: 'siret',
          label: { type: 'custom', custom: 'SIRET' },
          type: 'text',
          optional: true,
        },
      ],
      success_url: `${origin()}/account?message=Votre abonnement Pro est maintenant actif. Bienvenue !`,
      cancel_url: `${origin()}/#pricing`,
    })

    if (!session.url) {
      return NextResponse.redirect(`${origin()}/account?error=${encodeURIComponent('Session de paiement indisponible.')}`, 303)
    }
    return NextResponse.redirect(session.url, 303)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la création de la session.'
    return NextResponse.redirect(
      `${origin()}/account?error=${encodeURIComponent(message)}`,
      303
    )
  }
}
