import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  const res = NextResponse.json({ success: true });
  // Clear all Supabase auth cookies
  const cookieNames = ['sb-access-token', 'sb-refresh-token'];
  for (const name of cookieNames) {
    res.cookies.set(name, '', { path: '/', maxAge: 0 });
  }
  // Also clear cookies matching the project ref pattern
  res.cookies.delete('sb-supabase-auth-token');
  return res;
}
