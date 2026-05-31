export type QuizOption = {
  de: string;
  vi: string;
};

export type QuizItem = {
  questionDe: string;
  questionVi: string;
  illustrationUrl?: string;
  options: QuizOption[];
  correctIndex: number;
  audioUrl?: string;
  audioFrames: number;
  correctAudioUrl?: string;
  correctAudioFrames?: number;
};

export type QuizVideoProps = {
  title: string;
  items: QuizItem[];
  tickAudioUrl?: string;
  backgroundUrl?: string;
  watermarkUrl?: string;
  outroUrl?: string;
  outroFrames?: number;
};
