import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {RenderableClip, RenderableWordBlock, VocabularyTikTokProps} from './features/vocabulary/types';

const fps = 30;
const coverFrames = 60;
const introFrames = 60;
const clipGapFrames = 4;
const blockGapFrames = 14;
const transitionFrames = 6;
const introTransitionFrames = 10;
const minClipFrames = 45;
const outroFrames = 90;
const fontFamily = '"Manrope", ui-sans-serif, system-ui, sans-serif';
const tiktokTopSafe = 250;
const tiktokCaptionSafeBottom = 430;
const exampleVideoTop = 540;
const exampleVideoHeight = 680;

const msToFrames = (ms: number) => Math.max(1, Math.round((ms / 1000) * fps));
const isImageSource = (src: string) => /\.(avif|jpe?g|png|webp)(\?|$)/i.test(src);

export const getClipFrames = (clip: RenderableClip) => {
  const frames = msToFrames(Math.max(1500, clip.endMs - clip.startMs));

  return Math.max(minClipFrames, frames);
};

const getIntroFrames = (block: RenderableWordBlock) => Math.max(introFrames, block.avatarIntro?.durationFrames ?? introFrames);

export const getBlockFrames = (block: RenderableWordBlock) => {
  return (
    getIntroFrames(block) +
    block.clips.reduce((total, clip, index) => total + getClipFrames(clip) + (index === 0 ? 0 : clipGapFrames), 0) +
    blockGapFrames
  );
};

export const getVocabularyTikTokDuration = (props: VocabularyTikTokProps) => {
  return props.blocks.reduce((total, block) => total + getBlockFrames(block), 0) + (props.outroUrl ? props.outroFrames ?? outroFrames : 0);
};

const sceneOpacity = (frame: number, duration: number, fadeFrames = transitionFrames) => {
  const fadeIn = interpolate(frame, [0, fadeFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fadeOut = interpolate(frame, [Math.max(0, duration - fadeFrames), duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return Math.min(fadeIn, fadeOut);
};

const sceneAudioVolume = (frame: number, duration: number) => {
  const fadeIn = interpolate(frame, [0, 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fadeOut = interpolate(frame, [Math.max(0, duration - 8), duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return Math.min(fadeIn, fadeOut);
};

const Background: React.FC<{src?: string}> = ({src}) => {
  if (!src) {
    return (
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 20% 18%, rgba(255,255,255,0.92), transparent 28%), linear-gradient(135deg, #e8e2d8 0%, #f7f4ed 52%, #d8dde3 100%)',
        }}
      />
    );
  }

  return (
    <AbsoluteFill>
      {isImageSource(src) ? (
        <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      ) : (
        <OffthreadVideo src={src} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      )}
      <AbsoluteFill style={{background: 'rgba(255, 255, 255, 0.2)'}} />
    </AbsoluteFill>
  );
};

const Watermark: React.FC<{src?: string}> = ({src}) => {
  if (!src) {
    return null;
  }

  return (
    <Img
      src={src}
      style={{
        position: 'absolute',
        left: '50%',
        bottom: tiktokCaptionSafeBottom,
        width: 360,
        opacity: 0.95,
        transform: 'translateX(-50%)',
        zIndex: 3,
      }}
    />
  );
};

const GermanText: React.FC<{text: string; query: string}> = ({text, query}) => {
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'));

  return (
    <>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} style={{color: part.toLowerCase() === query.toLowerCase() ? '#f3d34a' : '#ffffff'}}>
          {part}
        </span>
      ))}
    </>
  );
};

const TimedGermanSubtitle: React.FC<{clip: RenderableClip}> = ({clip}) => {
  const frame = useCurrentFrame();
  const currentMs = (frame / fps) * 1000;

  if (clip.words.length === 0) {
    return <GermanText text={clip.text} query={clip.query} />;
  }

  return (
    <>
      {clip.words.map((word, index) => {
        const active = currentMs >= word.startMs && currentMs <= word.endMs;
        const nearby = currentMs >= word.startMs - 120 && currentMs <= word.endMs + 120;
        const color = active ? '#f3d34a' : word.isMatch ? '#fff3a6' : '#ffffff';
        const scale = active ? 1.1 : nearby ? 1.03 : 1;

        return (
          <span
            key={`${word.index}-${word.text}`}
            style={{
              color,
              display: 'inline-block',
              marginRight: index === clip.words.length - 1 ? 0 : 10,
              transform: `scale(${scale})`,
              transition: 'color 120ms linear, transform 120ms linear',
            }}
          >
            {word.text}
          </span>
        );
      })}
    </>
  );
};

export const VocabularyCover: React.FC<Pick<VocabularyTikTokProps, 'title' | 'watermarkUrl' | 'backgroundUrl'>> = (props) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, coverFrames], [0.985, 1.01], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill
      style={{
        padding: '150px 82px',
        color: '#101820',
        textAlign: 'center',
        justifyContent: 'center',
        transform: `scale(${scale})`,
        fontFamily,
      }}
    >
      <Background src={props.backgroundUrl} />
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          marginTop: -180,
          fontSize: 88,
          fontWeight: 800,
          lineHeight: 1.08,
          textShadow: '0 3px 0 rgba(255,255,255,0.8)',
        }}
      >
        {props.title}
      </div>
      <Watermark src={props.watermarkUrl} />
    </AbsoluteFill>
  );
};

const BasicAvatar: React.FC<{src?: string}> = ({src}) => {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame / 9) * 8;
  const mouthScale = interpolate(Math.sin(frame / 3), [-1, 1], [0.35, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (src) {
    return (
      <Img
        src={src}
        style={{
          width: 330,
          height: 330,
          objectFit: 'contain',
          transform: `translateY(${bob}px)`,
          filter: 'drop-shadow(0 18px 30px rgba(17, 24, 39, 0.18))',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 300,
        height: 300,
        borderRadius: 150,
        background: 'linear-gradient(180deg, #bfe1ff 0%, #edf7ff 100%)',
        border: '6px solid rgba(255,255,255,0.8)',
        boxShadow: '0 22px 40px rgba(17,24,39,0.16)',
        position: 'relative',
        transform: `translateY(${bob}px)`,
      }}
    >
      <div style={{position: 'absolute', top: 92, left: 82, width: 34, height: 34, borderRadius: 17, background: '#111827'}} />
      <div style={{position: 'absolute', top: 92, right: 82, width: 34, height: 34, borderRadius: 17, background: '#111827'}} />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 176,
          width: 78,
          height: 24,
          borderRadius: 999,
          background: '#ef4444',
          transform: `translateX(-50%) scaleY(${mouthScale})`,
        }}
      />
    </div>
  );
};

const IntroCard: React.FC<{block: RenderableWordBlock; title: string; durationInFrames: number; avatarUrl?: string; includeAvatar?: boolean}> = ({
  block,
  title,
  durationInFrames,
  avatarUrl,
  includeAvatar = true,
}) => {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, durationInFrames, introTransitionFrames);
  const translateY = interpolate(frame, [0, durationInFrames], [14, -4], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const didVideoUrl = block.avatarIntro?.provider === 'did' ? block.avatarIntro.videoUrl : undefined;

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity, padding: 70, transform: `translateY(${translateY}px)`}}>
      {!didVideoUrl && block.voiceUrl ? <Audio src={block.voiceUrl} /> : null}
      <div style={{position: 'absolute', top: tiktokTopSafe, left: 70, right: 70, textAlign: 'center', color: '#111827', zIndex: 4}}>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            textShadow: '0 2px 0 rgba(255,255,255,0.7)',
          }}
        >
          {title}
        </div>
      </div>

      {includeAvatar ? (
        <div
          style={{
            position: 'absolute',
            top: 360,
            left: 0,
            right: 0,
            height: 660,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          {didVideoUrl ? (
            <OffthreadVideo
              src={didVideoUrl}
              volume={(f) => sceneAudioVolume(f, durationInFrames)}
              style={{
                width: 640,
                height: 640,
                objectFit: 'cover',
                borderRadius: 28,
                boxShadow: '0 24px 54px rgba(17,24,39,0.24)',
              }}
            />
          ) : (
            <BasicAvatar src={avatarUrl} />
          )}
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          top: includeAvatar ? 1040 : 650,
          left: 80,
          right: 80,
          color: '#111827',
          textAlign: 'center',
          textShadow: '0 2px 0 rgba(255,255,255,0.8)',
          zIndex: 4,
        }}
      >
        <div style={{fontSize: 88, fontWeight: 800, lineHeight: 1.03, textWrap: 'balance'}}>{block.term}</div>
        <div style={{marginTop: 16, fontSize: 38, fontWeight: 700}}>{block.ipa}</div>
        <div style={{marginTop: 16, fontSize: 40, fontWeight: 800, lineHeight: 1.18, textWrap: 'balance'}}>{block.translationVi}</div>
      </div>
    </AbsoluteFill>
  );
};

const ExampleClip: React.FC<{block: RenderableWordBlock; clip: RenderableClip; durationInFrames: number}> = ({block, clip, durationInFrames}) => {
  const frame = useCurrentFrame();
  const mediaOpacity = sceneOpacity(frame, durationInFrames);
  const cardScale = interpolate(frame, [0, transitionFrames, durationInFrames], [0.985, 1, 1.01], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: tiktokTopSafe,
          left: 66,
          right: 66,
          textAlign: 'center',
          color: '#111827',
          textShadow: '0 2px 0 rgba(255,255,255,0.8)',
        }}
      >
        <div style={{fontSize: 72, fontWeight: 800}}>{block.term}</div>
        <div style={{fontSize: 30, fontWeight: 800, marginTop: 8}}>{block.ipa}</div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: exampleVideoTop,
          left: 0,
          right: 0,
          height: exampleVideoHeight,
          backgroundColor: '#050505',
          boxShadow: '0 22px 44px rgba(0,0,0,0.28)',
          opacity: mediaOpacity,
        }}
      >
        <OffthreadVideo
          src={clip.media.renderUrl}
          volume={(f) => sceneAudioVolume(f, durationInFrames)}
          style={{width: '100%', height: '100%', objectFit: 'contain', transform: `scale(${cardScale})`}}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: exampleVideoTop + exampleVideoHeight + 30,
          left: 60,
          right: 60,
          display: 'grid',
          gap: 14,
          textAlign: 'center',
          fontWeight: 800,
          lineHeight: 1.18,
          textShadow: '0 2px 3px rgba(0,0,0,0.95), 0 0 14px rgba(0,0,0,0.8)',
          opacity: mediaOpacity,
        }}
      >
        <div style={{fontSize: 40}}>
          <TimedGermanSubtitle clip={clip} />
        </div>
        <div style={{minHeight: 88, fontSize: 34, color: '#ffffff'}}>{clip.exampleTranslation || ' '}</div>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{src: string; durationInFrames: number}> = ({src, durationInFrames}) => {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, durationInFrames, 12);

  return (
    <AbsoluteFill style={{backgroundColor: '#000', opacity}}>
      <OffthreadVideo src={src} volume={(f) => sceneAudioVolume(f, durationInFrames)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    </AbsoluteFill>
  );
};

export const VocabularyTikTok: React.FC<VocabularyTikTokProps> = (props) => {
  const {width, height} = useVideoConfig();
  let cursor = 0;
  const sequences: React.ReactNode[] = [];

  props.blocks.forEach((block, blockIndex) => {
    const blockStart = cursor;
    const introDuration = getIntroFrames(block);

    sequences.push(
      <Sequence key={`${block.id}-intro`} from={blockStart} durationInFrames={introDuration}>
        <IntroCard
          avatarUrl={props.avatarUrl}
          block={block}
          durationInFrames={introDuration}
          includeAvatar={props.includeAvatar !== false}
          title={props.title}
        />
      </Sequence>,
    );
    cursor += introDuration;

    block.clips.forEach((clip, clipIndex) => {
      const duration = getClipFrames(clip);
      if (clipIndex > 0) {
        cursor += clipGapFrames;
      }
      sequences.push(
        <Sequence key={`${block.id}-${clip.id}`} from={cursor} durationInFrames={duration}>
          <ExampleClip block={block} clip={clip} durationInFrames={duration} />
        </Sequence>,
      );
      cursor += duration;
    });

    cursor += blockIndex === props.blocks.length - 1 ? 0 : blockGapFrames;
  });

  if (props.outroUrl) {
    const duration = props.outroFrames ?? outroFrames;
    sequences.push(
      <Sequence key="outro" from={cursor} durationInFrames={duration}>
        <Outro src={props.outroUrl} durationInFrames={duration} />
      </Sequence>,
    );
  }

  return (
    <AbsoluteFill style={{width, height, overflow: 'hidden', backgroundColor: '#f6f2ea', fontFamily}}>
      <Background src={props.backgroundUrl} />
      {sequences}
      <Watermark src={props.watermarkUrl} />
    </AbsoluteFill>
  );
};
