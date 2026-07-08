import Link from 'next/link'
import { redirect } from 'next/navigation'
import { logoutAction } from '@/app/auth/actions'
import { getCurrentConfirmedUser } from '@/lib/supabase/server'
import { getComparisonHistory, getWorkspaceSummary } from '@/lib/leaselense'
import { getBillingProfile, listRecentInvoices, PLANS } from '@/lib/billing'
import { postgresPool } from '@/lib/pool'
import { countUserMonthlyBenchmarks } from '@/lib/credits'
import NavBar from '@/components/NavBar'

function formatAmount(amount: number, currency = 'eur') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format((amount || 0) / 100)
}

function formatDate(value: number | string | null) {
  if (!value) return '—'
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusLabel(status: string | null) {
  const labels: Record<string, string> = {
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Past due',
    canceled: 'Canceled',
    incomplete: 'Incomplete',
    staff: 'Staff',
    paid: 'Paid',
    open: 'Open',
    draft: 'Draft',
    void: 'Void',
    uncollectible: 'Uncollectible',
  }
  return labels[status || ''] || status || '—'
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentConfirmedUser()
  if (!user) redirect('/login?message=Confirm your email, then log in to access your workspace.')

  const [summary, recent] = await Promise.all([
    getWorkspaceSummary(user.id),
    getComparisonHistory(user.id, 4),
  ])

  const billing = getBillingProfile(user)
  const invoices = await listRecentInvoices(user)

  // Get credits info
  const pool = postgresPool()
  const planConfig = PLANS[billing.plan as keyof typeof PLANS]
  const isUnlimited = planConfig?.maxComparisons === null
  let credits = null
  if (isUnlimited) {
    credits = { limit: null, used: 0, remaining: null, unlimited: true }
  } else {
    const limit = planConfig?.maxComparisons ?? PLANS.free.maxComparisons
    const used = await countUserMonthlyBenchmarks(pool, user.id)
    credits = { limit, used, remaining: Math.max(0, limit - used), unlimited: false }
  }
  const isPaid = billing.plan === 'starter' || billing.plan === 'pro'
  const isStaff = billing.plan === 'staff'
  const initials = user.email ? user.email.charAt(0).toUpperCase() : '?'
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <main>
      <NavBar active="account" variant="app" />

      <section className="shell workspace-shell account-shell">
        <div className="account-page-head">
          <div>
            <p className="kicker">Account</p>
            <h1>Your workspace</h1>
          </div>
          <Link className="primary-link" href="/#compare">New comparison</Link>
        </div>

        {params.message && <div className="success">{params.message}</div>}
        {params.error && <div className="error">{params.error}</div>}

        {/* Profile card */}
        <div className="panel account-profile-card" style={{ marginBottom: 24 }}>
          <div className="account-identity" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span className="account-avatar" aria-hidden="true" style={{
              width: 56, height: 56, borderRadius: '50%', background: '#1a1a1a', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, flexShrink: 0,
            }}>{initials}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ fontSize: 18, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</strong>
              <p style={{ fontSize: 12, color: '#888', fontFamily: 'monospace', marginTop: 2 }}>Member since {memberSince}</p>
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              borderRadius: 999, background: '#f0fdf4', border: '1px solid #bbf7d0',
              padding: '4px 12px', fontSize: 12, fontFamily: 'monospace', color: '#15803d',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              Active
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="account-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div className="panel" style={{ padding: 16 }}>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Plan</p>
            <p style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{billing.planLabel}</p>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Benchmarks left</p>
            {credits?.unlimited ? (
              <p style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: '#15803d' }}>∞</p>
            ) : (
              <>
                <p style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: credits?.remaining === 0 ? '#dc2626' : 'inherit' }}>
                  {credits?.remaining} / {credits?.limit}
                </p>
                <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: '#e5e7eb', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${credits?.limit ? ((credits.remaining / credits.limit) * 100) : 0}%`,
                    background: credits?.remaining === 0 ? '#dc2626' : (credits?.remaining ?? 0) <= 2 ? '#f59e0b' : '#22c55e',
                  }} />
                </div>
                <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#aaa', marginTop: 4 }}>Resets monthly · {credits?.used} used</p>
              </>
            )}
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Saved reports</p>
            <p style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{summary.total}</p>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Last report</p>
            <p style={{ fontSize: 14, fontWeight: 700, marginTop: 4, color: summary.last_comparison_at ? 'inherit' : '#ccc' }}>
              {summary.last_comparison_at ? formatDate(summary.last_comparison_at) : 'No reports yet'}
            </p>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Top category</p>
            <p style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{summary.top_category || '—'}</p>
          </div>
        </div>

        {/* Subscription management */}
        <h2 style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Subscription</h2>
        <div className="panel" style={{ padding: 20, marginBottom: 24 }}>
          {/* Status line */}
          <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 600 }}>Plan {billing.planLabel}</p>
              <span style={{
                display: 'inline-flex', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontFamily: 'monospace',
                background: billing.status === 'active' ? '#f0fdf4' : billing.cancelAtPeriodEnd ? '#fffbeb' : '#f5f5f5',
                color: billing.status === 'active' ? '#15803d' : billing.cancelAtPeriodEnd ? '#b45309' : '#888',
                border: `1px solid ${billing.status === 'active' ? '#bbf7d0' : billing.cancelAtPeriodEnd ? '#fde68a' : '#e5e5e5'}`,
              }}>
                {statusLabel(billing.status)}
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#888', fontFamily: 'monospace', marginTop: 4 }}>
              {billing.cancelAtPeriodEnd
                ? `Cancellation scheduled — access until ${formatDate(billing.currentPeriodEnd)}`
                : billing.currentPeriodEnd
                  ? `Next renewal: ${formatDate(billing.currentPeriodEnd)}`
                  : 'No billing cycle'
              }
            </p>
          </div>

          {/* Actions */}
          {isStaff ? (
            <span style={{
              borderRadius: 12, background: '#faf5ff', border: '1px solid #e9d5ff',
              padding: '10px 16px', fontSize: 14, fontWeight: 600, color: '#7e22ce', display: 'inline-block',
            }}>
              Staff access — all features unlocked
            </span>
          ) : isPaid ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {/* Upgrade from Starter to Pro */}
              {billing.plan === 'starter' && (
                <form action="/api/stripe/checkout" method="POST">
                  <input type="hidden" name="plan" value="pro" />
                  <button type="submit" style={{
                    borderRadius: 12, background: '#2563eb', border: 'none',
                    padding: '10px 16px', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer',
                  }}>
                    Upgrade to Pro — €149/mo HT
                  </button>
                </form>
              )}
              {billing.cancelAtPeriodEnd ? (
                <span style={{
                  display: 'inline-flex', borderRadius: 12, background: '#fffbeb', border: '1px solid #fde68a',
                  padding: '10px 16px', fontSize: 14, fontWeight: 600, color: '#b45309',
                }}>
                  Cancellation in progress
                </span>
              ) : (
                <form action="/api/stripe/cancel" method="POST">
                  <button type="submit" style={{
                    borderRadius: 12, border: '1px solid #fecaca', background: '#fff',
                    padding: '10px 16px', fontSize: 14, fontWeight: 600, color: '#dc2626', cursor: 'pointer',
                  }}>
                    Cancel subscription
                  </button>
                </form>
              )}
              {billing.stripeCustomerId && (
                <form action="/api/stripe/portal" method="POST">
                  <button type="submit" style={{
                    borderRadius: 12, background: '#1a1a1a', border: 'none',
                    padding: '10px 16px', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer',
                  }}>
                    Stripe portal — invoices & payment
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <form action="/api/stripe/checkout" method="POST">
                <input type="hidden" name="plan" value="starter" />
                <button type="submit" style={{
                  borderRadius: 12, border: '1px solid #e5e5e5', background: '#fff',
                  padding: '12px 20px', fontSize: 14, fontWeight: 600, color: '#333', cursor: 'pointer',
                }}>
                  Get Starter — €99/mo HT
                </button>
              </form>
              <form action="/api/stripe/checkout" method="POST">
                <input type="hidden" name="plan" value="pro" />
                <button type="submit" style={{
                  borderRadius: 12, background: '#2563eb', border: 'none',
                  padding: '12px 20px', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer',
                }}>
                  Get Pro — €149/mo HT
                </button>
              </form>
            </div>
          )}
          {!isStaff && (
            <p style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace', marginTop: 12 }}>
              Plan changes are immediate with Stripe proration. Cancellation takes effect at period end.
            </p>
          )}
        </div>

        {/* Invoices */}
        <h2 style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Invoices</h2>
        <div className="panel" style={{ marginBottom: 24 }}>
          {invoices.length > 0 ? (
            <div>
              {invoices.map((invoice) => (
                <div key={invoice.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 16,
                  borderBottom: '1px solid #f5f5f5',
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{invoice.number || invoice.id}</p>
                    <p style={{ fontSize: 12, color: '#888', fontFamily: 'monospace', marginTop: 2 }}>
                      {formatDate(invoice.created)} · {statusLabel(invoice.status)} · {formatAmount(invoice.amountPaid || invoice.amountDue, invoice.currency)}
                    </p>
                  </div>
                  {invoice.hostedInvoiceUrl && (
                    <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" style={{
                      fontSize: 12, fontFamily: 'monospace', color: '#2563eb',
                    }}>
                      View ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 14, color: '#888' }}>No invoices yet.</p>
              <p style={{ fontSize: 12, color: '#aaa', fontFamily: 'monospace', marginTop: 4 }}>
                Invoices will appear here after your first Stripe payment.
              </p>
            </div>
          )}
        </div>

        {/* Recent reports */}
        <h2 style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Recent reports</h2>
        <div className="panel" style={{ marginBottom: 24 }}>
          {recent.length ? (
            <div className="mini-history account-mini-history">
              {recent.map((item) => (
                <Link href={`/history/${item.id}`} className="mini-report" key={item.id}>
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                  <strong>{item.place_a} vs {item.place_b}</strong>
                  <small>{item.category} · Winner {item.winner} · Scores {item.score_a ?? '—'} / {item.score_b ?? '—'}</small>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ padding: 16, textAlign: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>No saved reports yet</h3>
              <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Run a comparison while logged in and it will appear here.</p>
              <Link className="primary-link" href="/#compare" style={{ display: 'inline-block', marginTop: 12 }}>Run first comparison</Link>
            </div>
          )}
          {recent.length > 0 && (
            <div style={{ padding: 16, textAlign: 'center' }}>
              <Link className="secondary-link" href="/history">View all</Link>
            </div>
          )}
        </div>

        {/* Account settings */}
        <h2 style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Account settings</h2>
        <div className="panel" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #f5f5f5' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>Email address</p>
              <p style={{ fontSize: 12, color: '#888', fontFamily: 'monospace', marginTop: 2 }}>{user.email}</p>
            </div>
            <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#aaa' }}>Not editable</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #f5f5f5' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>Password</p>
              <p style={{ fontSize: 12, color: '#888', fontFamily: 'monospace', marginTop: 2 }}>••••••••</p>
            </div>
            <Link href="/reset-password" style={{ fontSize: 12, fontFamily: 'monospace', color: '#2563eb' }}>Change</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>Legal</p>
              <p style={{ fontSize: 12, color: '#888', fontFamily: 'monospace', marginTop: 2 }}>Terms & privacy</p>
            </div>
            <Link href="/#legal" style={{ fontSize: 12, fontFamily: 'monospace', color: '#2563eb' }}>View</Link>
          </div>
        </div>

        {/* Danger zone */}
        <h2 style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 24 }}>Danger zone</h2>
        <div className="panel" style={{ padding: 16, marginBottom: 24, border: '1px solid #fecaca' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600 }}>Delete account</p>
              <p style={{ fontSize: 12, color: '#888', fontFamily: 'monospace', marginTop: 4, lineHeight: 1.5 }}>
                Permanently removes your account data. Cancel any active subscription first.
              </p>
            </div>
            <form action="/api/account/delete" method="POST" style={{ width: 220 }}>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'monospace', color: '#888', marginBottom: 4 }}>
                Type DELETE to confirm
              </label>
              <input
                name="confirm"
                required
                autoComplete="off"
                style={{
                  width: '100%', borderRadius: 8, border: '1px solid #fecaca',
                  padding: '8px 12px', fontSize: 12, fontFamily: 'monospace', textTransform: 'uppercase',
                  outline: 'none', marginBottom: 8,
                }}
                placeholder="DELETE"
              />
              <button type="submit" style={{
                width: '100%', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2',
                padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#dc2626', cursor: 'pointer',
              }}>
                Delete account
              </button>
            </form>
          </div>
        </div>

        {/* Logout */}
        <div style={{ marginBottom: 24 }}>
          <form action={logoutAction}>
            <button type="submit" style={{
              width: '100%', borderRadius: 12, border: '1px solid #fecaca', background: '#fff',
              padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#dc2626', cursor: 'pointer',
            }}>
              Log out
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
