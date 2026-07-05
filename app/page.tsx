'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import { useLang } from '@/lib/useLang';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

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

function scoreStatus(lang: Lang, score: number) {
  if (score >= 80) return t(lang, 'result.scoreStrong');
  if (score >= 60) return t(lang, 'result.scoreGood');
  if (score >= 40) return t(lang, 'result.scoreMixed');
  return t(lang, 'result.scoreWeak');
}

function ScoreBar({ score }: { score: number }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className="score-bar" aria-label={`Score ${safeScore} / 100`}>
      <span style={{ width: `${safeScore}%` }} />
    </div>
  );
}

function ScoreCard({ side, lang }: { side: Side; lang: Lang }) {
  return (
    <div className="score-card">
      <div className="score-card-top">
        <span>{t(lang, 'result.place')} {side.label}</span>
        <b>{scoreStatus(lang, side.score)}</b>
      </div>
      <strong>{side.score}<small>/100</small></strong>
      <ScoreBar score={side.score} />
      <p>{side.displayAddress || side.input}</p>
    </div>
  );
}

function getWinnerAddress(result: Result | null, lang: Lang) {
  if (!result) return '';
  if (result.winner === 'Tie') return t(lang, 'result.tieBetween');
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

function SideCard({ side, lang }: { side: Side; lang: Lang }) {
  const displayedPlaces = side.topPlaces.filter((p) => withinDisplayDistance(p.distanceMeters));
  const displayedComments = side.recentComments.filter((c) => withinDisplayDistance(c.distanceMeters));
  const areaVisitorsPerDay = roundUpToNearest(side.metrics.areaVisitorsPerDay ?? (side.metrics.reviewVelocity ?? 0) * 1000, AREA_VISITORS_ROUNDING_STEP);

  return (
    <div className="panel result-card">
      <div className="place-title">
        <div>
          <p className="kicker">{t(lang, 'result.place')} {side.label}</p>
          <h3>{side.displayAddress || side.input}</h3>
        </div>
        <strong className="mini-score">{side.score}<small>/100</small></strong>
      </div>
      <ScoreBar score={side.score} />
      <p className="notice">{side.coordinates.lat.toFixed(5)}, {side.coordinates.lng.toFixed(5)}</p>
      <div className="metrics">
        <Metric label={t(lang, 'metric.activePoiCount')} value={side.metrics.activePoiCount ?? side.metrics.poiCount ?? 0} />
        <Metric label={t(lang, 'metric.avgRating')} value={(side.metrics.avgRating ?? 0).toFixed(2)} />
        <Metric label={t(lang, 'metric.totalReviews')} value={Math.round(side.metrics.totalReviews ?? 0).toLocaleString()} />
        <Metric label={t(lang, 'metric.areaVisitors')} value={areaVisitorsPerDay.toLocaleString()} suffix="/day" />
        <Metric label={t(lang, 'metric.medianReviews')} value={Math.round(side.metrics.medianReviews ?? 0).toLocaleString()} />
        <Metric label={t(lang, 'metric.activityIndex')} value={(side.metrics.activityIndex ?? 0).toFixed(1)} suffix="%" />
      </div>

      <h3 className="section-title">{t(lang, 'metric.topActivePlaces')}</h3>
      {displayedPlaces.length ? displayedPlaces.slice(0, 5).map((p) => (
        <div className="place" key={`${side.label}-${p.name}-${p.full_address}`}>
          <strong>{p.place_link ? <a href={p.place_link} target="_blank">{p.name}</a> : p.name}</strong>
          <small>{p.rating ?? '—'} ★ · {(p.review_count ?? 0).toLocaleString()} {t(lang, 'metric.reviews')}{displayDistance(p.distanceMeters) ? ` · ${displayDistance(p.distanceMeters)} ${t(lang, 'metric.away')}` : ''}</small>
          <small>{p.full_address}</small>
        </div>
      )) : <p className="notice">{t(lang, 'metric.noActivePlaces')}</p>}
      <h3 className="section-title">{t(lang, 'metric.newestReviews')}</h3>
      <div className="comments">
        {displayedComments.length ? displayedComments.slice(0, 5).map((c, i) => (
          <div className="comment" key={i}>
            <strong>{c.place}</strong> · {c.rating ?? '—'} ★ · {c.date || t(lang, 'metric.recent')}{displayDistance(c.distanceMeters) ? ` · ${displayDistance(c.distanceMeters)} ${t(lang, 'metric.away')}` : ''}
          </div>
        )) : <p className="notice">{t(lang, 'metric.noRecentReviews')}</p>}
      </div>
    </div>
  );
}

function customersList(lang: Lang) {
  return [
    t(lang, 'customers.brokers'),
    t(lang, 'customers.franchise'),
    t(lang, 'customers.founders'),
    t(lang, 'customers.hospitality'),
    t(lang, 'customers.seo'),
  ];
}

function methodSteps(lang: Lang) {
  return [
    [t(lang, 'method.step1Title'), t(lang, 'method.step1Desc')],
    [t(lang, 'method.step2Title'), t(lang, 'method.step2Desc')],
    [t(lang, 'method.step3Title'), t(lang, 'method.step3Desc')],
  ];
}

function tiers(lang: Lang) {
  return [
    { name: t(lang, 'pricing.free'), original: '', price: '€0', period: t(lang, 'pricing.perMonth'), desc: t(lang, 'pricing.freeDesc'), items: [t(lang, 'pricing.freeItem1'), t(lang, 'pricing.freeItem2'), t(lang, 'pricing.freeItem3'), t(lang, 'pricing.freeItem4')], popular: false },
    { name: t(lang, 'pricing.starter'), original: '€99', price: '€49', period: t(lang, 'pricing.perMonth'), desc: t(lang, 'pricing.starterDesc'), items: [t(lang, 'pricing.starterItem1'), t(lang, 'pricing.starterItem2'), t(lang, 'pricing.starterItem3'), t(lang, 'pricing.starterItem4')], popular: false },
    { name: t(lang, 'pricing.pro'), original: '€299', price: '€149', period: t(lang, 'pricing.perMonth'), desc: t(lang, 'pricing.proDesc'), items: [t(lang, 'pricing.proItem1'), t(lang, 'pricing.proItem2'), t(lang, 'pricing.proItem3'), t(lang, 'pricing.proItem4')], popular: true },
    { name: t(lang, 'pricing.studio'), original: '', price: 'Custom', period: '', desc: t(lang, 'pricing.studioDesc'), items: [t(lang, 'pricing.studioItem1'), t(lang, 'pricing.studioItem2'), t(lang, 'pricing.studioItem3'), t(lang, 'pricing.studioItem4')], popular: false },
  ];
}

const DEFAULT_RADIUS_METERS = 800;
const businessCategories = [
  { labelKey: 'cat.restaurant', value: 'restaurant' },
  { labelKey: 'cat.coffee', value: 'coffee shop' },
  { labelKey: 'cat.bakery', value: 'bakery' },
  { labelKey: 'cat.bar', value: 'bar' },
  { labelKey: 'cat.fastfood', value: 'fast food restaurant' },
  { labelKey: 'cat.grocery', value: 'supermarket' },
  { labelKey: 'cat.pharmacy', value: 'pharmacy' },
  { labelKey: 'cat.beauty', value: 'beauty salon' },
  { labelKey: 'cat.gym', value: 'gym' },
  { labelKey: 'cat.dentist', value: 'dentist' },
  { labelKey: 'cat.hotel', value: 'hotel' },
  { labelKey: 'cat.coworking', value: 'coworking space' },
];

export default function Home() {
  const { lang } = useLang();
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
  const winnerAddress = getWinnerAddress(result, lang);
  const customers = customersList(lang);
  const methodStepsArr = methodSteps(lang);
  const tiersArr = tiers(lang);

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
          setLockedMessage(data?.error || t(lang, 'error.reachedLimit'));
          setLoading(false);
          return;
        }
        throw new Error(data?.error || t(lang, 'error.benchmarkFailed'));
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, 'error.unexpected'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <NavBar active="compare" />

      <section id="top" className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow">{t(lang, 'hero.eyebrow')}</div>
          <h1>{t(lang, 'hero.title')}</h1>
          <p className="sub">{t(lang, 'hero.sub')}</p>
          <div className="hero-actions">
            <a className="primary-link" href="#compare">{t(lang, 'hero.runBenchmark')}</a>
            <a className="secondary-link" href="#pricing">{t(lang, 'hero.seePricing')}</a>
          </div>
          <div className="proof-row">
            <span>{t(lang, 'hero.upTo500')}</span><span>{t(lang, 'hero.recentReviews')}</span><span>{t(lang, 'hero.noCode')}</span>
          </div>
        </div>
        <div id="compare" className="panel form-panel">
          {locked ? (
            <div className="lock-screen">
              <span className="material-symbols-outlined lock-icon" aria-hidden="true">lock</span>
              <h3>{lockedMessage}</h3>
              {isLoggedIn ? (
                <>
                  <p className="notice">{t(lang, 'lock.reachedFreeLimit')}</p>
                  <div className="hero-actions" style={{ marginTop: 16 }}>
                    <a className="primary-link" href="#pricing">{t(lang, 'lock.upgradePlan')}</a>
                    <a className="secondary-link" href="/account">{t(lang, 'lock.myAccount')}</a>
                  </div>
                </>
              ) : (
                <>
                  <p className="notice">{t(lang, 'lock.createFreeDesc')}</p>
                  <div className="hero-actions" style={{ marginTop: 16 }}>
                    <a className="primary-link" href="/signup">{t(lang, 'lock.createFreeAccount')}</a>
                    <a className="secondary-link" href="/login">{t(lang, 'nav.login')}</a>
                  </div>
                </>
              )}
            </div>
          ) : (
          <form className="form" onSubmit={submit}>
            <label>{t(lang, 'form.placeA')}
              <input value={form.placeA} onChange={e => setForm({...form, placeA: e.target.value})} placeholder="30 rue Myrha, 75018 Paris" required />
            </label>
            <label>{t(lang, 'form.placeB')}
              <input value={form.placeB} onChange={e => setForm({...form, placeB: e.target.value})} placeholder="57 rue Montorgueil, 75002 Paris" required />
            </label>
            <label>{t(lang, 'form.businessCategory')}
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} required>
                {businessCategories.map(category => (
                  <option key={category.value} value={category.value}>{t(lang, category.labelKey)}</option>
                ))}
              </select>
            </label>
            <p className="notice">{t(lang, 'form.searchAreaNotice')}</p>
            <button className="primary" disabled={loading}>{loading ? t(lang, 'form.scanning') : t(lang, 'form.benchmarkLocations')}</button>
            {loading && (
              <div className="charge-loader" role="status" aria-live="polite">
                <div className="charge-copy">
                  <span>{t(lang, 'form.buildingBenchmark')}</span>
                  <strong>{t(lang, 'form.scanningPlaces')}</strong>
                </div>
                <div className="charge-track"><span /></div>
              </div>
            )}
            <p className="notice">{t(lang, 'form.exampleNotice')}</p>
          </form>
          )}
        </div>
      </section>

      <section className="shell results-wrap">
        {error && <div className="error">{error}</div>}
        {loading && (
          <div className="panel loading-panel" role="status" aria-live="polite">
            <div>
              <p className="kicker">{t(lang, 'result.liveScanRunning')}</p>
              <h3>{t(lang, 'result.chargingSignal')}</h3>
              <p className="notice">{t(lang, 'result.chargingNotice')}</p>
            </div>
            <div className="charge-track large"><span /></div>
          </div>
        )}
        {!loading && !result && !error && (
          <div className="panel empty-state">
            <span className="material-symbols-outlined empty-icon" aria-hidden="true">query_stats</span>
            <h3>{t(lang, 'result.noBenchmark')}</h3>
            <p className="notice">{t(lang, 'result.noBenchmarkDesc')}</p>
          </div>
        )}
        {result && (
          <>
            <div className="panel winner-panel">
              <div className="scoreboard">
                <ScoreCard side={result.sides.A} lang={lang} />
                <ScoreCard side={result.sides.B} lang={lang} />
              </div>
              <p className="kicker winner-kicker">{t(lang, 'result.recommendedLocation')}</p>
              <h2>{winnerAddress}</h2>
              <p>{result.summary}</p>
              <p className="notice save-notice">
                {result.storage?.saved
                  ? t(lang, 'result.savedToHistory')
                  : t(lang, 'result.saveToHistory')}
              </p>
              <div className="hero-actions compact-actions">
                <a className="secondary-link" href="/history">{t(lang, 'result.openHistory')}</a>
                <a className="secondary-link" href="/signup">{t(lang, 'result.createAccount')}</a>
              </div>
            </div>
            <div className="columns"><SideCard side={result.sides.A} lang={lang} /><SideCard side={result.sides.B} lang={lang} /></div>
          </>
        )}
      </section>

      <section id="product" className="shell section-grid">
        <div>
          <p className="kicker">{t(lang, 'product.kicker')}</p>
          <h2>{t(lang, 'product.title')}</h2>
          <p className="subtle">{t(lang, 'product.sub')}</p>
          <a className="secondary-link" href="#compare" style={{ marginTop: 22 }}>{t(lang, 'product.tryIt')}</a>
        </div>
        <div className="feature-grid">
          <div className="feature">
            <span className="feature-icon material-symbols-outlined" aria-hidden="true">query_stats</span>
            <b>{t(lang, 'product.demandProxy')}</b><span>{t(lang, 'product.demandProxyDesc')}</span>
          </div>
          <div className="feature">
            <span className="feature-icon material-symbols-outlined" aria-hidden="true">storefront</span>
            <b>{t(lang, 'product.marketPressure')}</b><span>{t(lang, 'product.marketPressureDesc')}</span>
          </div>
          <div className="feature">
            <span className="feature-icon material-symbols-outlined" aria-hidden="true">balance</span>
            <b>{t(lang, 'product.decisionReady')}</b><span>{t(lang, 'product.decisionReadyDesc')}</span>
          </div>
          <div className="feature">
            <span className="feature-icon material-symbols-outlined" aria-hidden="true">bolt</span>
            <b>{t(lang, 'product.fastReports')}</b><span>{t(lang, 'product.fastReportsDesc')}</span>
          </div>
        </div>
      </section>

      <section className="shell customers">
        <p className="kicker">{t(lang, 'customers.builtFor')}</p>
        <div className="logo-row">{customers.map(c => <span key={c}>{c}</span>)}</div>
      </section>

      <section className="shell method-grid">
        {methodStepsArr.map(([title, desc], index) => (
          <div className="panel method-step" key={title}>
            <span className="method-index">{index + 1}</span>
            <h3>{title}</h3>
            <p>{desc}</p>
          </div>
        ))}
      </section>

      <section id="pricing" className="shell pricing">
        <div className="center"><p className="kicker">{t(lang, 'pricing.kicker')}</p><h2>{t(lang, 'pricing.title')}</h2></div>
        <div className="pricing-grid">
          {tiersArr.map(tier => (
            <div className={`panel tier ${tier.popular ? 'tier-popular' : ''}`} key={tier.name}>
              {tier.popular && <span className="tier-badge">{t(lang, 'pricing.mostPopular')}</span>}
              <h3>{tier.name}</h3>
              <div className="tier-price">
                {tier.original && <span className="tier-original">{tier.original}</span>}
                <strong>{tier.price}</strong>
                {tier.period && <small>{tier.period}</small>}
              </div>
              <p>{tier.desc}</p>
              <ul>{tier.items.map(i => <li key={i}>{i}</li>)}</ul>
              <div className="tier-cta">
                <a className={tier.popular ? 'primary-link' : 'secondary-link'} href="/signup" style={{ width: '100%' }}>
                  {tier.price === 'Custom' ? t(lang, 'pricing.contactSales') : `${t(lang, 'pricing.choose')} ${tier.name}`}
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="legal" className="shell legal panel">
        <p className="kicker">{t(lang, 'legal.kicker')}</p>
        <h2>{t(lang, 'legal.title')}</h2>
        <p>{t(lang, 'legal.body')}</p>
      </section>

      <footer className="footer shell">
        <div className="footer-brand">
          <strong>AskLizy</strong>
          <p>{t(lang, 'footer.tagline')}</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <span>{t(lang, 'footer.product')}</span>
            <a href="#product">{t(lang, 'footer.features')}</a>
            <a href="#pricing">{t(lang, 'footer.pricing')}</a>
            <a href="/history">{t(lang, 'footer.history')}</a>
          </div>
          <div className="footer-col">
            <span>{t(lang, 'footer.account')}</span>
            <a href="/login">{t(lang, 'footer.login')}</a>
            <a href="/signup">{t(lang, 'footer.createAccount')}</a>
          </div>
          <div className="footer-col">
            <span>{t(lang, 'footer.legal')}</span>
            <a href="#legal">{t(lang, 'footer.legal')}</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
