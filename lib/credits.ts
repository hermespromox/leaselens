import { Pool } from 'pg';

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export async function countUserMonthlyBenchmarks(pool: Pool | null, userId: string): Promise<number> {
  // Try Postgres first (fast)
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT count(*) as cnt FROM leaselense.comparisons WHERE user_id = $1 AND created_at >= date_trunc('month', now())`,
        [userId]
      );
      return Number(res.rows[0]?.cnt) || 0;
    } catch {
      // fall through to REST
    }
  }

  // Fallback: Supabase REST API
  const config = supabaseConfig();
  if (!config) return 0;

  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const url = `${config.url}/rest/v1/comparisons?select=id&user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(firstOfMonth)}`;
    const res = await fetch(url, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Accept-Profile': 'leaselense',
        'Content-Profile': 'leaselense',
        'User-Agent': 'Mozilla/5.0 AskLizy/1.0',
        Prefer: 'count=exact',
        Range: '0-0',
        'Range-Unit': 'items',
      },
      cache: 'no-store',
    });
    if (!res.ok) return 0;
    const contentRange = res.headers.get('content-range');
    const exactCount = contentRange?.match(/\/(\d+)$/)?.[1];
    if (exactCount) return Number(exactCount) || 0;
    const rows = await res.json();
    return Array.isArray(rows) ? rows.length : 0;
  } catch {
    return 0;
  }
}
