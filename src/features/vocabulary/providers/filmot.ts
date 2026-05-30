import {getRuntimeConfig} from '../../../lib/runtime-config';
import {normalizeFilmotResult} from '../../../providers/filmot-normalize';
import type {FilmotSearchResultInput} from '../../../providers/normalized-clip';

const stripTags = (value: string) =>
  value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const parseTimeToSeconds = (value: string) => {
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const parts = value.split(':').map(Number);
  if (parts.some(Number.isNaN)) {
    return 0;
  }

  return parts.reduce((sum, part) => sum * 60 + part, 0);
};

const parseFilmotHtml = (html: string, query: string): FilmotSearchResultInput[] => {
  const results = new Map<string, FilmotSearchResultInput>();
  const youtubeIdRegex = /(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})[^"'<>]*(?:[?&]t=([0-9hms:]+))?/g;
  let match: RegExpExecArray | null;

  while ((match = youtubeIdRegex.exec(html))) {
    const videoId = match[1];
    const time = match[2] ? parseTimeToSeconds(match[2].replace(/[hms]/g, ':').replace(/:+$/g, '')) : 0;
    const key = `${videoId}-${time}`;
    const windowStart = Math.max(0, match.index - 700);
    const windowEnd = Math.min(html.length, match.index + 1000);
    const snippet = stripTags(html.slice(windowStart, windowEnd));

    if (!results.has(key)) {
      results.set(key, {
        videoId,
        startSeconds: time,
        snippetText: snippet.includes(query) ? snippet : query,
        resultUrl: `https://filmot.com/search/${encodeURIComponent(query)}/1`,
        raw: {snippet},
      });
    }
  }

  return Array.from(results.values()).slice(0, 20);
};

export const searchFilmot = async (query: string, language = 'de') => {
  const config = await getRuntimeConfig();

  if (!config.filmotCookie) {
    return {
      clips: [],
      log: `[${query}] Filmot skipped: FILMOT_COOKIE is not set`,
    };
  }

  const searchUrl = new URL(`https://filmot.com/search/${encodeURIComponent(`"${query}"`)}/1`);
  searchUrl.searchParams.set('lang', language);
  searchUrl.searchParams.set('hideDeleted', '1');
  searchUrl.searchParams.set('gridView', '1');
  searchUrl.searchParams.set('category', '18');

  const response = await fetch(searchUrl, {
    headers: {
      cookie: config.filmotCookie,
      'user-agent': config.filmotUserAgent,
      accept: 'text/html,application/xhtml+xml',
    },
  });
  const html = await response.text();

  if (html.includes('h-captcha') || html.includes('captcha-validate')) {
    return {
      clips: [],
      log: `[${query}] Filmot needs reconnect: captcha page returned`,
    };
  }

  if (!response.ok) {
    throw new Error(`Filmot failed (${response.status}): ${html.slice(0, 180)}`);
  }

  const parsed = parseFilmotHtml(html, query);
  const clips = parsed.map((result) => normalizeFilmotResult(result, query, language));

  return {
    clips,
    log: `[${query}] Filmot found ${clips.length} clips`,
  };
};
