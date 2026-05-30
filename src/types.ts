export type VideoInfo = {
  info: string;
  wps: boolean;
  'source-url': string;
  imdb: string;
};

export type TimedWord = {
  start: number;
  end: number;
  score: number;
  text: string;
  index: number;
  'searched?': boolean;
};

export type PhraseClip = {
  'video-info': VideoInfo;
  index: number;
  words: TimedWord[];
  start: number;
  'video-url': string;
  movie: string;
  id: string;
  end: number;
  'download-file-name': string;
  text: string;
};

export type PhraseVideoProps = {
  clips: PhraseClip[];
  layout?: 'landscape' | 'vertical';
  gapMs?: number;
  subtitleLanguageLabel?: string;
  showMovieInfo?: boolean;
};
