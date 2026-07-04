import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getCurrentConfirmedUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type Coordinates = { lat: number; lng: number };
type GeocodeResult = { coordinates: Coordinates; displayAddress: string };
type NearbyPlace = {
  business_id: string;
  name: string;
  full_address?: string;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  rating?: number;
  review_count?: number;
  website?: string | null;
  place_link?: string;
  types?: string[];
};
type Review = {
  iso_date?: string;
  review_rate?: number;
  review_text?: string;
};
type AnalyzedSide = {
  label: 'A' | 'B';
  input: string;
  displayAddress: string;
  coordinates: Coordinates;
  score: number;
  metrics: Record<string, number>;
  topPlaces: NearbyPlace[];
  recentComments: Array<{ place: string; rating?: number; date?: string; text: string; distanceMeters?: number }>;
};
type ComparisonResult = {
  winner: string;
  summary: string;
  category: string;
  radiusMeters: number;
  reviewWindowDays: number;
  maxResults: number;
  sides: { A: AnalyzedSide; B: AnalyzedSide };
};

declare global {
  // eslint-disable-next-line no-var
  var leaselensPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var leaselensSchemaReady: Promise<void> | undefined;
}

const HOST = 'maps-data.p.rapidapi.com';
const BASE = `https://${HOST}`;
const REVIEW_SAMPLE_PLACE_LIMIT = 10;
const REVIEWS_PER_PLACE_LIMIT = 20;
const REVIEW_WINDOW_DAYS = 7;
const MAX_429_RETRIES = 3;
const ACTIVE_PLACE_MIN_REVIEWS = 50;
const MAPS_NEARBY_ZOOM = 15;
const ACTIVE_PLACE_DISTANCE_LIMIT_METERS = 1000;
const AREA_VISITORS_ROUNDING_STEP = 500;
const DEFAULT_CATEGORY = 'restaurant';
const ANON_BENCHMARK_LIMIT = 1;
const FREE_BENCHMARK_LIMIT = 5;
const ANON_COOKIE_NAME = 'asklizy_anon';
const ANON_COOKIE_SECRET = process.env.ANON_COOKIE_SECRET || 'asklizy-anon-signing-key-2024';

function signCookieValue(payload: string): string {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', ANON_COOKIE_SECRET);
  hmac.update(payload);
  return hmac.digest('hex');
}

function createAnonCookie(count: number): string {
  const payload = JSON.stringify({ c: count, ts: Date.now() });
  const encoded = Buffer.from(payload).toString('base64url');
  const sig = signCookieValue(encoded);
  return `${encoded}.${sig}`;
}

function verifyAnonCookie(raw: string | undefined): { count: number; valid: boolean } {
  if (!raw || !raw.includes('.')) return { count: 0, valid: false };
  const [encoded, sig] = raw.split('.');
  const expectedSig = signCookieValue(encoded);
  if (sig !== expectedSig) return { count: 0, valid: false };
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    return { count: Number(payload.c) || 0, valid: true };
  } catch {
    return { count: 0, valid: false };
  }
}

function hashIp(ip: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(ANON_COOKIE_SECRET + ip).digest('hex');
}

async function countAnonByIp(pool: Pool, ipHash: string): Promise<number> {
  try {
    await ensureLeaselenseSchema(pool);
    const res = await pool.query(
      `SELECT count(*) as cnt FROM leaselense.anon_benchmarks WHERE ip_hash = $1 AND created_at >= date_trunc('month', now())`,
      [ipHash]
    );
    return Number(res.rows[0]?.cnt) || 0;
  } catch {
    return 0;
  }
}

async function recordAnonBenchmark(pool: Pool, ipHash: string): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO leaselense.anon_benchmarks (ip_hash) VALUES ($1)`,
      [ipHash]
    );
  } catch (err) {
    console.warn('Failed to record anon benchmark:', err);
  }
}

async function countUserMonthlyBenchmarks(pool: Pool, userId: string): Promise<number> {
  try {
    const res = await pool.query(
      `SELECT count(*) as cnt FROM leaselense.comparisons WHERE user_id = $1 AND created_at >= date_trunc('month', now())`,
      [userId]
    );
    return Number(res.rows[0]?.cnt) || 0;
  } catch {
    return 0;
  }
}

function roundUpToNearest(value: number, step: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value / step) * step;
}

function rapidKey() {
  const key = process.env.RAPIDAPI_KEY || process.env.RAPID_MAPS_KEY;
  if (!key) throw new Error('Missing RAPIDAPI_KEY server environment variable.');
  return key;
}

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key };
}

async function saveComparisonToRest(criteria: Record<string, unknown>, result: Record<string, unknown>) {
  const config = supabaseConfig();
  if (!config) return null;

  try {
    const res = await fetch(`${config.url}/rest/v1/searches`, {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        url: 'leaselens:compare',
        criteria,
        result,
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(`Supabase save skipped: ${res.status} ${text.slice(0, 180)}`);
      return null;
    }

    const rows = await res.json();
    return Array.isArray(rows) ? rows[0]?.id ?? null : rows?.id ?? null;
  } catch (err) {
    console.warn('Supabase save skipped:', err);
    return null;
  }
}

function postgresPool() {
  const connectionString = process.env.LEASELENS_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!globalThis.leaselensPool) {
    globalThis.leaselensPool = new Pool({
      connectionString,
      max: 1,
      ssl: { rejectUnauthorized: false },
    });
  }
  return globalThis.leaselensPool;
}

async function ensureLeaselenseSchema(pool: Pool) {
  if (!globalThis.leaselensSchemaReady) {
    globalThis.leaselensSchemaReady = pool.query(`
      create schema if not exists leaselense;

      create table if not exists leaselense.comparisons (
        id bigserial primary key,
        created_at timestamptz not null default now(),
        user_id uuid references auth.users(id) on delete set null,
        place_a text not null,
        place_b text not null,
        category text not null,
        country text not null default 'fr',
        radius_meters integer not null,
        review_window_days integer not null,
        max_results integer not null,
        winner text not null,
        summary text not null,
        score_a integer,
        score_b integer,
        result jsonb not null
      );

      alter table leaselense.comparisons
      add column if not exists user_id uuid references auth.users(id) on delete set null;

      create table if not exists leaselense.comparison_locations (
        id bigserial primary key,
        comparison_id bigint not null references leaselense.comparisons(id) on delete cascade,
        label text not null check (label in ('A', 'B')),
        input text not null,
        latitude double precision,
        longitude double precision,
        score integer,
        metrics jsonb not null default '{}'::jsonb,
        top_places jsonb not null default '[]'::jsonb,
        recent_comments jsonb not null default '[]'::jsonb,
        created_at timestamptz not null default now(),
        unique (comparison_id, label)
      );

      create table if not exists leaselense.reviews_sampled (
        id bigserial primary key,
        comparison_id bigint not null references leaselense.comparisons(id) on delete cascade,
        location_label text not null check (location_label in ('A', 'B')),
        place text not null,
        rating numeric,
        review_date timestamptz,
        text_excerpt text,
        created_at timestamptz not null default now()
      );

      create table if not exists leaselense.anon_benchmarks (
        id bigserial primary key,
        ip_hash text not null,
        created_at timestamptz not null default now()
      );

      create index if not exists anon_benchmarks_ip_hash_idx on leaselense.anon_benchmarks (ip_hash, created_at desc);

      create index if not exists comparisons_created_at_idx on leaselense.comparisons (created_at desc);
      create index if not exists comparisons_category_idx on leaselense.comparisons (category);
      create index if not exists comparisons_user_id_created_at_idx on leaselense.comparisons (user_id, created_at desc);
      create index if not exists comparison_locations_comparison_id_idx on leaselense.comparison_locations (comparison_id);
      create index if not exists reviews_sampled_comparison_id_idx on leaselense.reviews_sampled (comparison_id);
    `).then(() => undefined);
  }
  return globalThis.leaselensSchemaReady;
}

async function saveComparisonToPostgres(criteria: Record<string, unknown>, result: ComparisonResult, userId: string | null) {
  const pool = postgresPool();
  if (!pool) return null;
  await ensureLeaselenseSchema(pool);
  const client = await pool.connect();
  try {
    await client.query('begin');
    const comparison = await client.query<{ id: number }>(`
      insert into leaselense.comparisons (
        user_id, place_a, place_b, category, country, radius_meters, review_window_days, max_results,
        winner, summary, score_a, score_b, result
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      returning id
    `, [
      userId,
      criteria.placeA,
      criteria.placeB,
      criteria.category,
      criteria.country,
      criteria.radiusMeters,
      criteria.reviewWindowDays,
      criteria.maxResults,
      result.winner,
      result.summary,
      result.sides.A.score,
      result.sides.B.score,
      JSON.stringify(result),
    ]);
    const comparisonId = comparison.rows[0].id;

    for (const side of [result.sides.A, result.sides.B]) {
      await client.query(`
        insert into leaselense.comparison_locations (
          comparison_id, label, input, latitude, longitude, score, metrics, top_places, recent_comments
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [
        comparisonId,
        side.label,
        side.input,
        side.coordinates.lat,
        side.coordinates.lng,
        side.score,
        JSON.stringify(side.metrics),
        JSON.stringify(side.topPlaces),
        JSON.stringify(side.recentComments),
      ]);

      for (const review of side.recentComments) {
        await client.query(`
          insert into leaselense.reviews_sampled (
            comparison_id, location_label, place, rating, review_date, text_excerpt
          ) values ($1,$2,$3,$4,$5,$6)
        `, [comparisonId, side.label, review.place, review.rating ?? null, review.date || null, review.text || null]);
      }
    }

    await client.query('commit');
    return comparisonId;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

async function saveComparison(criteria: Record<string, unknown>, result: ComparisonResult, userId: string | null) {
  try {
    const comparisonId = await saveComparisonToPostgres(criteria, result, userId);
    if (comparisonId) return { provider: 'postgres', id: comparisonId };
  } catch (err) {
    console.warn('Postgres save skipped:', err);
  }

  const restId = await saveComparisonToRest(criteria, result as unknown as Record<string, unknown>);
  return restId ? { provider: 'rest', id: restId } : null;
}

async function rapid(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(path, BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt += 1) {
    const res = await fetch(url.toString(), {
      headers: {
        'x-rapidapi-key': rapidKey(),
        'x-rapidapi-host': HOST,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { error: text.slice(0, 300) }; }
    if (res.ok) return data;
    if (res.status === 429 && attempt < MAX_429_RETRIES) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 650 * (attempt + 1);
      await sleep(waitMs);
      continue;
    }
    throw new Error(`Maps API ${res.status}: ${data?.message || data?.error || 'request failed'}`);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function distanceMeters(a: Coordinates, b: Coordinates) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * earthRadiusMeters * Math.asin(Math.sqrt(h)));
}

function withDistance(place: NearbyPlace, center: Coordinates): NearbyPlace {
  const lat = Number(place.latitude);
  const lng = Number(place.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return place;
  return { ...place, distanceMeters: distanceMeters(center, { lat, lng }) };
}

function parseCoordinates(input: string): Coordinates | null {
  const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function stringField(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function geocode(input: string, country: string): Promise<GeocodeResult> {
  const parsed = parseCoordinates(input);
  if (parsed) return { coordinates: parsed, displayAddress: input };
  const data = await rapid('/geocoding.php', { query: input, lang: 'en', country });
  const point = data?.data;
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error(`Could not geocode: ${input}`);
  const displayAddress = stringField(point?.full_address) || stringField(point?.formatted_address) || stringField(point?.address) || stringField(point?.name) || input;
  return { coordinates: { lat, lng }, displayAddress };
}

function median(nums: number[]) {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function daysSince(dateString?: string) {
  if (!dateString) return Infinity;
  const date = new Date(dateString.replace(' ', 'T') + 'Z');
  if (Number.isNaN(date.getTime())) return Infinity;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

function score(metrics: Record<string, number>) {
  const densityScore = Math.min(metrics.poiCount / 180, 1) * 22;
  const volumeScore = Math.min(metrics.totalReviews / 60000, 1) * 22;
  const reviewDepthScore = Math.min(metrics.medianReviews / 450, 1) * 10;
  const qualityScore = Math.min(Math.max((metrics.avgRating - 4.0) / 0.8, 0), 1) * 16;
  const velocityScore = Math.min(metrics.reviewVelocity / 0.8, 1) * 10;
  const activityScore = Math.min(metrics.activityIndex / 100, 1) * 20;
  return Math.round(densityScore + volumeScore + reviewDepthScore + qualityScore + velocityScore + activityScore);
}

async function getReviews(place: NearbyPlace, country: string, windowDays: number) {
  if (!place.business_id) return { reviews: [] as Review[], inWindow: 0 };
  try {
    const data = await rapid('/reviews.php', {
      business_id: place.business_id,
      country,
      lang: 'en',
      limit: REVIEWS_PER_PLACE_LIMIT,
      sort: 'Newest',
    });
    const reviews: Review[] = data?.data?.reviews || [];
    return { reviews, inWindow: reviews.filter((r) => daysSince(r.iso_date) <= windowDays).length };
  } catch {
    return { reviews: [] as Review[], inWindow: 0 };
  }
}

async function analyze(label: 'A' | 'B', input: string, category: string, radiusMeters: number, reviewWindowDays: number, country: string, maxResults: number) {
  const { coordinates, displayAddress } = await geocode(input, country);
  const nearby = await rapid('/nearby.php', {
    query: category,
    lat: coordinates.lat,
    lng: coordinates.lng,
    limit: maxResults,
    country,
    lang: 'en',
    offset: 0,
    zoom: MAPS_NEARBY_ZOOM,
  });
  const places: NearbyPlace[] = (nearby?.data || [])
    .filter((p: NearbyPlace) => p?.business_id)
    .map((p: NearbyPlace) => withDistance(p, coordinates));
  const activePlaces = places.filter((p) => (
    Number(p.review_count || 0) >= ACTIVE_PLACE_MIN_REVIEWS
    && Number.isFinite(p.distanceMeters)
    && Number(p.distanceMeters) <= ACTIVE_PLACE_DISTANCE_LIMIT_METERS
  ));
  const reviewSamplePlaces = [...activePlaces]
    .sort((a, b) => (b.review_count || 0) - (a.review_count || 0))
    .slice(0, REVIEW_SAMPLE_PLACE_LIMIT);

  const reviewResults = await Promise.all(reviewSamplePlaces.map((p) => getReviews(p, country, reviewWindowDays)));
  const recentComments = reviewResults.flatMap((res, index) => {
    const place = reviewSamplePlaces[index];
    return res.reviews
      .filter((r) => r.review_text || r.iso_date)
      .map((r) => ({
        place: place.name,
        rating: r.review_rate,
        date: r.iso_date,
        text: (r.review_text || '').slice(0, 260),
        distanceMeters: place.distanceMeters,
      }));
  }).sort((a, b) => (new Date(b.date || 0).getTime()) - (new Date(a.date || 0).getTime()));

  const ratings = activePlaces.map((p) => Number(p.rating)).filter(Number.isFinite);
  const reviewCounts = activePlaces.map((p) => Number(p.review_count || 0));
  const reviewsInWindow = reviewResults.reduce((sum, r) => sum + r.inWindow, 0);
  const totalReviews = reviewCounts.reduce((a, b) => a + b, 0);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  const reviewVelocity = reviewsInWindow / Math.max(reviewWindowDays, 1);
  const areaVisitorsPerDay = roundUpToNearest(reviewVelocity * 1000, AREA_VISITORS_ROUNDING_STEP);
  const reviewVelocityPerPlace = reviewVelocity / Math.max(reviewSamplePlaces.length, 1);
  const reviewSampleCapacity = reviewSamplePlaces.length * REVIEWS_PER_PLACE_LIMIT;
  const activityIndex = reviewSampleCapacity
    ? (reviewsInWindow / reviewSampleCapacity) * 100
    : 0;

  const metrics = {
    poiCount: activePlaces.length,
    activePoiCount: activePlaces.length,
    rawPoiCount: places.length,
    activePlaceMinReviews: ACTIVE_PLACE_MIN_REVIEWS,
    activePlaceDistanceLimitMeters: ACTIVE_PLACE_DISTANCE_LIMIT_METERS,
    avgRating: Number(avgRating.toFixed(3)),
    medianRating: Number(median(ratings).toFixed(3)),
    totalReviews,
    medianReviews: median(reviewCounts),
    reviewsInWindow,
    reviewSampleCapacity,
    reviewVelocity: Number(reviewVelocity.toFixed(3)),
    areaVisitorsPerDay,
    reviewVelocityPerPlace: Number(reviewVelocityPerPlace.toFixed(3)),
    activityIndex: Number(activityIndex.toFixed(1)),
  };

  return {
    label,
    input,
    displayAddress,
    coordinates,
    score: score(metrics),
    metrics,
    topPlaces: [...activePlaces]
      .sort((a, b) => (b.review_count || 0) - (a.review_count || 0))
      .slice(0, 5),
    recentComments: recentComments.slice(0, 20),
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentConfirmedUser();
    const body = await req.json();
    const placeA = String(body.placeA || '').trim();
    const placeB = String(body.placeB || '').trim();
    const category = String(body.category || '').trim() || DEFAULT_CATEGORY;
    const country = String(body.country || 'fr').toLowerCase().trim();
    const radiusMeters = Math.min(Math.max(Number(body.radiusMeters || 800), 300), 3000);
    const reviewWindowDays = REVIEW_WINDOW_DAYS;
    const maxResults = Math.min(Math.max(Number(body.maxResults || 100), 20), 500);
    if (!placeA || !placeB) return NextResponse.json({ error: 'Place A and Place B are required.' }, { status: 400 });

    // ── Rate limiting ──
    const pool = postgresPool();

    if (user) {
      if (pool) {
        const used = await countUserMonthlyBenchmarks(pool, user.id);
        if (used >= FREE_BENCHMARK_LIMIT) {
          return NextResponse.json({
            error: 'You have reached your free monthly limit of 5 benchmarks. Upgrade to a paid plan for more.',
            locked: true,
            limit: FREE_BENCHMARK_LIMIT,
            used,
          }, { status: 403 });
        }
      }
    } else {
      const anonCookie = req.cookies.get(ANON_COOKIE_NAME)?.value;
      const cookieData = verifyAnonCookie(anonCookie);
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0.0.0.0';
      const ipHash = hashIp(ip);

      let anonCount = cookieData.count;

      if (pool) {
        const ipCount = await countAnonByIp(pool, ipHash);
        anonCount = Math.max(anonCount, ipCount);
      }

      if (anonCount >= ANON_BENCHMARK_LIMIT) {
        return NextResponse.json({
          error: 'You have used your free benchmark. Create an account to get 5 benchmarks per month.',
          locked: true,
          limit: ANON_BENCHMARK_LIMIT,
        }, { status: 403 });
      }
    }

    const [A, B] = await Promise.all([
      analyze('A', placeA, category, radiusMeters, reviewWindowDays, country, maxResults),
      analyze('B', placeB, category, radiusMeters, reviewWindowDays, country, maxResults),
    ]);

    const winner = A.score === B.score ? 'Tie' : A.score > B.score ? 'A' : 'B';
    const better = winner === 'A' ? A : winner === 'B' ? B : null;
    const summary = better
      ? `${better.displayAddress || better.input} looks stronger for "${category}": ${better.metrics.poiCount} active nearby places within 1 km, ${better.metrics.totalReviews.toLocaleString()} total reviews, median ${Math.round(better.metrics.medianReviews).toLocaleString()} reviews per place, average rating ${better.metrics.avgRating.toFixed(2)}, about ${Math.round(better.metrics.areaVisitorsPerDay).toLocaleString()} estimated area visitors/day, and ${better.metrics.activityIndex.toFixed(1)}% recent review freshness.`
      : `The two locations are close. Compare active nearby places, total review volume, average rating, median review depth, estimated area visitors and activity index before deciding.`;

    const result: ComparisonResult = {
      winner,
      summary,
      category,
      radiusMeters,
      reviewWindowDays,
      maxResults,
      sides: { A, B },
    };
    const savedSearch = await saveComparison({
      placeA,
      placeB,
      category,
      country,
      radiusMeters,
      reviewWindowDays,
      maxResults,
    }, result, user?.id ?? null);

    // ── Increment anonymous counter ──
    let responseHeaders: Record<string, string> = {};
    if (!user && pool) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0.0.0.0';
      const ipHash = hashIp(ip);
      await recordAnonBenchmark(pool, ipHash);

      const anonCookie = req.cookies.get(ANON_COOKIE_NAME)?.value;
      const cookieData = verifyAnonCookie(anonCookie);
      const newCount = cookieData.count + 1;
      const cookieValue = createAnonCookie(newCount);
      responseHeaders['set-cookie'] = `${ANON_COOKIE_NAME}=${cookieValue}; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000; Path=/`;
    }

    const responseBody = {
      ...result,
      storage: {
        saved: Boolean(savedSearch),
        id: savedSearch?.id ?? null,
        provider: savedSearch?.provider ?? null,
      },
    };

    if (Object.keys(responseHeaders).length) {
      const response = NextResponse.json(responseBody);
      for (const [key, value] of Object.entries(responseHeaders)) {
        response.headers.set(key, value);
      }
      return response;
    }

    return NextResponse.json(responseBody);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
