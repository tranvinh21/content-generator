export type ClipProvider = 'playphrase' | 'filmot';

export type ClipMediaKind = 'direct-mp4' | 'youtube-segment';

export type NormalizedWord = {
  text: string;
  startMs: number;
  endMs: number;
  index: number;
  isMatch: boolean;
  confidence?: number;
};

export type NormalizedTranscriptSegment = {
  text: string;
  startMs: number;
  endMs?: number;
  isMatch?: boolean;
};

export type NormalizedClip = {
  id: string;
  provider: ClipProvider;
  language: string;
  query: string;
  text: string;
  matchedText: string;
  startMs: number;
  endMs: number;
  media: {
    kind: ClipMediaKind;
    sourceUrl: string;
    renderUrl?: string;
    youtubeVideoId?: string;
    youtubeWatchUrl?: string;
    thumbnailUrl?: string;
    requiresMaterialization: boolean;
  };
  words: NormalizedWord[];
  transcriptSegments: NormalizedTranscriptSegment[];
  attribution: {
    title?: string;
    channelName?: string;
    channelUrl?: string;
    sourcePageUrl?: string;
    sourceInfo?: string;
  };
  raw: unknown;
};

export type PlayphraseClipInput = {
  'video-info'?: {
    info?: string;
    'source-url'?: string;
    imdb?: string;
  };
  id?: string;
  text?: string;
  start?: number;
  end?: number;
  'video-url'?: string;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    index?: number;
    score?: number;
    'searched?'?: boolean;
  }>;
};

export type FilmotSearchResultInput = {
  videoId: string;
  title?: string;
  channelName?: string;
  channelId?: string;
  thumbnailUrl?: string;
  startSeconds: number;
  endSeconds?: number;
  snippetText: string;
  resultUrl?: string;
  raw?: unknown;
};
