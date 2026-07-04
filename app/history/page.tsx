import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { getComparisonHistory } from '@/lib/leaselense';

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?message=Log in to view your saved comparisons.');

  const items = await getComparisonHistory(user.id);

  return (
    <main>
      <nav className="nav">
        <Link className="brand" href="/"><span className="material-symbols-outlined logo-icon">alt_route</span><span>LeaseLens</span></Link>
        <div><Link href="/">Compare</Link><Link href="/history">History</Link><Link href="/account">Account</Link></div>
      </nav>
      <section className="shell history-shell">
        <div className="history-head">
          <div>
            <p className="kicker">Your workspace</p>
            <h1>Comparison history</h1>
            <p className="subtle">Every comparison you run while logged in is saved here.</p>
          </div>
          <Link className="primary-link" href="/#compare">Run new comparison</Link>
        </div>
        {!items.length ? (
          <div className="panel empty history-empty">
            <div>
              <h3>No saved comparisons yet.</h3>
              <p className="notice">Run a location comparison while logged in and it will appear here.</p>
              <Link className="secondary-link" href="/#compare">Start comparing</Link>
            </div>
          </div>
        ) : (
          <div className="history-list">
            {items.map((item) => (
              <Link className="panel history-row" href={`/history/${item.id}`} key={item.id}>
                <div>
                  <span className="history-date">{new Date(item.created_at).toLocaleString()}</span>
                  <h3>{item.place_a} vs {item.place_b}</h3>
                  <p>{item.summary}</p>
                </div>
                <div className="history-score">
                  <span>{item.category}</span>
                  <strong>{item.winner}</strong>
                  <small>{item.score_a ?? '—'} / {item.score_b ?? '—'}</small>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
