import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {PhraseClip, TimedWord} from './types';

type SubtitleProps = {
  clip: PhraseClip;
  compact?: boolean;
};

const getActiveWord = (words: TimedWord[], currentMs: number) => {
  return words.find((word) => currentMs >= word.start && currentMs <= word.end);
};

export const Subtitle: React.FC<SubtitleProps> = ({clip, compact = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  const activeWord = getActiveWord(clip.words, currentMs);
  const textOpacity = interpolate(frame, [0, 8, 9999], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: compact ? 34 : 74,
        right: compact ? 34 : 74,
        bottom: compact ? 86 : 102,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        columnGap: compact ? 8 : 12,
        rowGap: compact ? 4 : 6,
        opacity: textOpacity,
      }}
    >
      {clip.words.map((word) => {
        const isActive = activeWord?.index === word.index;

        return (
          <span
            key={`${clip.id}-${word.index}`}
            style={{
              color: isActive ? '#f8f04d' : '#ffffff',
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: compact ? 34 : 42,
              fontWeight: 700,
              lineHeight: 1.16,
              textShadow:
                '0 2px 3px rgba(0, 0, 0, 0.95), 0 0 12px rgba(0, 0, 0, 0.72)',
              transition: 'color 80ms linear',
              whiteSpace: 'pre-wrap',
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};
