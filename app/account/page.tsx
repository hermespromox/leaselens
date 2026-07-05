import Link from 'next/link';
import { redirect } from 'next/navigation';
import { logoutAction } from '@/app/auth/actions';
import { getCurrentConfirmedUser } from '@/lib/supabase/server';
import { getComparisonHistory, getWorkspaceSummary } from '@/lib/leaselense';
import { getBillingProfile } from '@/lib/billing';
import NavBar from '@/components/NavBar';

function formatDate(value: string | null) {
  if (!value) return 'No saved reports yet';
  return new Date(value).toLocaleString();
}

function formatDateFR(value: number | string | null) {
  if (!value) return '—';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function statusLabel(status: string | null) {
  switch (status) {
    case 'active': return 'Actif';
    case 'trialing': return 'Période d\'essai';
    case 'past_due': return 'Paiement en retard';
    case 'canceled': return 'Annulé';
    case 'incomplete': return 'Incomplet';
    case 'staff': return 'Staff';
    default: return '—';
  }
}

export default async function AccountPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const user = await getCurrentConfirmedUser();
  if (!user) redirect('/login?message=Confirm your email, then log in to access your workspace.');

  const [summary, recent] = await Promise.all([
    getWorkspaceSummary(user.id),
    getComparisonHistory(user.id, 4),
  ]);

  const billing = getBillingProfile(user);

  return (
    <main>
      <NavBar active="account" variant="app" />

      <section className="shell workspace-shell account-shell">
        <div className="account-page-head">
          <div>
            <p className="kicker">Account</p>
            <h1>Your workspace</h1>
            <p className="subtle">Manage your confirmed account and quickly return to saved AskLizy reports.</p>
          </div>
          <Link className="primary-link" href="/#compare">New comparison</Link>
        </div>

        {searchParams.message && <div className="success">{searchParams.message}</div>}
        {searchParams.error && <div className="error">{searchParams.error}</div>}

        <div className="account-layout">
          <aside className="panel account-side-card">
            <div className="account-identity">
              <span className="account-avatar" aria-hidden="true">●</span>
              <div>
                <p className="kicker">Signed in as</p>
                <strong>{user.email}</strong>
              </div>
            </div>

            <div className="account-status-row">
              <span>Email status</span>
              <strong className="status-pill compact-status">Confirmed</strong>
            </div>
            <div className="account-status-row">
              <span>Workspace access</span>
              <strong>Enabled</strong>
            </div>

            <div className="account-actions-list">
              <Link className="secondary-link" href="/update-password">Change password</Link>
              <Link className="secondary-link" href="/history">Open history</Link>
              <form action={logoutAction}><button className="primary account-logout">Log out</button></form>
            </div>
          </aside>

          <div className="account-content">
            <div className="panel workspace-card account-billing-card">
              <div className="card-head">
                <div>
                  <p className="kicker">Abonnement</p>
                  <h2>Plan {billing.planLabel}</h2>
                </div>
                <strong className="status-pill compact-status">{statusLabel(billing.status)}</strong>
              </div>
              <div className="billing-info">
                {billing.currentPeriodEnd && (
                  <div className="account-status-row">
                    <span>Prochaine échéance</span>
                    <strong>{formatDateFR(billing.currentPeriodEnd)}</strong>
                  </div>
                )}
                {billing.plan === 'pro' && (
                  <div className="account-status-row">
                    <span>Annulation en fin de période</span>
                    <strong>{billing.cancelAtPeriodEnd ? 'Oui' : 'Non'}</strong>
                  </div>
                )}
              </div>
              <div className="billing-actions">
                {billing.plan === 'free' && (
                  <form action="/api/stripe/checkout" method="POST">
                    <input type="hidden" name="plan" value="pro" />
                    <button type="submit" className="primary">Passer Pro — 29€/mois</button>
                  </form>
                )}
                {billing.plan === 'pro' && (
                  <>
                    <form action="/api/stripe/portal" method="POST">
                      <button type="submit" className="secondary-link" style={{ width: 'auto' }}>Portail Stripe</button>
                    </form>
                    {!billing.cancelAtPeriodEnd && (
                      <form action="/api/stripe/cancel" method="POST">
                        <button type="submit" className="secondary-link" style={{ width: 'auto' }}>Annuler l'abonnement</button>
                      </form>
                    )}
                  </>
                )}
                {billing.plan === 'staff' && (
                  <p className="notice">Votre compte dispose d'un accès staff avec toutes les fonctionnalités.</p>
                )}
              </div>
            </div>

            <div className="account-stat-grid">
              <div className="panel workspace-card stat-card account-stat-card">
                <span>Saved reports</span>
                <strong>{summary.total}</strong>
                <p>Comparisons saved while you are logged in.</p>
              </div>
              <div className="panel workspace-card stat-card account-stat-card">
                <span>Last report</span>
                <strong className="small-stat">{formatDate(summary.last_comparison_at)}</strong>
                <p>Most recent saved comparison.</p>
              </div>
              <div className="panel workspace-card stat-card account-stat-card">
                <span>Top category</span>
                <strong className="small-stat">{summary.top_category || '—'}</strong>
                <p>Based on saved history.</p>
              </div>
            </div>

            <div className="panel workspace-card account-reports-card">
              <div className="card-head account-card-head">
                <div>
                  <p className="kicker">Recent reports</p>
                  <h2>Latest comparisons</h2>
                </div>
                <Link className="secondary-link" href="/history">View all</Link>
              </div>
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
                <div className="empty compact-empty account-empty">
                  <div>
                    <h3>No saved reports yet</h3>
                    <p className="notice">Run a comparison while logged in and it will appear here automatically.</p>
                    <Link className="primary-link" href="/#compare">Run first comparison</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
