import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe, syncSubscriptionToUser, updateUserBilling } from '@/lib/billing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function origin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://asklizy.com').replace(/\/$/, '')
}

async function syncCustomerToUser(stripe: Stripe, customerId: string) {
  const customer = await stripe.customers.retrieve(customerId)
  if (!customer || 'deleted' in customer) return
  const userId = (customer as Stripe.Customer).metadata?.supabase_user_id
  if (!userId) return

  // Update customer ID in app_metadata
  await updateUserBilling(userId, {
    stripe_customer_id: customerId,
  })

  // Sync the latest subscription if any
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    expand: ['data.items.data.price'],
  })
  if (subs.data.length > 0) {
    await syncSubscriptionToUser(userId, subs.data[0])
  }
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = session.customer as string
        if (customerId) {
          await syncCustomerToUser(stripe, customerId)
        }
        // Also sync the subscription if present
        const subscriptionId = session.subscription as string | undefined
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price'],
          })
          const customer = await stripe.customers.retrieve(customerId)
          if (customer && !('deleted' in customer)) {
            const userId = (customer as Stripe.Customer).metadata?.supabase_user_id
            if (userId) {
              await syncSubscriptionToUser(userId, subscription)
            }
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const customer = await stripe.customers.retrieve(customerId)
        if (customer && !('deleted' in customer)) {
          const userId = (customer as Stripe.Customer).metadata?.supabase_user_id
          if (userId) {
            await syncSubscriptionToUser(userId, subscription)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        // List subscriptions for this customer and sync the latest one
        const subs = await stripe.subscriptions.list({
          customer: customerId,
          limit: 1,
          expand: ['data.items.data.price'],
        })
        if (subs.data.length > 0) {
          const customer = await stripe.customers.retrieve(customerId)
          if (customer && !('deleted' in customer)) {
            const userId = (customer as Stripe.Customer).metadata?.supabase_user_id
            if (userId) {
              await syncSubscriptionToUser(userId, subs.data[0])
            }
          }
        }
        break
      }

      default:
        // Unhandled event — acknowledge
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook handler error'
    console.error('Stripe webhook error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
