import {NextResponse} from 'next/server';
import {getDidPresenters} from '../../../features/vocabulary/avatar';

export const runtime = 'nodejs';

export const GET = async () => {
  const result = await getDidPresenters();

  if (!result.ok) {
    return NextResponse.json({ok: false, message: result.error, presenters: []}, {status: 400});
  }

  return NextResponse.json({ok: true, presenters: result.presenters});
};
