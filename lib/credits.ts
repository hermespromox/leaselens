import { Pool } from 'pg';

export async function countUserMonthlyBenchmarks(pool: Pool, userId: string): Promise<number> {
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
