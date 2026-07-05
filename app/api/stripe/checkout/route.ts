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

const VALID_PLANS = ['starter', 'pro'] as const

async function handleCheckout(req: NextRequest) {
  const user = await getCurrentConfirmedUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in to subscribe.' }, { status: 401 })
  }

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 })
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
  if (!VALID_PLANS.includes(plan as typeof VALID_PLANS[number])) {
    return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 })
  }

  const priceId = getStripePriceId(plan)
  if (!priceId) {
    return NextResponse.json({ error: `${plan} plan is not configured.` }, { status: 500 })
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
        return_url: `${origin()}/account?message=Your subscription is already active.`,
      })
      return NextResponse.redirect(portal.url, 303)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      locale: 'en',
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      automatic_tax: { enabled: true },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          app: 'asklizy',
          plan,
        },
      } as Stripe.Checkout.SessionCreateParams.SubscriptionData,
      custom_fields: [
        {
          key: 'company_name',
          label: { type: 'custom', custom: 'Company name' },
          type: 'text',
          optional: true,
        },
        {
          key: 'siret',
          label: { type: 'custom', custom: 'SIRET / VAT number' },
          type: 'text',
          optional: true,
        },
      ],
      success_url: `${origin()}/account?message=Your ${plan} subscription is now active. Welcome!`,
      cancel_url: `${origin()}/#pricing`,
    })

    if (!session.url) {
      return NextResponse.redirect(`${origin()}/account?error=${encodeURIComponent('Payment session unavailable.')}`, 303)
    }
    return NextResponse.redirect(session.url, 303)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error creating checkout session.'
    return NextResponse.redirect(
      `${origin()}/account?error=${encodeURIComponent(message)}`,
      303
    )
  }
}
