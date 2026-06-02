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

const splitCoverTitle = (title: string) => {
  const manualLines = title
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (manualLines.length > 1) {
    return manualLines;
  }

  const words = title.trim().split(/\s+/);
  if (words.length <= 4) {
    return [title.trim()];
  }

  let bestIndex = Math.ceil(words.length / 2);
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 2; index < words.length; index += 1) {
    const left = words.slice(0, index).join(' ');
    const right = words.slice(index).join(' ');
    const score = Math.abs(left.length - right.length);
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return [words.slice(0, bestIndex).join(' '), words.slice(bestIndex).join(' ')];
};

const splitStackedCoverTitle = (title: string) => {
  const manualLines = title
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (manualLines.length > 1) {
    return manualLines;
  }

  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 3) {
    return words;
  }

  const firstEnd = Math.max(1, Math.round(words.length * 0.28));
  const secondEnd = Math.max(firstEnd + 1, Math.round(words.length * 0.72));

  return [words.slice(0, firstEnd).join(' '), words.slice(firstEnd, secondEnd).join(' '), words.slice(secondEnd).join(' ')];
};

const hexToRgb = (hex: string) => {
  const value = hex.replace('#', '');
  const parsed = Number.parseInt(value, 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
};

const MythMascotFallback = () => (
  <div
    style={{
      position: 'relative',
      width: 230,
      height: 260,
      filter: 'drop-shadow(0 14px 0 rgba(0,0,0,0.16))',
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: 44,
        top: 30,
        width: 124,
        height: 150,
        borderRadius: '48% 52% 44% 46%',
        background: '#242424',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 66,
        top: 72,
        width: 18,
        height: 18,
        borderRadius: 999,
        background: '#fff',
        boxShadow: '44px 0 0 #fff',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 95,
        top: 96,
        width: 28,
        height: 26,
        background: '#ffc21a',
        clipPath: 'polygon(0 50%, 100% 0, 76% 100%)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 82,
        top: 166,
        width: 78,
        height: 26,
        background: '#ef2b45',
        transform: 'rotate(8deg)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 146,
        top: 114,
        width: 92,
        height: 12,
        borderRadius: 999,
        background: '#242424',
        transform: 'rotate(-48deg)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        right: 6,
        top: 66,
        width: 78,
        height: 8,
        borderRadius: 999,
        background: '#ef2b45',
        transform: 'rotate(-42deg)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 8,
        bottom: 4,
        width: 190,
        height: 56,
        borderRadius: '50%',
        background: '#3a3a3a',
      }}
    />
  </div>
);

const MythCover: React.FC<
  Pick<
    VocabularyTikTokProps,
    | 'watermarkUrl'
    | 'coverMascotUrl'
    | 'coverMythMain'
    | 'coverMythMeaning'
    | 'coverMythTwist'
    | 'coverTextColor'
    | 'coverOverlayColor'
  >
> = (props) => {
  const accent = props.coverTextColor || '#4f7cff';
  const ink = props.coverOverlayColor || '#111111';
  const mythFont = '"Arial Black", Impact, "Manrope", ui-sans-serif, system-ui, sans-serif';
  const main = props.coverMythMain?.trim() || 'FISCH';
  const meaning = props.coverMythMeaning?.trim() || 'LÀ CÁ';
  const twist = props.coverMythTwist?.trim() || 'NHƯNG CŨNG CÒN CÓ THỂ LÀ...';

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        backgroundColor: '#fffef9',
        backgroundImage:
          'linear-gradient(#e5e5e2 3px, transparent 3px), linear-gradient(90deg, #e5e5e2 3px, transparent 3px)',
        backgroundSize: '82px 82px',
        fontFamily: mythFont,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 62,
          zIndex: 3,
          display: 'grid',
          alignItems: 'center',
          justifyItems: 'center',
          minWidth: 320,
          minHeight: 88,
          transform: 'translateX(-50%)',
        }}
      >
        {props.watermarkUrl ? <Img src={props.watermarkUrl} style={{width: 320}} /> : null}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 250,
          left: 52,
          right: 52,
          zIndex: 2,
          color: ink,
          fontSize: main.length > 10 ? 176 : 226,
          fontWeight: 950,
          fontStyle: 'italic',
          letterSpacing: -4,
          lineHeight: 0.82,
          textAlign: 'center',
          textTransform: 'uppercase',
          WebkitTextStroke: `7px ${ink}`,
          paintOrder: 'stroke fill',
        }}
      >
        {main}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 552,
          left: 210,
          right: 150,
          zIndex: 1,
          height: 176,
          background: accent,
          transform: 'skewX(-9deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 581,
          left: 180,
          right: 140,
          zIndex: 2,
          color: '#fffef9',
          fontSize: meaning.length > 18 ? 78 : 96,
          fontWeight: 950,
          fontStyle: 'italic',
          lineHeight: 1,
          textAlign: 'center',
          textTransform: 'uppercase',
          WebkitTextStroke: `5px ${ink}`,
          paintOrder: 'stroke fill',
        }}
      >
        {meaning}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 800,
          left: 66,
          right: 66,
          zIndex: 2,
          display: 'grid',
          placeItems: 'center',
          minHeight: 84,
          background: 'transparent',
          color: accent,
          fontSize: twist.length > 38 ? 34 : 44,
          fontWeight: 950,
          lineHeight: 0.96,
          textAlign: 'center',
          textTransform: 'uppercase',
          padding: '0 54px',
        }}
      >
        {twist}
      </div>

      <div
        style={{
          position: 'absolute',
          left: -130,
          right: -130,
          bottom: -160,
          zIndex: 1,
          height: 440,
          borderRadius: '54% 46% 0 0',
          background: accent,
          borderTop: `38px solid ${ink}`,
          transform: 'rotate(-4deg)',
        }}
      />
      <div style={{position: 'absolute', right: 72, bottom: 44, zIndex: 3}}>
        {props.coverMascotUrl ? (
          <Img
            src={props.coverMascotUrl}
            style={{
              width: 420,
              height: 460,
              objectFit: 'contain',
              filter: 'drop-shadow(0 18px 0 rgba(0,0,0,0.16))',
            }}
          />
        ) : (
          <MythMascotFallback />
        )}
      </div>
    </AbsoluteFill>
  );
};

export const VocabularyCover: React.FC<
  Pick<
    VocabularyTikTokProps,
    | 'title'
    | 'watermarkUrl'
    | 'backgroundUrl'
    | 'coverTemplate'
    | 'coverImageUrl'
    | 'coverMascotUrl'
    | 'coverLayout'
    | 'coverLines'
    | 'coverMythMain'
    | 'coverMythMeaning'
    | 'coverMythTwist'
    | 'coverTextColor'
    | 'coverOverlayColor'
    | 'coverOverlayOpacity'
    | 'coverSubtitle'
  >
> = (props) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, coverFrames], [0.985, 1.01], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const coverLayout = props.coverLayout || 'balanced';
  if (props.coverTemplate === 'myth') {
    return (
      <MythCover
        coverMascotUrl={props.coverMascotUrl}
        coverMythMain={props.coverMythMain}
        coverMythMeaning={props.coverMythMeaning}
        coverMythTwist={props.coverMythTwist}
        coverOverlayColor={props.coverOverlayColor}
        coverTextColor={props.coverTextColor}
        watermarkUrl={props.watermarkUrl}
      />
    );
  }

  const explicitLines =
    props.coverLines
      ?.map((line) => ({text: line.text.trim(), color: line.color}))
      .filter((line) => line.text)
      .slice(0, 3) ?? [];
  const lines =
    coverLayout === 'stacked'
      ? explicitLines.length > 0
        ? explicitLines.map((line) => line.text)
        : splitStackedCoverTitle(props.title)
      : splitCoverTitle(props.title);
  const textLength = props.title.replace(/\s/g, '').length;
  const fontSize = coverLayout === 'stacked' ? (textLength > 48 ? 68 : 78) : textLength > 48 ? 54 : textLength > 34 ? 64 : 84;
  const textColor = props.coverTextColor || '#ffd21f';
  const overlayColor = hexToRgb(props.coverOverlayColor || '#080c12');
  const overlayOpacity = props.coverOverlayOpacity ?? 0.48;

  return (
    <AbsoluteFill
      style={{
        padding: '112px 76px',
        color: textColor,
        textAlign: 'center',
        justifyContent: 'center',
        transform: `scale(${scale})`,
        fontFamily,
      }}
    >
      <Background src={props.coverImageUrl || props.backgroundUrl} />
      <AbsoluteFill style={{background: `rgba(${overlayColor.r}, ${overlayColor.g}, ${overlayColor.b}, ${overlayOpacity})`, zIndex: 1}} />
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'grid',
          gap: coverLayout === 'stacked' ? 20 : 12,
          marginTop: coverLayout === 'stacked' ? 90 : -120,
          fontSize,
          fontWeight: 900,
          lineHeight: coverLayout === 'stacked' ? 0.98 : 1.04,
          letterSpacing: 0,
          textTransform: 'uppercase',
          textShadow: 'none',
        }}
      >
        {lines.map((line, index) => (
          <span
            key={`${line}-${index}`}
            style={{
              color: coverLayout === 'stacked' ? explicitLines[index]?.color || (index === 1 ? textColor : '#fffdf8') : textColor,
              whiteSpace: 'nowrap',
            }}
          >
            {line}
          </span>
        ))}
      </div>
      {props.coverSubtitle ? (
        <div
          style={{
            position: 'absolute',
            zIndex: 2,
            left: 76,
            right: 76,
            bottom: 430,
            color: 'rgba(255,255,255,0.9)',
            fontSize: 44,
            fontWeight: 500,
            lineHeight: 1.1,
            textShadow: '0 8px 18px rgba(0,0,0,0.34)',
          }}
        >
          {props.coverSubtitle}
        </div>
      ) : null}
      {props.watermarkUrl ? (
        <div
          style={{
            position: 'absolute',
            top: 112,
            left: '50%',
            display: 'grid',
            placeItems: 'center',
            minWidth: 330,
            minHeight: 92,
            padding: '16px 28px',
            borderRadius: 999,
            background: 'rgba(255, 255, 255, 0.82)',
            border: '1px solid rgba(255, 255, 255, 0.62)',
            boxShadow: '0 18px 38px rgba(0,0,0,0.2)',
            transform: 'translateX(-50%)',
            zIndex: 2,
          }}
        >
          <Img src={props.watermarkUrl} style={{width: 250}} />
        </div>
      ) : null}
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
