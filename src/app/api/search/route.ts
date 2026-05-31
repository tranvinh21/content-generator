import {NextResponse} from 'next/server';
import {z} from 'zod';
import {searchFilmot} from '../../../features/vocabulary/providers/filmot';
import {searchPlayphrase} from '../../../features/vocabulary/providers/playphrase';
import {searchYouglish} from '../../../features/vocabulary/providers/youglish';

export const runtime = 'nodejs';

const schema = z.object({
  query: z.string().min(1),
  language: z.string().default('de'),
  playphraseLimit: z.number().int().min(1).max(50).default(10),
});

export const POST = async (request: Request) => {
  try {
    const input = schema.parse(await request.json());
    const [playphrase, filmot, youglish] = await Promise.allSettled([
      searchPlayphrase(input.query, input.language, input.playphraseLimit),
      searchFilmot(input.query, input.language),
      searchYouglish(input.query, input.language),
    ]);
    const logs: string[] = [];
    const clips = [];

    if (playphrase.status === 'fulfilled') {
      clips.push(...playphrase.value.clips);
      logs.push(playphrase.value.log);
    } else {
      logs.push(`[${input.query}] PlayPhrase failed: ${playphrase.reason.message}`);
    }

    if (filmot.status === 'fulfilled') {
      clips.push(...filmot.value.clips);
      logs.push(filmot.value.log);
    } else {
      logs.push(`[${input.query}] Filmot failed: ${filmot.reason.message}`);
    }

    if (youglish.status === 'fulfilled') {
      clips.push(...youglish.value.clips);
      logs.push(youglish.value.log);
    } else {
      logs.push(`[${input.query}] YouGlish failed: ${youglish.reason.message}`);
    }

    return NextResponse.json({ok: true, clips, logs});
  } catch (error) {
    return NextResponse.json(
      {ok: false, message: error instanceof Error ? error.message : 'Search failed'},
      {status: 400},
    );
  }
};
