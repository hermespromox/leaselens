import { NextResponse } from 'next/server';
import { getCurrentConfirmedUser } from '@/lib/supabase/server';
import { getComparisonDetail } from '@/lib/leaselense';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentConfirmedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const detail = await getComparisonDetail(user.id, params.id);
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(detail);
}
