import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getCurrentConfirmedUser } from '@/lib/supabase/server'
import { getStripe, getStripePriceId, ensureStripeCustomer, syncSubscriptionToUser } from '@/lib/billing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function origin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://asklizy.com').replace(/\/$/, '')
}

const VALID_PLANS = ['starter', 'pro'] as const

const CHECKOUT_PLAN_COPY: Record<string, string> = {
  starter: 'AskLizy Starter: 500 benchmarks per month with full report view, scoring, and saved history.',
  pro: 'AskLizy Pro: 1,500 benchmarks per month, full report view, export, scoring, saved history, and priority access.',
}

function safePlan(value: string | undefined): string | null {
  const plan = String(value || '').toLowerCase()
  return VALID_PLANS.includes(plan as typeof VALID_PLANS[number]) ? plan : null
}

async function startCheckout(req: NextRequest, plan: string | null) {
  if (!plan) {
    return NextResponse.redirect(`${origin()}/account?error=${encodeURIComponent('Invalid plan.')}`, 303)
  }

  const user = await getCurrentConfirmedUser()
  if (!user) {
    const next = `/api/stripe/checkout?plan=${encodeURIComponent(plan)}`
    return NextResponse.redirect(
      `${origin()}/login?message=${encodeURIComponent('Log in to choose a plan.')}&next=${encodeURIComponent(next)}`,
      303
    )
  }

  const stripe = getStripe()
  const priceId = getStripePriceId(plan)

  if (!stripe || !priceId) {
    return NextResponse.redirect(
      `${origin()}/account?error=${encodeURIComponent('Stripe configuration missing. Please try again later.')}`,
      303
    )
  }

  try {
    const customerId = await ensureStripeCustomer(user)

    // If user already has an active subscription, update it instead of creating a new one
    const existingSubId = user.app_metadata?.stripe_subscription_id as string | undefined
    const existingStatus = user.app_metadata?.stripe_subscription_status as string | undefined

    if (existingSubId && existingStatus && ['active', 'trialing'].includes(existingStatus as string)) {
      try {
        const existingSub = await stripe.subscriptions.retrieve(existingSubId)

        const updateParams: Stripe.SubscriptionUpdateParams = {
          items: [{
            id: existingSub.items.data[0]?.id,
            price: priceId,
          }],
          proration_behavior: 'create_prorations',
          metadata: {
            supabase_user_id: user.id,
            plan,
            app: 'asklizy',
          },
        }

        if (existingSub.cancel_at_period_end) {
          // Reactivate + change plan
          updateParams.cancel_at_period_end = false
        }

        await stripe.subscriptions.update(existingSubId, updateParams)

        // Sync updated subscription to user metadata
        const updatedSub = await stripe.subscriptions.retrieve(existingSubId)
        await syncSubscriptionToUser(user.id, updatedSub)

        const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1)
        return NextResponse.redirect(
          `${origin()}/account?message=${encodeURIComponent(`Plan updated to AskLizy ${planLabel}.`)}`,
          303
        )
      } catch (updateErr) {
        console.error('Subscription update failed, falling back to checkout', updateErr)
        // Fall through to checkout if update fails
      }
    }

    // No existing subscription — create a new checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      locale: 'en',
      billing_address_collection: 'required',
      customer_update: { address: 'auto', name: 'auto' },
      tax_id_collection: { enabled: true },
      automatic_tax: { enabled: true },
      custom_fields: [
        {
          key: 'company_name',
          label: { type: 'custom', custom: 'Company name (optional)' },
          optional: true,
          type: 'text',
        },
        {
          key: 'siret',
          label: { type: 'custom', custom: 'SIRET / VAT number (optional)' },
          optional: true,
          type: 'text',
        },
      ],
      custom_text: {
        submit: {
          message: CHECKOUT_PLAN_COPY[plan],
        },
      },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin()}/account?message=${encodeURIComponent('Subscription activated. Welcome to your AskLizy plan.')}`,
      cancel_url: `${origin()}/#pricing`,
      metadata: {
        supabase_user_id: user.id,
        plan,
        app: 'asklizy',
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan,
          app: 'asklizy',
        },
      },
      allow_promotion_codes: true,
    })

    if (!session.url) {
      return NextResponse.redirect(`${origin()}/account?error=${encodeURIComponent('Payment session unavailable.')}`, 303)
    }
    return NextResponse.redirect(session.url, 303)
  } catch (err) {
    console.error('Stripe checkout failed', err)
    const message = err instanceof Error ? err.message : 'Failed to create Stripe session.'
    return NextResponse.redirect(
      `${origin()}/account?error=${encodeURIComponent(message)}`,
      303
    )
  }
}

export async function GET(req: NextRequest) {
  const plan = safePlan(req.nextUrl.searchParams.get('plan') || undefined)
  return startCheckout(req, plan)
}

export async function POST(req: NextRequest) {
  let plan: string | null = null
  try {
    const ct = req.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const body = await req.json()
      plan = safePlan(body.plan)
    } else {
      const formData = await req.formData()
      plan = safePlan(String(formData.get('plan') || ''))
    }
  } catch {}
  return startCheckout(req, plan)
}
