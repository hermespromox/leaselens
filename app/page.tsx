'use client';

import { useState } from 'react';

type Place = {
  name: string;
  rating?: number;
  review_count?: number;
  website?: string | null;
  full_address?: string;
  place_link?: string;
  types?: string[];
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
  sides: { A: Side; B: Side };
};

const examples = {
  a: 'Vieux-Port, Marseille',
  b: 'La Joliette, Marseille',
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
    <div className="panel">
      <h3>Place {side.label}</h3>
      <p className="notice">{side.input} · {side.coordinates.lat.toFixed(5)}, {side.coordinates.lng.toFixed(5)}</p>
      <div className="metrics">
        <Metric label="POIs found" value={side.metrics.poiCount ?? 0} />
        <Metric label="Avg rating" value={(side.metrics.avgRating ?? 0).toFixed(2)} />
        <Metric label="Total reviews" value={Math.round(side.metrics.totalReviews ?? 0).toLocaleString()} />
        <Metric label="Recent sampled" value={side.metrics.reviewsInWindow ?? 0} />
        <Metric label="Weak competitors" value={side.metrics.weakCompetitors ?? 0} />
        <Metric label="No website" value={side.metrics.noWebsite ?? 0} />
        <Metric label="Median reviews" value={Math.round(side.metrics.medianReviews ?? 0).toLocaleString()} />
        <Metric label="Activity index" value={(side.metrics.activityIndex ?? 0).toFixed(1)} />
      </div>
      <h3 style={{marginTop: 16}}>Top nearby places</h3>
      {side.topPlaces.slice(0, 6).map((p) => (
        <div className="place" key={`${side.label}-${p.name}-${p.full_address}`}>
          <strong>{p.place_link ? <a href={p.place_link} target="_blank">{p.name}</a> : p.name}</strong>
          <small>{p.rating ?? '—'} ★ · {(p.review_count ?? 0).toLocaleString()} reviews · {p.website || 'no website'}</small>
          <small>{p.full_address}</small>
        </div>
      ))}
      <h3 style={{marginTop: 16}}>Newest comments sampled</h3>
      <div className="comments">
        {side.recentComments.length ? side.recentComments.slice(0, 5).map((c, i) => (
          <div className="comment" key={i}>
            <strong>{c.place}</strong> · {c.rating ?? '—'} ★ · {c.date || 'recent'}<br />
            {c.text || 'No text review'}
          </div>
        )) : <p className="notice">No comments returned by the provider for the sampled places.</p>}
      </div>
    </div>
  );
}

export default function Home() {
  const [form, setForm] = useState({
    placeA: examples.a,
    placeB: examples.b,
    category: 'coffee shop',
    radiusMeters: '800',
    reviewWindowDays: '90',
    country: 'fr',
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
          reviewWindowDays: Number(form.reviewWindowDays),
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
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">LeaseLens · local opportunity compare</div>
        <h1>Compare two addresses before you sign.</h1>
        <p className="sub">Minimal market intelligence from nearby POIs: density, ratings, review volume, weak competitors and recent comments around Place A vs Place B.</p>
      </section>

      <section className="grid">
        <div className="panel">
          <form className="form" onSubmit={submit}>
            <label>Place A address or lat,lng
              <input value={form.placeA} onChange={e => setForm({...form, placeA: e.target.value})} placeholder="Vieux-Port, Marseille" required />
            </label>
            <label>Place B address or lat,lng
              <input value={form.placeB} onChange={e => setForm({...form, placeB: e.target.value})} placeholder="La Joliette, Marseille" required />
            </label>
            <label>Business/category
              <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="coffee shop, dentist, gym..." required />
            </label>
            <div className="row">
              <label>Radius
                <select value={form.radiusMeters} onChange={e => setForm({...form, radiusMeters: e.target.value})}>
                  <option value="300">300m</option>
                  <option value="500">500m</option>
                  <option value="800">800m</option>
                  <option value="1200">1.2km</option>
                  <option value="2000">2km</option>
                </select>
              </label>
              <label>Recent window
                <select value={form.reviewWindowDays} onChange={e => setForm({...form, reviewWindowDays: e.target.value})}>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="180">180 days</option>
                </select>
              </label>
            </div>
            <label>Country
              <input value={form.country} onChange={e => setForm({...form, country: e.target.value.toLowerCase()})} placeholder="fr" />
            </label>
            <button className="primary" disabled={loading}>{loading ? 'Scanning Maps data…' : 'Compare locations'}</button>
            <p className="notice">MVP: samples nearby places and newest reviews. Scores are decision support, not absolute footfall measurements.</p>
          </form>
        </div>

        <div className="results">
          {error && <div className="error">{error}</div>}
          {!result && !error && <div className="panel empty">Enter two addresses and a category to generate a quick A/B location report.</div>}
          {result && (
            <>
              <div className="panel">
                <div className="scoreboard">
                  <div className="score-card">
                    <div className="score-label">Place A score</div>
                    <div className="score">{result.sides.A.score}</div>
                  </div>
                  <div className="score-card">
                    <div className="score-label">Place B score</div>
                    <div className="score">{result.sides.B.score}</div>
                  </div>
                </div>
                <h2 style={{marginTop: 16}}>Winner: <span className="winner">{result.winner}</span></h2>
                <p className="sub">{result.summary}</p>
              </div>
              <div className="columns">
                <SideCard side={result.sides.A} />
                <SideCard side={result.sides.B} />
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
