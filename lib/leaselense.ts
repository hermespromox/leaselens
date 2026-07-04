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

export function getLeaseLensPool() {
  const connectionString = process.env.LEASELENS_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Missing LEASELENS_DATABASE_URL or DATABASE_URL.');
  if (!globalThis.leaseLensHistoryPool) {
    globalThis.leaseLensHistoryPool = new Pool({
      connectionString,
      max: 1,
      ssl: { rejectUnauthorized: false },
    });
  }
  return globalThis.leaseLensHistoryPool;
}

export async function ensureLeaselenseUserSchema() {
  const pool = getLeaseLensPool();
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

export async function getComparisonHistory(userId: string, limit = 50): Promise<HistoryItem[]> {
  await ensureLeaselenseUserSchema();
  const pool = getLeaseLensPool();
  const result = await pool.query<HistoryItem>(`
    select id::text, created_at::text, place_a, place_b, category, winner, summary, score_a, score_b
    from leaselense.comparisons
    where user_id = $1
    order by created_at desc
    limit $2
  `, [userId, limit]);
  return result.rows;
}

export async function getComparisonDetail(userId: string, id: string) {
  await ensureLeaselenseUserSchema();
  const pool = getLeaseLensPool();
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
}
