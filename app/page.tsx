'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';

type Place = {
  name: string;
  rating?: number;
  review_count?: number;
  website?: string | null;
  full_address?: string;
  place_link?: string;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
};

type Side = {
  label: 'A' | 'B';
  input: string;
  displayAddress?: string;
  coordinates: { lat: number; lng: number };
  score: number;
  metrics: Record<string, number>;
  topPlaces: Place[];
  recentComments: { place: string; rating?: number; date?: string; text: string; distanceMeters?: number }[];
};

type Result = {
  winner: 'A' | 'B' | 'Tie';
  summary: string;
  category: string;
  radiusMeters: number;
  reviewWindowDays: number;
  maxResults: number;
  sides: { A: Side; B: Side };
  storage?: { saved: boolean; id: string | number | null; provider: string | null };
};

function Metric({ label, value, suffix = '' }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="metric">
      <b>{value}{suffix}</b>
      <span>{label}</span>
    </div>
  );
}

function scoreStatus(score: number) {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Mixed';
  return 'Weak';
}

function ScoreBar({ score }: { score: number }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className="score-bar" aria-label={`Score ${safeScore} / 100`}>
      <span style={{ width: `${safeScore}%` }} />
    </div>
  );
}

function ScoreCard({ side }: { side: Side }) {
  return (
    <div className="score-card">
      <div className="score-card-top">
        <span>Place {side.label}</span>
        <b>{scoreStatus(side.score)}</b>
      </div>
      <strong>{side.score}<small>/100</small></strong>
      <ScoreBar score={side.score} />
      <p>{side.displayAddress || side.input}</p>
    </div>
  );
}

function getWinnerAddress(result: Result | null) {
  if (!result) return '';
  if (result.winner === 'Tie') return 'Tie between both addresses';
  const side = result.sides[result.winner];
  return side.displayAddress || side.input;
}

const DISPLAY_DISTANCE_LIMIT_METERS = 1000;
const AREA_VISITORS_ROUNDING_STEP = 500;

function roundUpToNearest(value: number, step: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value / step) * step;
}

function displayDistance(meters?: number) {
  if (!Number.isFinite(meters)) return null;
  return meters! >= 1000 ? `${(meters! / 1000).toFixed(1)} km` : `${Math.round(meters!)} m`;
}

function withinDisplayDistance(meters?: number) {
  return !Number.isFinite(meters) || meters! <= DISPLAY_DISTANCE_LIMIT_METERS;
}

function SideCard({ side }: { side: Side }) {
  const displayedPlaces = side.topPlaces.filter((p) => withinDisplayDistance(p.distanceMeters));
  const displayedComments = side.recentComments.filter((c) => withinDisplayDistance(c.distanceMeters));
  const areaVisitorsPerDay = roundUpToNearest(side.metrics.areaVisitorsPerDay ?? (side.metrics.reviewVelocity ?? 0) * 1000, AREA_VISITORS_ROUNDING_STEP);

  return (
    <div className="panel result-card">
      <div className="place-title">
        <div>
          <p className="kicker">Place {side.label}</p>
          <h3>{side.displayAddress || side.input}</h3>
        </div>
        <strong className="mini-score">{side.score}<small>/100</small></strong>
      </div>
      <ScoreBar score={side.score} />
      <p className="notice">{side.coordinates.lat.toFixed(5)}, {side.coordinates.lng.toFixed(5)}</p>
      <div className="metrics">
        <Metric label="Active nearby places" value={side.metrics.activePoiCount ?? side.metrics.poiCount ?? 0} />
        <Metric label="Avg rating" value={(side.metrics.avgRating ?? 0).toFixed(2)} />
        <Metric label="Total reviews" value={Math.round(side.metrics.totalReviews ?? 0).toLocaleString()} />
        <Metric label="Area visitors" value={areaVisitorsPerDay.toLocaleString()} suffix="/day" />
        <Metric label="Median reviews" value={Math.round(side.metrics.medianReviews ?? 0).toLocaleString()} />
        <Metric label="Activity index" value={(side.metrics.activityIndex ?? 0).toFixed(1)} suffix="%" />
      </div>

      <h3 className="section-title">Top active nearby places</h3>
      {displayedPlaces.length ? displayedPlaces.slice(0, 5).map((p) => (
        <div className="place" key={`${side.label}-${p.name}-${p.full_address}`}>
          <strong>{p.place_link ? <a href={p.place_link} target="_blank">{p.name}</a> : p.name}</strong>
          <small>{p.rating ?? '—'} ★ · {(p.review_count ?? 0).toLocaleString()} reviews{displayDistance(p.distanceMeters) ? ` · ${displayDistance(p.distanceMeters)} away` : ''}</small>
          <small>{p.full_address}</small>
        </div>
      )) : <p className="notice">No active nearby places with at least 50 reviews within 1 km of this address.</p>}
      <h3 className="section-title">Newest reviews sampled</h3>
      <div className="comments">
        {displayedComments.length ? displayedComments.slice(0, 5).map((c, i) => (
          <div className="comment" key={i}>
            <strong>{c.place}</strong> · {c.rating ?? '—'} ★ · {c.date || 'recent'}{displayDistance(c.distanceMeters) ? ` · ${displayDistance(c.distanceMeters)} away` : ''}
          </div>
        )) : <p className="notice">No recent review timestamps returned by displayed places within 1 km.</p>}
      </div>
    </div>
  );
}

const customersList = [
  'Brokers',
  'Franchise teams',
  'Retail founders',
  'Hospitality groups',
  'SEO agencies',
];

const methodSteps = [
  ['We scan active nearby places', 'For each address, AskLizy pulls points of interest matching your chosen category, then counts only places within 1 km with at least 50 reviews.'],
  ['We sample the newest reviews', 'The most-reviewed nearby places are sampled for their most recent review timestamps to gauge current activity, not just historical volume.'],
  ['We score and compare', 'Active place density, rating quality, review depth, estimated area visitors and activity index are combined into one score per address so you can see which location wins, and why.'],
];

const tiers = [
  { name: 'Free', original: '', price: '€0', period: '/mo', desc: 'Try it out', items: ['10 benchmarks / month', 'Active POI density', 'Area visitors/day', 'Report view'], popular: false },
  { name: 'Starter', original: '', price: '€99', period: '/mo HT', desc: 'One-off location checks', items: ['500 benchmarks / month', 'Active POI density', 'Area visitors/day', 'Report view'], popular: false },
  { name: 'Pro', original: '', price: '€149', period: '/mo HT', desc: 'For brokers and operators', items: ['1,500 benchmarks / month', 'Up to 500 POIs/search', 'Recent comments', 'Saved history'], popular: true },
  { name: 'Studio', original: '', price: 'Custom', period: '', desc: 'For teams and APIs', items: ['Team workspace', 'Bulk address lists', 'White-label reports', 'Custom data providers'], popular: false },
];

const DEFAULT_RADIUS_METERS = 800;
const businessCategories = [
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Coffee shop', value: 'coffee shop' },
  { label: 'Bakery', value: 'bakery' },
  { label: 'Bar', value: 'bar' },
  { label: 'Fast food', value: 'fast food restaurant' },
  { label: 'Grocery / supermarket', value: 'supermarket' },
  { label: 'Pharmacy', value: 'pharmacy' },
  { label: 'Beauty salon', value: 'beauty salon' },
  { label: 'Gym / fitness', value: 'gym' },
  { label: 'Dentist', value: 'dentist' },
  { label: 'Hotel', value: 'hotel' },
  { label: 'Coworking', value: 'coworking space' },
];

export default function Home() {
  const [form, setForm] = useState({
    placeA: '30 rue Myrha, 75018 Paris',
    placeB: '57 rue Montorgueil, 75002 Paris',
    category: 'restaurant',
    maxResults: '500',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [lockedMessage, setLockedMessage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch('/api/session').then(r => r.json()).then(data => {
      setIsLoggedIn(Boolean(data?.loggedIn && data?.confirmed));
    }).catch(() => {});
  }, []);
  const winnerAddress = getWinnerAddress(result);

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
          radiusMeters: DEFAULT_RADIUS_METERS,
          reviewWindowDays: 7,
          maxResults: Number(form.maxResults),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data?.locked) {
          setLocked(true);
          setLockedMessage(data?.error || 'You have reached your limit.');
          setLoading(false);
          return;
        }
        throw new Error(data?.error || 'Benchmark failed');
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <NavBar active="compare" />

      <section id="top" className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow">AI location intelligence for lease decisions</div>
          <h1>Ask Lizy before you sign the lease.</h1>
          <p className="sub">Compare two addresses and instantly understand footfall signals, nearby competition, reviews, ratings and local demand before committing to a location.</p>
          <div className="hero-actions">
            <a className="primary-link" href="#compare">Run a benchmark</a>
            <a className="secondary-link" href="#pricing">See pricing</a>
          </div>
          <div className="proof-row">
            <span>Up to 500 POIs</span><span>Recent reviews</span><span>No code</span>
          </div>
        </div>
        <div id="compare" className="panel form-panel">
          {locked ? (
            <div className="lock-screen">
              <span className="material-symbols-outlined lock-icon" aria-hidden="true">lock</span>
              <h3>{lockedMessage}</h3>
              {isLoggedIn ? (
                <>
                  <p className="notice">You have reached your free plan limit. Upgrade to a paid plan for more benchmarks.</p>
                  <div className="hero-actions" style={{ marginTop: 16 }}>
                    <a className="primary-link" href="#pricing">Upgrade plan</a>
                    <a className="secondary-link" href="/account">My account</a>
                  </div>
                </>
              ) : (
                <>
                  <p className="notice">Create a free account to get 5 benchmarks per month, or choose a paid plan for more.</p>
                  <div className="hero-actions" style={{ marginTop: 16 }}>
                    <a className="primary-link" href="/signup">Create free account</a>
                    <a className="secondary-link" href="/login">Log in</a>
                  </div>
                </>
              )}
            </div>
          ) : (
          <form className="form" onSubmit={submit}>
            <label>Place A address or lat,lng
              <input value={form.placeA} onChange={e => setForm({...form, placeA: e.target.value})} placeholder="30 rue Myrha, 75018 Paris" required />
            </label>
            <label>Place B address or lat,lng
              <input value={form.placeB} onChange={e => setForm({...form, placeB: e.target.value})} placeholder="57 rue Montorgueil, 75002 Paris" required />
            </label>
            <label>Business/category
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} required>
                {businessCategories.map(category => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </label>
            <p className="notice">Search area is fixed at 800m for consistent, apples-to-apples benchmarks.</p>
            <button className="primary" disabled={loading}>{loading ? 'Scanning Maps data…' : 'Benchmark locations'}</button>
            {loading && (
              <div className="charge-loader" role="status" aria-live="polite">
                <div className="charge-copy">
                  <span>Building benchmark</span>
                  <strong>Scanning places, reviews and activity signals…</strong>
                </div>
                <div className="charge-track"><span /></div>
              </div>
            )}
            <p className="notice">Example Paris restaurant benchmark is pre-filled. Scores are decision support, not official footfall measurement.</p>
          </form>
          )}
        </div>
      </section>

      <section className="shell results-wrap">
        {error && <div className="error">{error}</div>}
        {loading && (
          <div className="panel loading-panel" role="status" aria-live="polite">
            <div>
              <p className="kicker">Live scan running</p>
              <h3>Charging the location signal…</h3>
              <p className="notice">This usually takes a few seconds while AskLizy fetches active nearby places and newest review timestamps.</p>
            </div>
            <div className="charge-track large"><span /></div>
          </div>
        )}
        {!loading && !result && !error && (
          <div className="panel empty-state">
            <span className="material-symbols-outlined empty-icon" aria-hidden="true">query_stats</span>
            <h3>No benchmark yet</h3>
            <p className="notice">Fill in two addresses above and pick a category — your Place A vs Place B report will appear here in a few seconds.</p>
          </div>
        )}
        {result && (
          <>
            <div className="panel winner-panel">
              <div className="scoreboard">
                <ScoreCard side={result.sides.A} />
                <ScoreCard side={result.sides.B} />
              </div>
              <p className="kicker winner-kicker">Recommended location</p>
              <h2>{winnerAddress}</h2>
              <p>{result.summary}</p>
              <p className="notice save-notice">
                {result.storage?.saved
                  ? 'This benchmark is saved to your history.'
                  : 'Create an account or log in to save benchmarks to your history.'}
              </p>
              <div className="hero-actions compact-actions">
                <a className="secondary-link" href="/history">Open history</a>
                <a className="secondary-link" href="/signup">Create account</a>
              </div>
            </div>
            <div className="columns"><SideCard side={result.sides.A} /><SideCard side={result.sides.B} /></div>
          </>
        )}
      </section>

      <section id="product" className="shell section-grid">
        <div>
          <p className="kicker">Product</p>
          <h2>From map noise to lease signal.</h2>
          <p className="subtle">Use active local POI density, customer activity and review depth to defend a site recommendation before the lease is signed.</p>
          <a className="secondary-link" href="#compare" style={{ marginTop: 22 }}>Try it on your own addresses</a>
        </div>
        <div className="feature-grid">
          <div className="feature">
            <span className="feature-icon material-symbols-outlined" aria-hidden="true">query_stats</span>
            <b>Demand proxy</b><span>Total reviews and estimated area visitors show where customers are active now.</span>
          </div>
          <div className="feature">
            <span className="feature-icon material-symbols-outlined" aria-hidden="true">storefront</span>
            <b>Market pressure</b><span>See density, strong operators, review depth and rating quality around each address.</span>
          </div>
          <div className="feature">
            <span className="feature-icon material-symbols-outlined" aria-hidden="true">balance</span>
            <b>Decision-ready</b><span>Place A vs Place B scoring with the reasons behind the recommendation.</span>
          </div>
          <div className="feature">
            <span className="feature-icon material-symbols-outlined" aria-hidden="true">bolt</span>
            <b>Fast reports</b><span>Designed for brokers, franchise teams, founders and agencies that need a quick answer.</span>
          </div>
        </div>
      </section>

      <section className="shell customers">
        <p className="kicker">Built for</p>
        <div className="logo-row">{customersList.map(c => <span key={c}>{c}</span>)}</div>
      </section>

      <section className="shell method-grid">
        {methodSteps.map(([title, desc], index) => (
          <div className="panel method-step" key={title}>
            <span className="method-index">{index + 1}</span>
            <h3>{title}</h3>
            <p>{desc}</p>
          </div>
        ))}
      </section>

      <section id="pricing" className="shell pricing">
        <div className="center"><p className="kicker">Pricing</p><h2>Start with reports. Scale into a workflow.</h2></div>
        <div className="pricing-grid">
          {tiers.map(tier => (
            <div className={`panel tier ${tier.popular ? 'tier-popular' : ''}`} key={tier.name}>
              {tier.popular && <span className="tier-badge">Most popular</span>}
              <h3>{tier.name}</h3>
              <div className="tier-price">
                {tier.original && <span className="tier-original">{tier.original}</span>}
                <strong>{tier.price}</strong>
                {tier.period && <small>{tier.period}</small>}
              </div>
              <p>{tier.desc}</p>
              <ul>{tier.items.map(i => <li key={i}>{i}</li>)}</ul>
              <div className="tier-cta">
                {tier.price === 'Custom' ? (
                  <a className="secondary-link" href="mailto:hello@asklizy.com" style={{ width: '100%' }}>
                    Contact sales
                  </a>
                ) : tier.name === 'Free' ? (
                  <a className="secondary-link" href="/signup" style={{ width: '100%' }}>
                    Choose Free
                  </a>
                ) : (
                  <form action="/api/stripe/checkout" method="POST" style={{ width: '100%' }}>
                    <input type="hidden" name="plan" value={tier.name.toLowerCase()} />
                    <button type="submit" className={tier.popular ? 'primary-link' : 'secondary-link'} style={{ width: '100%', border: 'none', cursor: 'pointer', fontSize: 'inherit', padding: '10px 16px', borderRadius: 12 }}>
                      Choose {tier.name}
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="legal" className="shell legal panel">
        <p className="kicker">Legal</p>
        <h2>Transparent by design.</h2>
        <p>AskLizy is a decision-support tool. It does not provide certified footfall, legal, real-estate or investment advice. Maps and review data are provided through third-party APIs and may be incomplete, delayed or rate-limited. Users should verify critical decisions with site visits, brokers, local market experts and official sources.</p>
      </section>

      <footer className="footer shell">
        <div className="footer-brand">
          <strong>AskLizy</strong>
          <p>Ask Lizy before you sign the lease. AI location intelligence for lease decisions, built for brokers, franchise teams and founders.</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <span>Product</span>
            <a href="#product">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="/history">History</a>
          </div>
          <div className="footer-col">
            <span>Account</span>
            <a href="/login">Log in</a>
            <a href="/signup">Create account</a>
          </div>
          <div className="footer-col">
            <span>Legal</span>
            <a href="#legal">Legal</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
