import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getStripe, updateUserBilling } from '@/lib/billing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 })
  }

  const formData = await req.formData()
  const confirm = String(formData.get('confirm') || '').trim().toUpperCase()

  if (confirm !== 'DELETE') {
    return NextResponse.redirect(
      new URL('/account?error=Please type DELETE to confirm account removal.', process.env.NEXT_PUBLIC_SITE_URL || 'https://asklizy.com'),
      303
    )
  }

  // Cancel active Stripe subscription if any
  const stripe = getStripe()
  const subscriptionId = user.app_metadata?.stripe_subscription_id as string | undefined
  if (stripe && subscriptionId) {
    try {
      await stripe.subscriptions.cancel(subscriptionId)
    } catch {}
  }

  // Mark user as deleted in Supabase (we can't actually delete the auth user from here without service role)
  try {
    await updateUserBilling(user.id, {
      asklizy_plan: 'free',
      asklizy_deleted: true,
      stripe_subscription_id: null,
      stripe_subscription_status: 'canceled',
    })
  } catch {}

  return NextResponse.redirect(
    new URL('/?message=Your account data has been removed.', process.env.NEXT_PUBLIC_SITE_URL || 'https://asklizy.com'),
    303
  )
}
