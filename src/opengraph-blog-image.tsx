import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo} from 'remotion';

export type OpenGraphBlogImageProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  leftTerm?: string;
  rightTerm?: string;
  footer?: string;
  backgroundUrl?: string;
  watermarkUrl?: string;
};

const fontFamily = '"Manrope", ui-sans-serif, system-ui, sans-serif';
const isImageSource = (src: string) => /\.(avif|jpe?g|png|webp)(\?|$)/i.test(src);
const getTitleSize = (title: string) => {
  if (title.length > 92) {
    return 48;
  }
  if (title.length > 72) {
    return 56;
  }
  if (title.length > 54) {
    return 66;
  }

  return 78;
};

const Background: React.FC<{src?: string}> = ({src}) => {
  if (!src) {
    return (
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0.22), rgba(255,255,255,0.22)), radial-gradient(circle at 82% 18%, #fff7d8, transparent 34%), linear-gradient(135deg, #ede7dc, #fbf7ef 52%, #dce4e8)',
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
      <AbsoluteFill style={{background: 'rgba(255, 255, 255, 0.18)'}} />
    </AbsoluteFill>
  );
};

const TermCard: React.FC<{term: string; tone: 'blue' | 'dark'}> = ({term, tone}) => (
  <div
    style={{
      width: term.length > 16 ? 350 : 260,
      height: 116,
      borderRadius: 26,
      background: tone === 'blue' ? 'rgba(82, 117, 246, 0.14)' : 'rgba(17, 24, 39, 0.08)',
      border: `2px solid ${tone === 'blue' ? 'rgba(82, 117, 246, 0.35)' : 'rgba(17, 24, 39, 0.18)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: tone === 'blue' ? '#5275f6' : '#111827',
      fontSize: term.length > 16 ? 34 : 42,
      fontWeight: 800,
      letterSpacing: 0,
      boxShadow: '0 16px 50px rgba(25, 35, 70, 0.08)',
    }}
  >
    {term}
  </div>
);

export const OpenGraphBlogImage: React.FC<OpenGraphBlogImageProps> = ({
  eyebrow = 'German learning note',
  title,
  subtitle,
  leftTerm = 'ständig',
  rightTerm = 'beständig',
  footer = 'BlauBerry Deutsch',
  backgroundUrl,
  watermarkUrl,
}) => {
  const titleSize = getTitleSize(title);
  const showTermComparison = Boolean(leftTerm && rightTerm);

  return (
    <AbsoluteFill
      style={{
        color: '#101820',
        fontFamily,
        padding: '64px 76px',
        overflow: 'hidden',
      }}
    >
      <Background src={backgroundUrl} />
      {watermarkUrl ? (
        <Img
          src={watermarkUrl}
          style={{
            position: 'absolute',
            right: 72,
            bottom: 46,
            width: 190,
            opacity: 0.95,
          }}
        />
      ) : null}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            color: '#df2f2f',
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          <span>{eyebrow}</span>
          <span style={{color: '#111827', letterSpacing: 0}}>🇩🇪</span>
        </div>

        <div style={{display: 'grid', gap: title.length > 72 ? 24 : 34, maxWidth: 940}}>
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 800,
              lineHeight: title.length > 72 ? 1.06 : 1.02,
              letterSpacing: 0,
              textShadow: '0 4px 0 rgba(255,255,255,0.82)',
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                maxWidth: 780,
                color: '#26313d',
                fontSize: 31,
                fontWeight: 700,
                lineHeight: 1.22,
                textShadow: '0 2px 0 rgba(255,255,255,0.72)',
              }}
            >
              {subtitle}
            </div>
          ) : null}
          {showTermComparison ? (
            <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
              <TermCard term={leftTerm} tone="dark" />
              <div style={{fontSize: 44, fontWeight: 800, color: '#df2f2f'}}>vs</div>
              <TermCard term={rightTerm} tone="blue" />
            </div>
          ) : null}
        </div>

        <div
          style={{
            color: '#334155',
            fontSize: 25,
            fontWeight: 800,
            textShadow: '0 2px 0 rgba(255,255,255,0.76)',
          }}
        >
          {footer}
        </div>
      </div>
    </AbsoluteFill>
  );
};
