import {getRuntimeConfig} from '../../../lib/runtime-config';
import {normalizePlayphraseClip} from '../../../providers/playphrase-normalize';
import type {NormalizedClip, PlayphraseClipInput} from '../../../providers/normalized-clip';

const extractClips = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['phrases', 'results', 'items', 'data']) {
      if (Array.isArray(record[key])) {
        return record[key];
      }
    }
  }

  return [];
};

export const searchPlayphrase = async (query: string, language = 'de', limit = 10) => {
  const config = await getRuntimeConfig();
  const searchUrl = new URL('https://www.playphrase.me/api-langs/v1/phrases/search');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('limit', String(limit));
  searchUrl.searchParams.set('language', language);
  searchUrl.searchParams.set('platform', 'desktop safari');
  searchUrl.searchParams.set('skip', '0');
  searchUrl.searchParams.set('hideHardOffensiveIn17Plus', 'false');
  searchUrl.searchParams.set('hideExplicitNudityIn17Plus', 'false');

  const response = await fetch(searchUrl, {
    headers: {
      accept: 'json',
      'accept-language': 'en-US,en;q=0.7',
      authorization: config.playphraseAuthorization,
      'content-type': 'json',
      cookie: config.playphraseCookie,
      referer: 'https://www.playphrase.me/',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
      'x-csrf-token': config.playphraseCsrfToken,
    },
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`PlayPhrase failed (${response.status}): ${text.slice(0, 180)}`);
  }

  const payload = JSON.parse(text) as unknown;
  const clips = extractClips(payload).map((clip) => normalizePlayphraseClip(clip as PlayphraseClipInput, query, language));

  return {
    clips: clips.filter((clip): clip is NormalizedClip => Boolean(clip.media.renderUrl)),
    log: `[${query}] PlayPhrase found ${clips.length} clips`,
  };
};
