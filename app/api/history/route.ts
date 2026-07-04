import { NextResponse } from 'next/server';
import { getCurrentConfirmedUser } from '@/lib/supabase/server';
import { getComparisonHistory } from '@/lib/leaselense';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentConfirmedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await getComparisonHistory(user.id);
  return NextResponse.json({ items });
}
