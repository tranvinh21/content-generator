import React from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import {getClipDurationMs, getClipStartFrame, msToFrames} from './timing';
import {Subtitle} from './subtitles';
import type {PhraseClip, PhraseVideoProps} from './types';

type ClipSceneProps = {
  clip: PhraseClip;
  compact: boolean;
  showMovieInfo: boolean;
};

const ClipScene: React.FC<ClipSceneProps> = ({clip, compact, showMovieInfo}) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#09090b',
        opacity: fadeIn,
      }}
    >
      <OffthreadVideo
        src={clip['video-url']}
        style={{
          width: '100%',
          height: '100%',
          objectFit: compact ? 'cover' : 'contain',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.02) 42%, rgba(0,0,0,0.76) 100%)',
        }}
      />
      {showMovieInfo ? (
        <div
          style={{
            position: 'absolute',
            top: compact ? 34 : 36,
            left: compact ? 34 : 48,
            right: compact ? 34 : 48,
            color: '#f9fafb',
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: compact ? 24 : 28,
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.2,
            textShadow: '0 2px 14px rgba(0, 0, 0, 0.8)',
          }}
        >
          {clip['video-info'].info}
        </div>
      ) : null}
      <Subtitle clip={clip} compact={compact} />
    </AbsoluteFill>
  );
};

export const PhraseVideo: React.FC<PhraseVideoProps> = ({
  clips,
  layout = 'landscape',
  gapMs = 360,
  showMovieInfo = true,
}) => {
  const compact = layout === 'vertical';

  return (
    <AbsoluteFill style={{backgroundColor: '#09090b'}}>
      {clips.map((clip, index) => {
        const from = getClipStartFrame(clips, index, undefined, gapMs);
        const durationInFrames = msToFrames(getClipDurationMs(clip));

        return (
          <Sequence key={clip.id} from={from} durationInFrames={durationInFrames}>
            <ClipScene clip={clip} compact={compact} showMovieInfo={showMovieInfo} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
