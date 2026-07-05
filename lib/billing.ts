import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const PLANS = {
  free: { id: 'free', label: 'Free', price: 0, maxComparisons: 3, canExport: false },
  starter: { id: 'starter', label: 'Starter', price: 99, maxComparisons: 10, canExport: false },
  pro: { id: 'pro', label: 'Pro', price: 149, maxComparisons: null, canExport: true },
  staff: { id: 'staff', label: 'Staff', price: 0, maxComparisons: null, canExport: true },
} as const

const BUILT_IN_STAFF_EMAILS: string[] = []

export function isStaffUser(user: any): boolean {
  const meta = user?.app_metadata || {}
  if (meta.asklizy_staff === true || meta.asklizy_role === 'staff') return true
  const email = user?.email?.toLowerCase()
  if (!email) return false
  return BUILT_IN_STAFF_EMAILS.includes(email)
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2026-06-24.dahlia' })
}

export function getStripePriceId(plan: string): string | null {
  if (plan === 'starter') return process.env.STRIPE_STARTER_PRICE_ID || null
  if (plan === 'pro') return process.env.STRIPE_PRO_PRICE_ID || null
  return null
}

export function getPlanFromUser(user: any): string {
  if (!user) return 'free'
  const meta = user.app_metadata || {}
  const plan = meta.asklizy_plan || 'free'
  const status = meta.stripe_subscription_status || null
  if (['starter', 'pro'].includes(plan) && ['active', 'trialing'].includes(status)) return plan
  if (isStaffUser(user)) return 'staff'
  return 'free'
}

export function getBillingProfile(user: any) {
  const plan = getPlanFromUser(user)
  return {
    plan,
    planLabel: PLANS[plan as keyof typeof PLANS]?.label || 'Free',
    status: plan === 'staff' ? 'staff' : user?.app_metadata?.stripe_subscription_status || null,
    stripeCustomerId: user?.app_metadata?.stripe_customer_id || null,
    stripeSubscriptionId: user?.app_metadata?.stripe_subscription_id || null,
    currentPeriodEnd: user?.app_metadata?.stripe_current_period_end || null,
    cancelAtPeriodEnd: Boolean(user?.app_metadata?.stripe_cancel_at_period_end),
    canExport: PLANS[plan as keyof typeof PLANS]?.canExport || false,
  }
}

export function getPlanFromPriceId(priceId: string): string {
  if (!priceId) return 'free'
  if (priceId === getStripePriceId('starter')) return 'starter'
  if (priceId === getStripePriceId('pro')) return 'pro'
  return 'free'
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase admin environment variables.')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function updateUserBilling(userId: string, patch: Record<string, unknown>) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: patch,
  })
  if (error) throw error
  return data.user
}

export async function ensureStripeCustomer(user: any): Promise<string> {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe is not configured.')

  const existingCustomerId = user?.app_metadata?.stripe_customer_id as string | undefined
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId)
      if (customer && !('deleted' in customer)) return customer.id
    } catch {
      // fall through to create a new customer
    }
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.user_metadata?.full_name || undefined,
    metadata: {
      supabase_user_id: user.id,
      app: 'asklizy',
    },
  })

  await updateUserBilling(user.id, {
    stripe_customer_id: customer.id,
  })

  return customer.id
}

export async function syncSubscriptionToUser(userId: string, subscription: Stripe.Subscription) {
  const plan = getPlanFromPriceId(subscription.items?.data?.[0]?.price?.id || '')
  const currentPeriodEnd = subscription.items?.data?.[0]?.current_period_end || null
  const patch: Record<string, unknown> = {
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_current_period_end: currentPeriodEnd,
    stripe_cancel_at_period_end: subscription.cancel_at_period_end,
  }
  if (plan !== 'free') {
    patch.asklizy_plan = plan
  } else if (subscription.status === 'canceled') {
    patch.asklizy_plan = 'free'
  }
  await updateUserBilling(userId, patch)
}

export async function listRecentInvoices(user: any, limit = 6) {
  const stripe = getStripe()
  const customer = user?.app_metadata?.stripe_customer_id
  if (!stripe || !customer) return []
  const invoices = await stripe.invoices.list({ customer, limit })
  return invoices.data.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amountPaid: invoice.amount_paid,
    amountDue: invoice.amount_due,
    currency: invoice.currency,
    created: invoice.created,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    invoicePdf: invoice.invoice_pdf,
  }))
}
