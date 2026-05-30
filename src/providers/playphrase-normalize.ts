import type {NormalizedClip, PlayphraseClipInput} from './normalized-clip';

const fallbackDurationMs = 2600;

export const normalizePlayphraseClip = (
  clip: PlayphraseClipInput,
  query: string,
  language = 'de',
): NormalizedClip => {
  const words = (clip.words ?? []).map((word, index) => ({
    text: word.text,
    startMs: word.start,
    endMs: word.end,
    index: word.index ?? index,
    isMatch: Boolean(word['searched?']),
    confidence: word.score,
  }));
  const wordsEndMs = words.reduce((max, word) => Math.max(max, word.endMs), 0);
  const sourceDurationMs =
    typeof clip.start === 'number' && typeof clip.end === 'number' ? Math.max(0, clip.end - clip.start) : 0;
  const endMs = Math.max(wordsEndMs, sourceDurationMs, fallbackDurationMs);
  const text = clip.text ?? words.map((word) => word.text).join(' ');
  const id = clip.id ?? `playphrase-${Buffer.from(`${clip['video-url'] ?? text}`).toString('base64url')}`;

  return {
    id,
    provider: 'playphrase',
    language,
    query,
    text,
    matchedText: words
      .filter((word) => word.isMatch)
      .map((word) => word.text)
      .join(' ') || query,
    startMs: 0,
    endMs,
    media: {
      kind: 'direct-mp4',
      sourceUrl: clip['video-url'] ?? '',
      renderUrl: clip['video-url'],
      requiresMaterialization: false,
    },
    words,
    transcriptSegments: [
      {
        text,
        startMs: 0,
        endMs,
        isMatch: true,
      },
    ],
    attribution: {
      title: clip['video-info']?.info,
      sourcePageUrl: clip['video-info']?.['source-url'],
      sourceInfo: clip['video-info']?.info,
    },
    raw: clip,
  };
};
