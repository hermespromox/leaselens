import { Pool } from 'pg'
import { createClient } from '@supabase/supabase-js'

function supabaseConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  return { url, key }
}

function createAdminClient() {
  const config = supabaseConfig()
  if (!config) return null
  return createClient(config.url, config.key, { auth: { persistSession: false } })
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7) // "2026-07"
}

/** Read benchmark count from user's app_metadata (fast, reliable). */
async function countFromAppMetadata(userId: string): Promise<number | null> {
  const supabase = createAdminClient()
  if (!supabase) return null
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !data?.user) return null
    const meta = data.user.app_metadata || {}
    const storedMonth = meta.asklizy_benchmark_month
    if (storedMonth !== currentMonthKey()) return 0
    return typeof meta.asklizy_benchmark_count === 'number' ? meta.asklizy_benchmark_count : 0
  } catch {
    return null
  }
}

export async function countUserMonthlyBenchmarks(pool: Pool | null, userId: string): Promise<number> {
  // 1. Try Postgres (fastest — only works with direct DB access)
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

  // 2. Try app_metadata (works via Supabase Auth admin API)
  const appMetaCount = await countFromAppMetadata(userId)
  if (appMetaCount !== null) return appMetaCount

  // 3. Fallback: Supabase REST API
  const config = supabaseConfig()
  if (!config) return 0

  try {
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const url = `${config.url}/rest/v1/comparisons?select=id&user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(firstOfMonth)}`
    console.error('[credits] REST fallback URL:', url)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
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
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) {
      console.error('[credits] REST fallback failed:', res.status)
      return 0
    }
    const contentRange = res.headers.get('content-range')
    const exactCount = contentRange?.match(/\/(\d+)$/)?.[1]
    if (exactCount) return Number(exactCount) || 0
    const rows = await res.json()
    return Array.isArray(rows) ? rows.length : 0
  } catch (err) {
    console.error('[credits] REST fallback error:', err)
    return 0
  }
}

/** Persist the benchmark count in app_metadata so counting stays fast and reliable. */
export async function incrementUserMonthlyBenchmarks(userId: string): Promise<number> {
  const currentCount = await countFromAppMetadata(userId)
  const newCount = (currentCount ?? 0) + 1
  const supabase = createAdminClient()
  if (!supabase) return newCount // best effort
  try {
    await supabase.auth.admin.updateUserById(userId, {
      app_metadata: {
        asklizy_benchmark_count: newCount,
        asklizy_benchmark_month: currentMonthKey(),
      },
    })
  } catch (err) {
    console.error('[credits] Failed to persist benchmark count:', err)
  }
  return newCount
}
