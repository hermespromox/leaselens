import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { getPlanFromUser, PLANS } from '@/lib/billing';
import { postgresPool } from '@/lib/pool';
import { countUserMonthlyBenchmarks } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ loggedIn: false, confirmed: false, plan: 'free', credits: null });

  const plan = getPlanFromUser(user);
  const planConfig = PLANS[plan as keyof typeof PLANS];
  const isUnlimited = planConfig?.maxComparisons === null;

  let credits = null;
  const pool = postgresPool();
  if (isUnlimited) {
    credits = { plan, limit: null, used: 0, remaining: null, unlimited: true };
  } else if (pool) {
    const limit = planConfig?.maxComparisons ?? 5;
    const used = await countUserMonthlyBenchmarks(pool, user.id);
    credits = { plan, limit, used, remaining: Math.max(0, limit - used), unlimited: false };
  } else {
    credits = { plan, limit: planConfig?.maxComparisons ?? 5, used: 0, remaining: planConfig?.maxComparisons ?? 5, unlimited: false };
  }

  return NextResponse.json({
    loggedIn: true,
    confirmed: Boolean(user.email_confirmed_at),
    email: user.email,
    plan,
    credits,
  });
}
