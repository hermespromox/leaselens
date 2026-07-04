import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ loggedIn: false, confirmed: false });
  return NextResponse.json({
    loggedIn: true,
    confirmed: Boolean(user.email_confirmed_at),
    email: user.email,
  });
}
