import {NextResponse} from 'next/server';
import {z} from 'zod';
import {searchFilmot} from '../../../features/vocabulary/providers/filmot';
import {parseProviderCurl} from '../../../lib/runtime-config';

export const runtime = 'nodejs';

const schema = z.object({
  curl: z.string().optional(),
});

export const GET = async () => {
  try {
    const result = await searchFilmot('Moment mal', 'de');

    return NextResponse.json({
      ok: true,
      count: result.clips.length,
      log: result.log,
    });
  } catch (error) {
    return NextResponse.json(
      {ok: false, message: error instanceof Error ? error.message : 'Filmot check failed'},
      {status: 400},
    );
  }
};

export const POST = async (request: Request) => {
  try {
    const input = schema.parse(await request.json());
    const parsed = input.curl ? parseProviderCurl(input.curl) : {};
    if (!parsed.filmotCookie) {
      return NextResponse.json({
        ok: true,
        count: 0,
        log: '[Moment mal] Filmot curl check skipped: no Filmot cookie found in pasted curl',
      });
    }
    const result = await searchFilmot('Moment mal', 'de', {
      cookie: parsed.filmotCookie,
      userAgent: parsed.filmotUserAgent,
    });

    return NextResponse.json({
      ok: true,
      count: result.clips.length,
      log: result.log,
    });
  } catch (error) {
    return NextResponse.json(
      {ok: false, message: error instanceof Error ? error.message : 'Filmot check failed'},
      {status: 400},
    );
  }
};
