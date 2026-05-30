import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo} from 'remotion';

export type EngagementCardImageProps = {
  title: string;
  subtitle: string;
  primaryCta?: string;
  secondaryCta?: string;
  handle: string;
  backgroundUrl?: string;
  watermarkUrl?: string;
};

const fontFamily = '"Manrope", ui-sans-serif, system-ui, sans-serif';
const isImageSource = (src: string) => /\.(avif|jpe?g|png|webp)(\?|$)/i.test(src);

const Background: React.FC<{src?: string}> = ({src}) => {
  if (!src) {
    return (
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0.2), rgba(255,255,255,0.2)), radial-gradient(circle at 50% 28%, #fff7d2, transparent 36%), linear-gradient(135deg, #ede7dc, #fbf7ef 52%, #dce4e8)',
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
      <AbsoluteFill style={{background: 'rgba(255, 255, 255, 0.16)'}} />
    </AbsoluteFill>
  );
};

const Pill: React.FC<{children: React.ReactNode; tone?: 'red' | 'dark'}> = ({children, tone = 'dark'}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 82,
      borderRadius: 999,
      padding: '0 42px',
      background: tone === 'red' ? '#df2f2f' : '#101820',
      color: '#ffffff',
      fontSize: 38,
      fontWeight: 900,
      letterSpacing: 0,
      boxShadow: '0 20px 42px rgba(16, 24, 32, 0.18)',
      textShadow: '0 2px 0 rgba(0,0,0,0.1)',
    }}
  >
    {children}
  </div>
);

export const EngagementCardImage: React.FC<EngagementCardImageProps> = ({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  handle,
  backgroundUrl,
  watermarkUrl,
}) => {
  const ctas = [
    primaryCta ? {label: primaryCta, tone: 'red' as const} : null,
    secondaryCta ? {label: secondaryCta, tone: 'dark' as const} : null,
  ].filter(Boolean) as Array<{label: string; tone: 'red' | 'dark'}>;

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: 92,
        color: '#101820',
        fontFamily,
        textAlign: 'center',
      }}
    >
      <Background src={backgroundUrl} />
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          display: 'grid',
          justifyItems: 'center',
          gap: 30,
          marginTop: -20,
        }}
      >
        {watermarkUrl ? <Img src={watermarkUrl} style={{width: 270, marginBottom: 26}} /> : null}
        <div
          style={{
            maxWidth: 820,
            fontSize: title.length > 32 ? 76 : 90,
            fontWeight: 900,
            lineHeight: 1.02,
            letterSpacing: 0,
            textShadow: '0 4px 0 rgba(255,255,255,0.82)',
          }}
        >
          {title}
        </div>
        <div
          style={{
            maxWidth: 760,
            color: '#26313d',
            fontSize: subtitle.length > 72 ? 42 : 50,
            fontWeight: 800,
            lineHeight: 1.16,
            textShadow: '0 3px 0 rgba(255,255,255,0.7)',
          }}
        >
          {subtitle}
        </div>
        {ctas.length > 0 ? (
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 18}}>
            {ctas.map((cta) => (
              <Pill key={cta.label} tone={cta.tone}>
                {cta.label}
              </Pill>
            ))}
          </div>
        ) : null}
        <div
          style={{
            marginTop: 28,
            color: '#5275f6',
            fontSize: 44,
            fontWeight: 900,
            textShadow: '0 3px 0 rgba(255,255,255,0.7)',
          }}
        >
          {handle}
        </div>
      </div>
    </AbsoluteFill>
  );
};
