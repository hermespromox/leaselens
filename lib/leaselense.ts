import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var leaseLensHistoryPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var leaseLensHistorySchemaReady: Promise<void> | undefined;
}

export type HistoryItem = {
  id: string;
  created_at: string;
  place_a: string;
  place_b: string;
  category: string;
  winner: string;
  summary: string;
  score_a: number | null;
  score_b: number | null;
};

export type WorkspaceSummary = {
  total: number;
  linked_count: number;
  last_comparison_at: string | null;
  winner_a: number;
  winner_b: number;
  ties: number;
  top_category: string | null;
};

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key };
}

async function fetchLeaselense<T>(path: string): Promise<T[]> {
  const config = supabaseConfig();
  if (!config) return [];
  const res = await fetch(`${config.url}/rest/v1/${path}`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Accept-Profile': 'leaselense',
      'Content-Profile': 'leaselense',
    },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows as T[] : [];
}

export function getLeaseLensPool(): Pool | null {
  const connectionString = process.env.LEASELENS_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!globalThis.leaseLensHistoryPool) {
    globalThis.leaseLensHistoryPool = new Pool({
      connectionString,
      max: 1,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
  }
  return globalThis.leaseLensHistoryPool;
}

export async function ensureLeaselenseUserSchema() {
  const pool = getLeaseLensPool();
  if (!pool) return;
  if (!globalThis.leaseLensHistorySchemaReady) {
    globalThis.leaseLensHistorySchemaReady = pool.query(`
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

      create index if not exists comparisons_created_at_idx on leaselense.comparisons (created_at desc);
      create index if not exists comparisons_category_idx on leaselense.comparisons (category);
      create index if not exists comparisons_user_id_created_at_idx on leaselense.comparisons (user_id, created_at desc);
    `).then(() => undefined);
  }
  return globalThis.leaseLensHistorySchemaReady;
}

function normalizeHistoryRow(row: any): HistoryItem {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    place_a: row.place_a,
    place_b: row.place_b,
    category: row.category,
    winner: row.winner,
    summary: row.summary,
    score_a: row.score_a ?? null,
    score_b: row.score_b ?? null,
  };
}

export async function getComparisonHistory(userId: string, limit = 50): Promise<HistoryItem[]> {
  const pool = getLeaseLensPool();
  if (pool) {
    try {
      await ensureLeaselenseUserSchema();
      const result = await pool.query<HistoryItem>(`
        select id::text, created_at::text, place_a, place_b, category, winner, summary, score_a, score_b
        from leaselense.comparisons
        where user_id = $1
        order by created_at desc
        limit $2
      `, [userId, limit]);
      return result.rows;
    } catch {
      // fall through to REST
    }
  }

  const rows = await fetchLeaselense<any>(
    `comparisons?select=id,created_at,place_a,place_b,category,winner,summary,score_a,score_b&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=${limit}`
  );
  return rows.map(normalizeHistoryRow);
}

export async function getWorkspaceSummary(userId: string): Promise<WorkspaceSummary> {
  const pool = getLeaseLensPool();
  if (pool) {
    try {
      await ensureLeaselenseUserSchema();
      const result = await pool.query<WorkspaceSummary>(`
        with user_comparisons as (
          select * from leaselense.comparisons where user_id = $1
        ), category_counts as (
          select category, count(*)::int as count
          from user_comparisons
          group by category
          order by count desc, category asc
          limit 1
        )
        select
          count(*)::int as total,
          count(user_id)::int as linked_count,
          max(created_at)::text as last_comparison_at,
          count(*) filter (where winner = 'A')::int as winner_a,
          count(*) filter (where winner = 'B')::int as winner_b,
          count(*) filter (where winner = 'Tie')::int as ties,
          (select category from category_counts) as top_category
        from user_comparisons
      `, [userId]);
      return result.rows[0] ?? { total: 0, linked_count: 0, last_comparison_at: null, winner_a: 0, winner_b: 0, ties: 0, top_category: null };
    } catch {
      // fall through to REST
    }
  }

  const rows = await fetchLeaselense<any>(
    `comparisons?select=created_at,winner,category,user_id&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`
  );
  const categoryCounts = new Map<string, number>();
  let winnerA = 0;
  let winnerB = 0;
  let ties = 0;
  for (const row of rows) {
    if (row.winner === 'A') winnerA += 1;
    else if (row.winner === 'B') winnerB += 1;
    else if (row.winner === 'Tie') ties += 1;
    if (row.category) categoryCounts.set(row.category, (categoryCounts.get(row.category) || 0) + 1);
  }
  const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
  return {
    total: rows.length,
    linked_count: rows.length,
    last_comparison_at: rows[0]?.created_at ? String(rows[0].created_at) : null,
    winner_a: winnerA,
    winner_b: winnerB,
    ties,
    top_category: topCategory,
  };
}

export async function getComparisonDetail(userId: string, id: string) {
  const pool = getLeaseLensPool();
  if (pool) {
    try {
      await ensureLeaselenseUserSchema();
      const comparison = await pool.query(`
        select id::text, created_at::text, place_a, place_b, category, country, radius_meters, review_window_days,
               max_results, winner, summary, score_a, score_b, result
        from leaselense.comparisons
        where id = $1 and user_id = $2
      `, [id, userId]);

      if (!comparison.rows[0]) return null;

      const locations = await pool.query(`
        select label, input, latitude, longitude, score, metrics, top_places, recent_comments
        from leaselense.comparison_locations
        where comparison_id = $1
        order by label asc
      `, [id]);

      const reviews = await pool.query(`
        select location_label, place, rating, review_date::text, text_excerpt
        from leaselense.reviews_sampled
        where comparison_id = $1
        order by review_date desc nulls last, id desc
        limit 80
      `, [id]);

      return { comparison: comparison.rows[0], locations: locations.rows, reviews: reviews.rows };
    } catch {
      // fall through to REST
    }
  }

  const comparisons = await fetchLeaselense<any>(
    `comparisons?select=id,created_at,place_a,place_b,category,country,radius_meters,review_window_days,max_results,winner,summary,score_a,score_b,result&id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`
  );
  const comparison = comparisons[0];
  if (!comparison) return null;

  const [locations, reviews] = await Promise.all([
    fetchLeaselense<any>(`comparison_locations?select=label,input,latitude,longitude,score,metrics,top_places,recent_comments&comparison_id=eq.${encodeURIComponent(id)}&order=label.asc`),
    fetchLeaselense<any>(`reviews_sampled?select=location_label,place,rating,review_date,text_excerpt&comparison_id=eq.${encodeURIComponent(id)}&order=review_date.desc.nullslast,id.desc&limit=80`),
  ]);

  return {
    comparison: { ...comparison, id: String(comparison.id), created_at: String(comparison.created_at) },
    locations,
    reviews: reviews.map((r) => ({ ...r, review_date: r.review_date ? String(r.review_date) : null })),
  };
}
