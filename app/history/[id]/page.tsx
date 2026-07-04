import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentConfirmedUser } from '@/lib/supabase/server';
import { getComparisonDetail } from '@/lib/leaselense';

function valueText(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  return String(value);
}

export default async function HistoryDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentConfirmedUser();
  if (!user) redirect('/login?message=Log in to view this comparison.');

  const detail = await getComparisonDetail(user.id, params.id);
  if (!detail) notFound();

  const { comparison, locations, reviews } = detail;

  return (
    <main>
      <nav className="nav">
        <Link className="brand" href="/"><span className="material-symbols-outlined logo-icon">alt_route</span><span>LeaseLens</span></Link>
        <div><Link href="/history">History</Link><Link href="/account">Account</Link></div>
      </nav>
      <section className="shell history-shell">
        <Link className="secondary-link back-link" href="/history">← Back to history</Link>
        <div className="panel winner-panel detail-hero">
          <p className="kicker">Saved comparison · {new Date(comparison.created_at).toLocaleString()}</p>
          <h1>{comparison.place_a} vs {comparison.place_b}</h1>
          <div className="scoreboard">
            <div className="score-card"><span>Place A score</span><strong>{comparison.score_a ?? '—'}</strong></div>
            <div className="score-card"><span>Place B score</span><strong>{comparison.score_b ?? '—'}</strong></div>
          </div>
          <h2>Winner: <span>{comparison.winner}</span></h2>
          <p>{comparison.summary}</p>
        </div>

        <div className="columns">
          {locations.map((location: any) => {
            const metrics = location.metrics || {};
            const topPlaces = Array.isArray(location.top_places) ? location.top_places : [];
            return (
              <div className="panel result-card" key={location.label}>
                <div className="place-title">
                  <div><p className="kicker">Place {location.label}</p><h3>{location.input}</h3></div>
                  <strong className="mini-score">{location.score ?? '—'}</strong>
                </div>
                <p className="notice">{valueText(location.latitude)}, {valueText(location.longitude)}</p>
                <div className="metrics">
                  <div className="metric"><b>{valueText(metrics.poiCount)}</b><span>Nearby places</span></div>
                  <div className="metric"><b>{valueText(metrics.avgRating)}</b><span>Avg rating</span></div>
                  <div className="metric"><b>{valueText(metrics.totalReviews)}</b><span>Total reviews</span></div>
                  <div className="metric"><b>{valueText(metrics.reviewVelocity)}</b><span>Review velocity/day</span></div>
                </div>
                <h3 className="section-title">Top nearby places</h3>
                {topPlaces.slice(0, 5).map((place: any) => (
                  <div className="place" key={`${location.label}-${place.name}-${place.full_address || ''}`}>
                    <strong>{place.place_link ? <a href={place.place_link} target="_blank">{place.name}</a> : place.name}</strong>
                    <small>{place.rating ?? '—'} ★ · {(place.review_count ?? 0).toLocaleString()} reviews</small>
                    <small>{place.full_address}</small>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="panel account-card">
          <p className="kicker">Sampled reviews</p>
          <h2>Newest reviews stored</h2>
          <div className="comments">
            {reviews.length ? reviews.slice(0, 20).map((review: any, index: number) => (
              <div className="comment" key={`${review.location_label}-${review.place}-${index}`}>
                <strong>Place {review.location_label} · {review.place}</strong> · {review.rating ?? '—'} ★ · {review.review_date || 'recent'}
                {review.text_excerpt && <p>{review.text_excerpt}</p>}
              </div>
            )) : <p className="notice">No sampled reviews were stored for this comparison.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
