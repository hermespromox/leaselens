import Stripe from 'stripe'

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
  console.error('STRIPE_SECRET_KEY is not set.')
  process.exit(1)
}

const stripe = new Stripe(secretKey, { apiVersion: '2025-11-17.clover' })

async function main() {
  const product = await stripe.products.create({
    name: 'AskLizy Pro',
    description: 'Abonnement mensuel AskLizy Pro : comparaisons illimitées, historique sauvegardé, catégories avancées.',
    metadata: { app: 'asklizy', plan: 'pro' },
  })
  console.log('Product:', product.id)

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 2900,
    currency: 'eur',
    tax_behavior: 'exclusive',
    recurring: { interval: 'month' },
    nickname: 'AskLizy Pro mensuel HT',
    metadata: { app: 'asklizy', plan: 'pro' },
  })
  console.log('Price:', price.id)
  console.log('\nSet these env vars:')
  console.log('STRIPE_PRO_PRICE_ID=' + price.id)
  console.log('STRIPE_PRODUCT_ID=' + product.id)
}

main().catch(console.error)
