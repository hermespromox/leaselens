import Stripe from 'stripe'

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
  console.error('STRIPE_SECRET_KEY is not set.')
  process.exit(1)
}

const stripe = new Stripe(secretKey, { apiVersion: '2026-06-24.dahlia' })

async function main() {
  // Check if a 20% FR tax rate already exists
  const existing = await stripe.taxRates.list({ active: true, limit: 100 })
  const found = existing.data.find(
    (t) => t.percentage === 20 && t.country === 'FR' && t.display_name === 'TVA FR'
  )
  if (found) {
    console.log('Existing tax rate found:')
    console.log('STRIPE_TAX_RATE_ID=' + found.id)
    console.log('id=' + found.id)
    return
  }

  // Create 20% French TVA tax rate
  const taxRate = await stripe.taxRates.create({
    display_name: 'TVA FR',
    description: 'TVA française 20 %',
    country: 'FR',
    percentage: 20,
    inclusive: false,
    active: true,
    metadata: { app: 'asklizy', country: 'FR' },
  })

  console.log('Tax rate created:')
  console.log('STRIPE_TAX_RATE_ID=' + taxRate.id)
  console.log('id=' + taxRate.id)
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
