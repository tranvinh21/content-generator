export type ReadAlongVocabularyItem = {
  term: string;
  ipa?: string;
  translationVi?: string;
};

export type ReadAlongVideoProps = {
  title: string;
  level: string;
  text: string;
  vocabulary: ReadAlongVocabularyItem[];
  audioUrl?: string;
  durationFrames: number;
  backgroundUrl?: string;
  watermarkUrl?: string;
  useEndCard?: boolean;
};
