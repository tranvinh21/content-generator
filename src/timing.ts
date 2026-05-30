import type {PhraseClip} from './types';

export const DEFAULT_FPS = 30;
export const DEFAULT_GAP_MS = 360;
export const CLIP_TAIL_MS = 520;

export const msToFrames = (ms: number, fps = DEFAULT_FPS) =>
  Math.max(1, Math.round((ms / 1000) * fps));

export const getClipDurationMs = (clip: PhraseClip) => {
  const lastWordEnd = clip.words.reduce((max, word) => Math.max(max, word.end), 0);
  const clipDurationFromSource = Math.max(0, clip.end - clip.start);

  return Math.max(lastWordEnd, clipDurationFromSource) + CLIP_TAIL_MS;
};

export const getVideoDurationInFrames = (
  clips: PhraseClip[],
  fps = DEFAULT_FPS,
  gapMs = DEFAULT_GAP_MS,
) => {
  const totalMs = clips.reduce((sum, clip, index) => {
    const gap = index === clips.length - 1 ? 0 : gapMs;

    return sum + getClipDurationMs(clip) + gap;
  }, 0);

  return msToFrames(totalMs, fps);
};

export const getClipStartFrame = (
  clips: PhraseClip[],
  clipIndex: number,
  fps = DEFAULT_FPS,
  gapMs = DEFAULT_GAP_MS,
) => {
  const msBeforeClip = clips.slice(0, clipIndex).reduce((sum, clip) => {
    return sum + getClipDurationMs(clip) + gapMs;
  }, 0);

  return msToFrames(msBeforeClip, fps);
};
