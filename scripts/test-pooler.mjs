import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.TEST_DB_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
try {
  await client.connect();
  const r = await client.query('select current_database() db');
  console.log(JSON.stringify({ ok: true, db: r.rows[0].db }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, code: e.code, message: String(e.message).slice(0, 120) }));
  process.exitCode = 2;
} finally {
  try { await client.end(); } catch {}
}
