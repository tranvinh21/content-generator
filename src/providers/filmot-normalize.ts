import type {FilmotSearchResultInput, NormalizedClip} from './normalized-clip';

const defaultContextBeforeMs = 1200;
const defaultContextAfterMs = 2200;

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

export const normalizeFilmotResult = (
  result: FilmotSearchResultInput,
  query: string,
  language = 'de',
): NormalizedClip => {
  const startMs = Math.max(0, Math.round(result.startSeconds * 1000) - defaultContextBeforeMs);
  const endMs =
    typeof result.endSeconds === 'number'
      ? Math.round(result.endSeconds * 1000) + defaultContextAfterMs
      : startMs + 5200;
  const text = normalizeWhitespace(result.snippetText);
  const youtubeWatchUrl = `https://www.youtube.com/watch?v=${result.videoId}&t=${Math.floor(startMs / 1000)}s`;

  return {
    id: `filmot-${result.videoId}-${startMs}`,
    provider: 'filmot',
    language,
    query,
    text,
    matchedText: query,
    startMs,
    endMs,
    media: {
      kind: 'youtube-segment',
      sourceUrl: result.resultUrl ?? youtubeWatchUrl,
      youtubeVideoId: result.videoId,
      youtubeWatchUrl,
      thumbnailUrl: result.thumbnailUrl,
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
      title: result.title,
      channelName: result.channelName,
      channelUrl: result.channelId ? `https://www.youtube.com/channel/${result.channelId}` : undefined,
      sourcePageUrl: result.resultUrl,
      sourceInfo: result.title,
    },
    raw: result.raw ?? result,
  };
};
