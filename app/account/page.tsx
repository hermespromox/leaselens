import Link from 'next/link';
import { redirect } from 'next/navigation';
import { logoutAction } from '@/app/auth/actions';
import { getCurrentConfirmedUser } from '@/lib/supabase/server';
import { getComparisonHistory, getWorkspaceSummary } from '@/lib/leaselense';

function formatDate(value: string | null) {
  if (!value) return 'No saved reports yet';
  return new Date(value).toLocaleString();
}

export default async function AccountPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const user = await getCurrentConfirmedUser();
  if (!user) redirect('/login?message=Confirm your email, then log in to access your workspace.');

  const [summary, recent] = await Promise.all([
    getWorkspaceSummary(user.id),
    getComparisonHistory(user.id, 4),
  ]);

  return (
    <main>
      <nav className="nav">
        <Link className="brand" href="/"><span className="material-symbols-outlined logo-icon">alt_route</span><span>LeaseLens</span></Link>
        <div><Link href="/#compare">Compare</Link><Link href="/history">Reports</Link><Link href="/account">Workspace</Link></div>
      </nav>

      <section className="shell workspace-shell">
        <div className="workspace-hero panel">
          <div>
            <p className="kicker">Private workspace</p>
            <h1>Welcome back.</h1>
            <p className="subtle">Your confirmed LeaseLens account stores every comparison you run while signed in.</p>
          </div>
          <div className="workspace-profile">
            <span className="status-pill">Email confirmed</span>
            <strong>{user.email}</strong>
            <form action={logoutAction}><button className="primary">Log out</button></form>
          </div>
        </div>

        {searchParams.message && <div className="success">{searchParams.message}</div>}
        {searchParams.error && <div className="error">{searchParams.error}</div>}

        <div className="workspace-grid">
          <div className="panel workspace-card stat-card">
            <span>Saved reports</span>
            <strong>{summary.total}</strong>
            <p>Only reports created while logged in are linked to this workspace.</p>
          </div>
          <div className="panel workspace-card stat-card">
            <span>Last report</span>
            <strong className="small-stat">{formatDate(summary.last_comparison_at)}</strong>
            <p>Run a new comparison to update your workspace instantly.</p>
          </div>
          <div className="panel workspace-card stat-card">
            <span>Top category</span>
            <strong className="small-stat">{summary.top_category || '—'}</strong>
            <p>Based on your saved comparison history.</p>
          </div>
        </div>

        <div className="workspace-main">
          <div className="panel workspace-card">
            <div className="card-head">
              <div>
                <p className="kicker">Recent reports</p>
                <h2>Your comparison history</h2>
              </div>
              <Link className="secondary-link" href="/history">Open all reports</Link>
            </div>
            {recent.length ? (
              <div className="mini-history">
                {recent.map((item) => (
                  <Link href={`/history/${item.id}`} className="mini-report" key={item.id}>
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                    <strong>{item.place_a} vs {item.place_b}</strong>
                    <small>{item.category} · Winner {item.winner} · {item.score_a ?? '—'} / {item.score_b ?? '—'}</small>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty compact-empty">
                <div>
                  <h3>No saved reports yet.</h3>
                  <p className="notice">Start with a comparison while logged in and it will be saved here.</p>
                  <Link className="primary-link" href="/#compare">Run first comparison</Link>
                </div>
              </div>
            )}
          </div>

          <div className="panel workspace-card">
            <p className="kicker">Account controls</p>
            <h2>Security</h2>
            <div className="detail-list">
              <div><span>Email</span><strong>{user.email}</strong></div>
              <div><span>Status</span><strong>Confirmed account</strong></div>
            </div>
            <div className="hero-actions">
              <Link className="secondary-link" href="/update-password">Change password</Link>
              <Link className="secondary-link" href="/#compare">New comparison</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
