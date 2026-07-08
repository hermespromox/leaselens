import { Pool } from 'pg'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7)
}

export async function countUserMonthlyBenchmarks(pool: Pool | null, userId: string): Promise<number> {
  // 1. Try Postgres (fastest, only works with direct DB access)
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT count(*) as cnt FROM leaselense.comparisons WHERE user_id = $1 AND created_at >= date_trunc('month', now())`,
        [userId]
      )
      return Number(res.rows[0]?.cnt) || 0
    } catch {
      // fall through
    }
  }

  // 2. Read from app_metadata (fast & reliable via Supabase Auth admin API)
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (!error && data?.user) {
      const meta = data.user.app_metadata || {}
      const storedMonth = meta.asklizy_benchmark_month
      if (storedMonth !== currentMonthKey()) return 0
      return typeof meta.asklizy_benchmark_count === 'number' ? meta.asklizy_benchmark_count : 0
    }
  } catch {
    // fall through to REST
  }

  // 3. Last resort: count via Supabase client .from('comparisons').select('*', {count:'exact', head:true})
  try {
    const supabase = createSupabaseAdminClient()
    const { count, error } = await supabase
      .from('comparisons')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    if (!error && count !== null) return count
  } catch {
    // last resort failed
  }

  return 0
}

export async function incrementUserMonthlyBenchmarks(userId: string): Promise<number> {
  const supabase = createSupabaseAdminClient()

  // Read current count
  const { data } = await supabase.auth.admin.getUserById(userId)
  const meta = data?.user?.app_metadata || {}
  const storedMonth = meta.asklizy_benchmark_month
  const currentCount = storedMonth === currentMonthKey() && typeof meta.asklizy_benchmark_count === 'number'
    ? meta.asklizy_benchmark_count
    : 0
  const newCount = currentCount + 1

  // Persist
  await supabase.auth.admin.updateUserById(userId, {
    app_metadata: {
      asklizy_benchmark_count: newCount,
      asklizy_benchmark_month: currentMonthKey(),
    },
  })

  return newCount
}
