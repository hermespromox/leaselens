import pg from 'pg';

const connectionString = process.env.LEASELENS_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing LEASELENS_DATABASE_URL or DATABASE_URL');
  process.exit(1);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

const ddl = `
create schema if not exists leaselense;

create table if not exists leaselense.comparisons (
  id bigserial primary key,
  created_at timestamptz not null default now(),
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

create index if not exists comparisons_created_at_idx on leaselense.comparisons (created_at desc);
create index if not exists comparisons_category_idx on leaselense.comparisons (category);
create index if not exists comparison_locations_comparison_id_idx on leaselense.comparison_locations (comparison_id);
create index if not exists reviews_sampled_comparison_id_idx on leaselense.reviews_sampled (comparison_id);
`;

try {
  await client.connect();
  await client.query(ddl);
  const res = await client.query(`
    select table_schema, table_name
    from information_schema.tables
    where table_schema = 'leaselense'
    order by table_name
  `);
  console.log(JSON.stringify({ ok: true, tables: res.rows.map((r) => `${r.table_schema}.${r.table_name}`) }, null, 2));
} finally {
  await client.end();
}
