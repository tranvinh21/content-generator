import {NextResponse} from 'next/server';
import {getDidCredits} from '../../../features/vocabulary/avatar';

export const runtime = 'nodejs';

export const GET = async () => {
  const result = await getDidCredits();

  if (!result.ok) {
    return NextResponse.json({ok: false, message: result.error}, {status: 400});
  }

  return NextResponse.json({ok: true, credits: result.credits});
};
