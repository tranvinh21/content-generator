import type {NormalizedClip, YouglishSearchResultInput} from './normalized-clip';

const contextBeforeMs = 900;
const contextAfterMs = 1200;

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

export const normalizeYouglishResult = (
  result: YouglishSearchResultInput,
  query: string,
  language = 'de',
): NormalizedClip => {
  const rawStartMs = Math.max(0, Math.round(result.startSeconds * 1000));
  const rawEndMs =
    typeof result.endSeconds === 'number' ? Math.max(rawStartMs + 1000, Math.round(result.endSeconds * 1000)) : rawStartMs + 3600;
  const startMs = Math.max(0, rawStartMs - contextBeforeMs);
  const endMs = rawEndMs + contextAfterMs;
  const text = normalizeWhitespace(result.displayText || query);
  const youtubeWatchUrl = `https://www.youtube.com/watch?v=${result.videoId}&t=${Math.floor(startMs / 1000)}s`;

  return {
    id: `youglish-${result.videoId}-${rawStartMs}`,
    provider: 'youglish',
    language,
    query,
    text,
    matchedText: query,
    startMs,
    endMs,
    media: {
      kind: 'youtube-segment',
      sourceUrl: result.resultUrl,
      youtubeVideoId: result.videoId,
      youtubeWatchUrl,
      thumbnailUrl: `https://i.ytimg.com/vi/${result.videoId}/hqdefault.jpg`,
      requiresMaterialization: true,
    },
    words: [],
    transcriptSegments: [
      {
        text,
        startMs,
        endMs,
        isMatch: true,
      },
    ],
    attribution: {
      sourcePageUrl: result.resultUrl,
      sourceInfo: 'YouGlish German',
    },
    raw: result.raw ?? result,
  };
};
