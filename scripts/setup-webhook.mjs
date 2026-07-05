import Stripe from 'stripe'

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
  console.error('STRIPE_SECRET_KEY is not set.')
  process.exit(1)
}

const stripe = new Stripe(secretKey, { apiVersion: '2026-06-24.dahlia' })

const WEBHOOK_URL = 'https://asklizy.com/api/stripe/webhook'
const EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]

async function main() {
  // Check if a webhook endpoint already exists for this URL
  const existing = await stripe.webhookEndpoints.list({ limit: 100 })
  const found = existing.data.find((w) => w.url === WEBHOOK_URL)
  if (found) {
    console.log('Existing webhook endpoint found:')
    console.log('STRIPE_WEBHOOK_SECRET=' + found.secret)
    console.log('id=' + found.id)
    return
  }

  const webhook = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: EVENTS,
    description: 'AskLizy production webhook',
    metadata: { app: 'asklizy' },
  })

  console.log('Webhook endpoint created:')
  console.log('STRIPE_WEBHOOK_SECRET=' + webhook.secret)
  console.log('id=' + webhook.id)
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
