'use client';

import { useState } from 'react';

type Place = {
  name: string;
  rating?: number;
  review_count?: number;
  website?: string | null;
  full_address?: string;
  place_link?: string;
};

type Side = {
  label: 'A' | 'B';
  input: string;
  coordinates: { lat: number; lng: number };
  score: number;
  metrics: Record<string, number>;
  topPlaces: Place[];
  recentComments: { place: string; rating?: number; date?: string; text: string }[];
};

type Result = {
  winner: 'A' | 'B' | 'Tie';
  summary: string;
  category: string;
  radiusMeters: number;
  reviewWindowDays: number;
  maxResults: number;
  sides: { A: Side; B: Side };
};

function Metric({ label, value, suffix = '' }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="metric">
      <b>{value}{suffix}</b>
      <span>{label}</span>
    </div>
  );
}

function SideCard({ side }: { side: Side }) {
  return (
    <div className="panel result-card">
      <div className="place-title">
        <div>
          <p className="kicker">Place {side.label}</p>
          <h3>{side.input}</h3>
        </div>
        <strong className="mini-score">{side.score}</strong>
      </div>
      <p className="notice">{side.coordinates.lat.toFixed(5)}, {side.coordinates.lng.toFixed(5)}</p>
      <div className="metrics">
        <Metric label="Nearby places" value={side.metrics.poiCount ?? 0} />
        <Metric label="Avg rating" value={(side.metrics.avgRating ?? 0).toFixed(2)} />
        <Metric label="Total reviews" value={Math.round(side.metrics.totalReviews ?? 0).toLocaleString()} />
        <Metric label="Review velocity" value={(side.metrics.reviewVelocity ?? 0).toFixed(2)} suffix="/day" />
        <Metric label="Median reviews" value={Math.round(side.metrics.medianReviews ?? 0).toLocaleString()} />
        <Metric label="Activity index" value={(side.metrics.activityIndex ?? 0).toFixed(1)} suffix="%" />
      </div>
      <p className="notice">Review velocity and Activity index use a fixed 7-day recent window. Activity index is the share of the newest review sample that falls inside those 7 days.</p>
      <h3 className="section-title">Top nearby places</h3>
      {side.topPlaces.slice(0, 5).map((p) => (
        <div className="place" key={`${side.label}-${p.name}-${p.full_address}`}>
          <strong>{p.place_link ? <a href={p.place_link} target="_blank">{p.name}</a> : p.name}</strong>
          <small>{p.rating ?? '—'} ★ · {(p.review_count ?? 0).toLocaleString()} reviews</small>
          <small>{p.full_address}</small>
        </div>
      ))}
      <h3 className="section-title">Newest reviews sampled</h3>
      <div className="comments">
        {side.recentComments.length ? side.recentComments.slice(0, 5).map((c, i) => (
          <div className="comment" key={i}>
            <strong>{c.place}</strong> · {c.rating ?? '—'} ★ · {c.date || 'recent'}
          </div>
        )) : <p className="notice">No recent review timestamps returned by the provider for sampled places.</p>}
      </div>
    </div>
  );
}

const customers = ['Local brokers', 'Franchise teams', 'Retail founders', 'Hospitality groups', 'SEO agencies'];
const testimonials = [
  ['“The fastest way to explain why one lease feels better than another.”', 'Commercial broker'],
  ['“Review velocity makes the market feel tangible before a site visit.”', 'Franchise operator'],
  ['“We use it to qualify local SEO territories in minutes.”', 'Growth agency'],
];
const tiers = [
  ['Starter', '€49', 'One-off location checks', ['10 comparisons', 'POI density', 'Review velocity', 'PDF-ready report view']],
  ['Pro', '€149', 'For brokers and operators', ['100 comparisons', 'Up to 500 POIs/search', 'Recent comments', 'CSV export soon']],
  ['Studio', 'Custom', 'For teams and APIs', ['Team workspace', 'Bulk address lists', 'White-label reports', 'Custom data providers']],
];

export default function Home() {
  const [form, setForm] = useState({
    placeA: '30 rue Myrha, 75018 Paris',
    placeB: '57 rue Montorgueil, 75002 Paris',
    category: 'restaurant',
    radiusMeters: '800',
    maxResults: '500',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          radiusMeters: Number(form.radiusMeters),
          reviewWindowDays: 7,
          maxResults: Number(form.maxResults),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Comparison failed');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <nav className="nav">
        <a className="brand" href="#top" aria-label="LeaseLens"><span aria-hidden="true" className="material-symbols-outlined logo-icon">alt_route</span><span>LeaseLens</span></a>
        <div>
          <a href="#product">Product</a>
          <a href="#pricing">Pricing</a>
          <a href="#legal">Legal</a>
        </div>
      </nav>

      <section id="top" className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow">Location intelligence for lease decisions</div>
          <h1>Compare two addresses before you sign.</h1>
          <p className="sub">LeaseLens turns nearby POIs, ratings, review volume and recent comment velocity into a clean A/B location report for founders, brokers and franchise teams.</p>
          <div className="hero-actions">
            <a className="primary-link" href="#compare">Run a comparison</a>
            <a className="secondary-link" href="#pricing">See pricing</a>
          </div>
          <div className="proof-row">
            <span>Up to 500 POIs</span><span>Recent reviews</span><span>No code</span>
          </div>
        </div>
        <div id="compare" className="panel form-panel">
          <form className="form" onSubmit={submit}>
            <label>Place A address or lat,lng
              <input value={form.placeA} onChange={e => setForm({...form, placeA: e.target.value})} placeholder="30 rue Myrha, 75018 Paris" required />
            </label>
            <label>Place B address or lat,lng
              <input value={form.placeB} onChange={e => setForm({...form, placeB: e.target.value})} placeholder="57 rue Montorgueil, 75002 Paris" required />
            </label>
            <label>Business/category
              <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="restaurant, coffee shop, dentist, gym..." required />
            </label>
            <label>Radius
              <select value={form.radiusMeters} onChange={e => setForm({...form, radiusMeters: e.target.value})}>
                <option value="300">300m</option>
                <option value="500">500m</option>
                <option value="800">800m</option>
                <option value="1200">1.2km</option>
                <option value="2000">2km</option>
                <option value="3000">3km</option>
              </select>
            </label>
            <button className="primary" disabled={loading}>{loading ? 'Scanning Maps data…' : 'Compare locations'}</button>
            <p className="notice">Example Paris restaurant comparison is pre-filled. Scores are decision support, not official footfall measurement. Review sampling stays limited for speed.</p>
          </form>
        </div>
      </section>

      <section className="shell results-wrap">
        {error && <div className="error">{error}</div>}
        {!result && !error && <div className="panel empty">Run the demo above to generate a live Place A vs Place B report.</div>}
        {result && (
          <>
            <div className="panel winner-panel">
              <div className="scoreboard">
                <div className="score-card"><span>Place A score</span><strong>{result.sides.A.score}</strong></div>
                <div className="score-card"><span>Place B score</span><strong>{result.sides.B.score}</strong></div>
              </div>
              <h2>Winner: <span>{result.winner}</span></h2>
              <p>{result.summary}</p>
            </div>
            <div className="columns"><SideCard side={result.sides.A} /><SideCard side={result.sides.B} /></div>
          </>
        )}
      </section>

      <section id="product" className="shell section-grid">
        <div>
          <p className="kicker">Product</p>
          <h2>From map noise to lease signal.</h2>
          <p className="subtle">Use local POI density, customer activity and review depth to defend a site recommendation before the lease is signed.</p>
        </div>
        <div className="feature-grid">
          <div className="feature"><b>Demand proxy</b><span>Total reviews and review velocity show where customers are active now.</span></div>
          <div className="feature"><b>Market pressure</b><span>See density, strong operators, review depth and rating quality around each address.</span></div>
          <div className="feature"><b>Decision-ready</b><span>Place A vs Place B scoring with the reasons behind the recommendation.</span></div>
          <div className="feature"><b>Fast reports</b><span>Designed for brokers, franchise teams, founders and agencies that need a quick answer.</span></div>
        </div>
      </section>

      <section className="shell customers">
        <p className="kicker">Built for</p>
        <div className="logo-row">{customers.map(c => <span key={c}>{c}</span>)}</div>
      </section>

      <section className="shell testimonial-grid">
        {testimonials.map(([quote, who]) => <div className="panel testimonial" key={quote}><p>{quote}</p><span>{who}</span></div>)}
      </section>

      <section id="pricing" className="shell pricing">
        <div className="center"><p className="kicker">Pricing</p><h2>Start with reports. Scale into a workflow.</h2></div>
        <div className="pricing-grid">
          {tiers.map(([name, price, desc, items]) => (
            <div className="panel tier" key={name as string}>
              <h3>{name}</h3><strong>{price}</strong><p>{desc}</p>
              <ul>{(items as string[]).map(i => <li key={i}>{i}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <section id="legal" className="shell legal panel">
        <p className="kicker">Mentions légales</p>
        <h2>Transparent by design.</h2>
        <p>LeaseLens is a decision-support prototype. It does not provide certified footfall, legal, real-estate or investment advice. Maps and review data are provided through third-party APIs and may be incomplete, delayed or rate-limited. Users should verify critical decisions with site visits, brokers, local market experts and official sources.</p>
        <p>No API key is exposed in the browser; requests run server-side through environment variables.</p>
      </section>

      <footer className="footer shell">
        <strong>LeaseLens</strong>
        <span>Compare locations before you sign.</span>
      </footer>
    </main>
  );
}
