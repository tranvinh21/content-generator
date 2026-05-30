import type {NormalizedClip} from '../../providers/normalized-clip';

export type WordBlockInput = {
  id: string;
  term: string;
  selectedClips: NormalizedClip[];
};

export type RenderableClip = NormalizedClip & {
  media: NormalizedClip['media'] & {
    renderUrl: string;
    requiresMaterialization: false;
  };
  exampleTranslation: string;
};

export type RenderableWordBlock = {
  id: string;
  term: string;
  ipa: string;
  translationVi: string;
  voiceUrl?: string;
  clips: RenderableClip[];
};

export type VocabularyTikTokProps = {
  title: string;
  blocks: RenderableWordBlock[];
  backgroundUrl?: string;
  watermarkUrl?: string;
  outroUrl?: string;
  outroFrames?: number;
};
