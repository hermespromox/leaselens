import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Coordinates = { lat: number; lng: number };
type NearbyPlace = {
  business_id: string;
  name: string;
  full_address?: string;
  latitude?: number;
  longitude?: number;
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

const HOST = 'maps-data.p.rapidapi.com';
const BASE = `https://${HOST}`;

function rapidKey() {
  const key = process.env.RAPIDAPI_KEY || process.env.RAPID_MAPS_KEY;
  if (!key) throw new Error('Missing RAPIDAPI_KEY server environment variable.');
  return key;
}

async function rapid(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(path, BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
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
  if (!res.ok) throw new Error(`Maps API ${res.status}: ${data?.message || data?.error || 'request failed'}`);
  return data;
}

function parseCoordinates(input: string): Coordinates | null {
  const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function geocode(input: string, country: string): Promise<Coordinates> {
  const parsed = parseCoordinates(input);
  if (parsed) return parsed;
  const data = await rapid('/geocoding.php', { query: input, lang: 'en', country });
  const point = data?.data;
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error(`Could not geocode: ${input}`);
  return { lat, lng };
}

function zoomForRadius(radius: number) {
  if (radius <= 300) return 16;
  if (radius <= 500) return 15;
  if (radius <= 900) return 14;
  if (radius <= 1500) return 13;
  return 12;
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
  const densityScore = Math.min(metrics.poiCount / 25, 1) * 24;
  const volumeScore = Math.min(metrics.totalReviews / 15000, 1) * 20;
  const velocityScore = Math.min(metrics.reviewsInWindow / 35, 1) * 24;
  const weakOpportunityScore = Math.min(metrics.weakCompetitors / 8, 1) * 14;
  const websiteGapScore = Math.min(metrics.noWebsite / 8, 1) * 8;
  const qualityScore = Math.min(Math.max((metrics.avgRating - 3.6) / 1.2, 0), 1) * 10;
  return Math.round(densityScore + volumeScore + velocityScore + weakOpportunityScore + websiteGapScore + qualityScore);
}

async function getReviews(place: NearbyPlace, country: string, windowDays: number) {
  if (!place.business_id) return { reviews: [] as Review[], inWindow: 0 };
  try {
    const data = await rapid('/reviews.php', {
      business_id: place.business_id,
      country,
      lang: 'en',
      limit: 5,
      sort: 'Newest',
    });
    const reviews: Review[] = data?.data?.reviews || [];
    return { reviews, inWindow: reviews.filter((r) => daysSince(r.iso_date) <= windowDays).length };
  } catch {
    return { reviews: [] as Review[], inWindow: 0 };
  }
}

async function analyze(label: 'A' | 'B', input: string, category: string, radiusMeters: number, reviewWindowDays: number, country: string) {
  const coordinates = await geocode(input, country);
  const nearby = await rapid('/nearby.php', {
    query: category,
    lat: coordinates.lat,
    lng: coordinates.lng,
    limit: 20,
    country,
    lang: 'en',
    offset: 0,
    zoom: zoomForRadius(radiusMeters),
  });
  const places: NearbyPlace[] = (nearby?.data || []).filter((p: NearbyPlace) => p?.business_id);
  const reviewSamplePlaces = [...places]
    .sort((a, b) => (b.review_count || 0) - (a.review_count || 0))
    .slice(0, 4);

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
      }));
  }).sort((a, b) => (new Date(b.date || 0).getTime()) - (new Date(a.date || 0).getTime()));

  const ratings = places.map((p) => Number(p.rating)).filter(Number.isFinite);
  const reviewCounts = places.map((p) => Number(p.review_count || 0));
  const reviewsInWindow = reviewResults.reduce((sum, r) => sum + r.inWindow, 0);
  const weakCompetitors = places.filter((p) => Number(p.rating || 0) < 4 && Number(p.review_count || 0) >= 20).length;
  const noWebsite = places.filter((p) => !p.website).length;
  const totalReviews = reviewCounts.reduce((a, b) => a + b, 0);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  const metrics = {
    poiCount: places.length,
    avgRating: Number(avgRating.toFixed(3)),
    medianRating: Number(median(ratings).toFixed(3)),
    totalReviews,
    medianReviews: median(reviewCounts),
    reviewsInWindow,
    weakCompetitors,
    noWebsite,
    activityIndex: Number(((reviewsInWindow / Math.max(reviewSamplePlaces.length, 1)) * 10).toFixed(2)),
  };

  return {
    label,
    input,
    coordinates,
    score: score(metrics),
    metrics,
    topPlaces: [...places]
      .sort((a, b) => ((b.rating || 0) * Math.log((b.review_count || 0) + 2)) - ((a.rating || 0) * Math.log((a.review_count || 0) + 2)))
      .slice(0, 8),
    recentComments: recentComments.slice(0, 10),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const placeA = String(body.placeA || '').trim();
    const placeB = String(body.placeB || '').trim();
    const category = String(body.category || '').trim() || 'restaurant';
    const country = String(body.country || 'fr').toLowerCase().trim();
    const radiusMeters = Math.min(Math.max(Number(body.radiusMeters || 800), 300), 3000);
    const reviewWindowDays = Math.min(Math.max(Number(body.reviewWindowDays || 90), 7), 365);
    if (!placeA || !placeB) return NextResponse.json({ error: 'Place A and Place B are required.' }, { status: 400 });

    const [A, B] = await Promise.all([
      analyze('A', placeA, category, radiusMeters, reviewWindowDays, country),
      analyze('B', placeB, category, radiusMeters, reviewWindowDays, country),
    ]);

    const winner = A.score === B.score ? 'Tie' : A.score > B.score ? 'A' : 'B';
    const better = winner === 'A' ? A : winner === 'B' ? B : null;
    const summary = better
      ? `Place ${winner} looks stronger for “${category}”: ${better.metrics.poiCount} nearby POIs, ${better.metrics.totalReviews.toLocaleString()} total reviews, ${better.metrics.reviewsInWindow} newest sampled reviews inside ${reviewWindowDays} days, and ${better.metrics.weakCompetitors} weak competitors.`
      : `The two locations are close. Compare the mix of weak competitors, review velocity and category density before deciding.`;

    return NextResponse.json({
      winner,
      summary,
      category,
      radiusMeters,
      reviewWindowDays,
      sides: { A, B },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
